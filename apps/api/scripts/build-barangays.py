# /// script
# requires-python = ">=3.11"
# dependencies = ["geopandas>=1.0", "pyogrio>=0.10", "rasterio>=1.4"]
# ///
"""Build the Miagao barangay seed migration (drizzle/*_seed_barangays.sql).

Run from apps/api: `uv run scripts/build-barangays.py`. Downloads (~250 MB) are
cached in scripts/.cache. Rerun only when a source or threshold changes, and
review the diff. Once the migration has run anywhere, ship corrections as a
new migration instead.

Sources:
- Boundaries: faeldon/philippines-json-maps (PSA/NAMRIA 2023, MIT)
- Hazards: UP Project NOAH hazard maps, mirrored by bettergovph on Hugging Face
  (ODbL; attribute Project NOAH)
- Elevation: Copernicus GLO-30 DEM (ESA, free and open)

Manual corrections go in barangay-overrides.json and are applied last.
"""

import json
import sys
import urllib.request
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import shapely
from rasterio.mask import mask

HERE = Path(__file__).parent
CACHE = HERE / ".cache"
OVERRIDES = HERE / "barangay-overrides.json"
MIGRATION = "drizzle/*_seed_barangays.sql"

MAPS = "https://raw.githubusercontent.com/faeldon/philippines-json-maps/bf7060598ff5a5d160917f1dcb9622dbaef85ff7/latest/geojson"
NOAH = "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/3820095a7e40b6bc852390d43a8c6d368d6fe081"
SOURCES = {
    "barangays.json": f"{MAPS}/municities/medres/bgysubmuns-municity-603030000.0.01.json",
    "iloilo.json": f"{MAPS}/provdists/medres/municities-provdist-603000000.0.01.json",
    "antique.json": f"{MAPS}/provdists/medres/municities-provdist-600600000.0.01.json",
    "flood.zip": f"{NOAH}/Flood/100yr/Iloilo.zip",
    "landslide.zip": f"{NOAH}/Landslide/LandslideHazards/Iloilo.zip",
    "storm_surge.zip": f"{NOAH}/Storm%20Surge/StormSurgeAdvisory4/Iloilo.zip",
    "dem.tif": "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N10_00_E122_00_DEM/Copernicus_DSM_COG_10_N10_00_E122_00_DEM.tif",
}

MIAGAO_PSGC = 603030000
METRIC_CRS = "EPSG:32651"  # UTM 51N, for areas and distances in meters

# NOAH classes are 1 (low), 2 (medium), 3 (high). A barangay is tagged when
# medium-or-high hazard covers at least its minimum share of its area. Storm
# surge zones are thin coastal strips, so any real overlap counts.
HAZARD_LAYERS = {
    "flood": ("flood.zip", "Var", 0.1),
    "landslide": ("landslide.zip", "LH", 0.1),
    "storm_surge": ("storm_surge.zip", "HAZ", 0.01),
}
HAZARD_MIN_CLASS = 2

UPLAND_MIN_MEDIAN_ELEVATION_M = 100

# Coastal: at least this length of the barangay's edge lies on the shore.
COAST_TOLERANCE_M = 50
COAST_MIN_LENGTH_M = 100


def fetch(name: str) -> Path:
    path = CACHE / name
    if not path.exists():
        print(f"downloading {name}", file=sys.stderr)
        CACHE.mkdir(exist_ok=True)
        urllib.request.urlretrieve(SOURCES[name], path.with_suffix(".part"))
        path.with_suffix(".part").rename(path)
    return path


def hazard_shares(bgy: gpd.GeoDataFrame, file: str, column: str):
    # Each layer is a few province-wide multipolygons; split them into parts
    # and keep the ones near Miagao before doing any geometry work.
    xmin, ymin, xmax, ymax = bgy.to_crs(4326).total_bounds
    layer = gpd.read_file(f"zip://{fetch(file)}")
    parts = layer[layer[column] >= HAZARD_MIN_CLASS].explode(ignore_index=True)
    parts = parts.cx[xmin:xmax, ymin:ymax].to_crs(METRIC_CRS)
    parts = parts.set_geometry(parts.geometry.make_valid())
    hit = gpd.overlay(bgy[["adm4_psgc", "geometry"]], parts[["geometry"]], how="intersection")
    hit = hit.dissolve("adm4_psgc").area
    return bgy["adm4_psgc"].map(hit).fillna(0) / bgy.geometry.area


def coastal_lengths(bgy: gpd.GeoDataFrame):
    towns = gpd.GeoDataFrame(
        gpd.pd.concat(
            [gpd.read_file(fetch("iloilo.json")), gpd.read_file(fetch("antique.json"))]
        )
    ).to_crs(METRIC_CRS)
    miagao = towns[towns["adm3_psgc"] == MIAGAO_PSGC].geometry.union_all()
    neighbors = towns[towns["adm3_psgc"] != MIAGAO_PSGC].geometry.union_all()
    shore = miagao.boundary.difference(neighbors.buffer(COAST_TOLERANCE_M))
    return bgy.geometry.boundary.intersection(shore.buffer(COAST_TOLERANCE_M)).length


def median_elevations(bgy: gpd.GeoDataFrame):
    with rasterio.open(fetch("dem.tif")) as dem:
        shapes = bgy.to_crs(dem.crs).geometry
        result = []
        for shape in shapes:
            data, _ = mask(dem, [shape], crop=True, filled=False)
            result.append(float(np.ma.median(data)))
    return result


def ewkt(geometry) -> str:
    return f"SRID=4326;{shapely.to_wkt(geometry, rounding_precision=6)}"


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main():
    bgy = gpd.read_file(fetch("barangays.json")).to_crs(METRIC_CRS)
    bgy = bgy.sort_values("adm4_en").reset_index(drop=True)

    shares = {h: hazard_shares(bgy, file, column) for h, (file, column, _) in HAZARD_LAYERS.items()}
    shore = coastal_lengths(bgy)
    elevation = median_elevations(bgy)
    centroids = bgy.geometry.representative_point().to_crs(4326)
    boundaries = bgy.geometry.to_crs(4326)
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}

    rows = []
    for i, row in bgy.iterrows():
        name = row["adm4_en"]
        flags = {
            "isCoastal": bool(shore[i] >= COAST_MIN_LENGTH_M),
            "isUpland": elevation[i] >= UPLAND_MIN_MEDIAN_ELEVATION_M,
            "hazards": [h for h, (_, _, min_share) in HAZARD_LAYERS.items() if shares[h][i] >= min_share],
        }
        overridden = overrides.pop(name, {})
        flags.update(overridden)
        boundary = boundaries[i]
        if boundary.geom_type == "Polygon":
            boundary = shapely.MultiPolygon([boundary])
        # The inputs behind the flags, for review.
        metrics = ", ".join(
            [f"PSGC 0{row['adm4_psgc']}", f"elevation {elevation[i]:.0f} m", f"shore {shore[i]:.0f} m"]
            + [f"{h} {shares[h][i]:.1%}" for h in HAZARD_LAYERS]
            + (["overridden"] if overridden else [])
        )
        hazards = ", ".join(sql_text(h) for h in flags["hazards"])
        values = ", ".join([
            sql_text(name),
            sql_text(ewkt(centroids[i])),
            sql_text(ewkt(boundary)),
            str(flags["isCoastal"]).lower(),
            str(flags["isUpland"]).lower(),
            f"ARRAY[{hazards}]::hazard_type[]",
        ])
        rows.append(f"\t-- {name}: {metrics}\n\t({values})")

    if overrides:
        sys.exit(f"overrides name unknown barangays: {', '.join(overrides)}")

    [out] = HERE.parent.glob(MIGRATION)
    out.write_text(
        "-- Generated by scripts/build-barangays.py; do not edit by hand.\n"
        'INSERT INTO "barangay" ("name", "centroid", "boundary", "is_coastal", "is_upland", "hazards") VALUES\n'
        + ",\n".join(rows)
        + ";\n"
    )
    print(f"wrote {len(rows)} barangays to {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
