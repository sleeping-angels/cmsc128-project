import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncidentsMap } from './incidents-map';

/* Fake MapLibre (jsdom has no WebGL); records the coordinates of each pin drawn. */
const { setLngLat } = vi.hoisted(() => ({ setLngLat: vi.fn() }));
vi.mock('maplibre-gl', () => {
  class Map {
    remove() {}
  }
  class Marker {
    setLngLat(lngLat: [number, number]) {
      setLngLat(lngLat);
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  }
  return { Map, Marker, setWorkerUrl: () => {} };
});

const DAY = 24 * 60 * 60 * 1000;
let nextId = 0;

/* One report as the API sends it; by default open, recent and located. */
function item(overrides: {
  lng?: number;
  located?: boolean;
  status?: string;
  severity?: string | null;
  daysAgo?: number;
}) {
  const id = `0b9a3f4e-8c1d-4e2a-9f6b-${String(nextId++).padStart(12, '0')}`;
  const at = new Date(
    Date.now() - (overrides.daysAgo ?? 0) * DAY,
  ).toISOString();
  return {
    id,
    status: overrides.status ?? 'pending',
    isProxy: false,
    incidentType: null,
    severity: overrides.severity ?? null,
    barangay: null,
    locationText: null,
    location:
      overrides.located === false
        ? null
        : { lng: overrides.lng ?? 122.2, lat: 10.6 },
    incidentAt: null,
    sourceChannel: 'messenger',
    parsedAutomatically: false,
    parseConfidence: null,
    resident: { id, name: 'Andrian' },
    victimCount: 0,
    firstMessage: null,
    createdAt: at,
    updatedAt: at,
  };
}

/* Fakes the API's response. */
function respondWith(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

/* Renders the page; no retries, so errors show at once. */
function renderMap() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <IncidentsMap />
    </QueryClientProvider>,
  );
}

/* Waits for the expected number of pins, then returns their longitudes. */
async function pinsAfter(expected: number) {
  await waitFor(() => expect(setLngLat).toHaveBeenCalledTimes(expected));
  return setLngLat.mock.calls.map(([lngLat]) => lngLat[0]);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLngLat.mockClear();
});

describe('IncidentsMap', () => {
  /* Only the report with a location gets a pin. */
  it('pins each report that has a location', async () => {
    respondWith(200, [item({ lng: 122.1 }), item({ located: false })]);
    renderMap();

    expect(await pinsAfter(1)).toEqual([122.1]);
  });

  /* Defaults (Figma): open reports from the last 7 days. */
  it('starts with open reports from the last 7 days', async () => {
    respondWith(200, [
      item({ lng: 122.1, status: 'dispatched' }),
      item({ lng: 122.2, status: 'resolved' }),
      item({ lng: 122.3, daysAgo: 8 }),
    ]);
    renderMap();

    expect(await pinsAfter(1)).toEqual([122.1]);
  });

  /* Picking a severity redraws only the reports with it. */
  it('filters by severity', async () => {
    respondWith(200, [
      item({ lng: 122.1, severity: 'high' }),
      item({ lng: 122.2, severity: 'low' }),
    ]);
    renderMap();
    await pinsAfter(2);
    setLngLat.mockClear();

    fireEvent.change(screen.getByLabelText('Severity'), {
      target: { value: 'low' },
    });
    expect(await pinsAfter(1)).toEqual([122.2]);
  });

  /* Heatmap (#67) and barangay names aren't built yet. */
  it('disables the checkboxes that are not built yet', () => {
    respondWith(200, []);
    renderMap();

    for (const name of ['Heatmap', 'Barangay names']) {
      expect(
        screen.getByRole('checkbox', { name }).getAttribute('aria-disabled'),
      ).toBe('true');
    }
  });

  /* A failed load shows the error and no pins. */
  it('offers a retry when the reports fail to load', async () => {
    respondWith(500);
    renderMap();

    expect((await screen.findByRole('alert')).textContent).toContain(
      "Couldn't load reports",
    );
    expect(setLngLat).not.toHaveBeenCalled();
  });
});
