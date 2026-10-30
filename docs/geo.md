# Geo

Shared location lookup for intake and broadcast targeting.

- API: `apps/api/src/geo/`
- Schemas: `packages/shared/src/geo/`
- Barangay data: `apps/api/scripts/build-barangays.py`, seeded by migration

## Barangays

`GET /barangays` returns all 119 with centroid, boundary and targeting flags, for any signed-in user.

`GeoModule` is global; inject `BarangayService`:

- `findByName(name)`: matches names as residents write them, ignoring case, accents, punctuation, "Brgy." and "(Pob.)"
- `findContaining(point)`: the barangay covering a point, or null outside Miagao

## Geocoding

`GeocodingService.geocode(text)` resolves free text to a point and its barangay through Nominatim, searching only within Miagao. It returns null when nothing matches or Nominatim fails.

The public instance allows 1 request per second, so requests queue one at a time. Results, including misses, are cached in memory for the life of the process; failures are not. Point `NOMINATIM_URL` at another instance to lift the limit.

Intake resolves a location in the order the TRD sets: `findByName`, then a shared location through `findContaining`, then `geocode`.
