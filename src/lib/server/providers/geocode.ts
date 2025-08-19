import { GEOCODE_API_KEY, GEOCODE_PROVIDER } from '$lib/config/env';

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

export async function geocodeAddress(
  q: string,
  provider: string = GEOCODE_PROVIDER
): Promise<GeocodeResult[]> {
  switch (provider) {
    case 'nominatim': {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('q', q);
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': '3dmap-app' }
      });
      if (!res.ok) throw { status: res.status };
      const data: any[] = await res.json();
      return data.map((d) => ({
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
        label: d.display_name as string
      }));
    }
    case 'opencage': {
      const url = new URL('https://api.opencagedata.com/geocode/v1/json');
      url.searchParams.set('q', q);
      if (GEOCODE_API_KEY) url.searchParams.set('key', GEOCODE_API_KEY);
      url.searchParams.set('limit', '5');
      url.searchParams.set('no_annotations', '1');
      const res = await fetch(url.toString());
      if (!res.ok) throw { status: res.status };
      const data: any = await res.json();
      return (data.results || []).map((r: any) => ({
        lat: r.geometry.lat,
        lon: r.geometry.lng,
        label: r.formatted as string
      }));
    }
    case 'mapbox': {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
      );
      if (GEOCODE_API_KEY) url.searchParams.set('access_token', GEOCODE_API_KEY);
      url.searchParams.set('limit', '5');
      const res = await fetch(url.toString());
      if (!res.ok) throw { status: res.status };
      const data: any = await res.json();
      return (data.features || []).map((f: any) => ({
        lat: f.center[1],
        lon: f.center[0],
        label: f.place_name as string
      }));
    }
    default:
      return [];
  }
}
