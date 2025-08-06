import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import { pathStore } from '$lib/stores/pathStore';
import GpxUpload from './GpxUpload.svelte';

vi.mock('maplibre-gl', () => ({}));

describe('GpxUpload', () => {
  it('updates pathStore after upload', async () => {
    const { container } = render(GpxUpload);
    const gpx = `<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="3" lon="4"/></trkseg></trk></gpx>`;
    const file = new File([gpx], 'test.gpx', { type: 'application/gpx+xml' });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(get(pathStore)).not.toBeNull();
    });
    expect(container).toHaveTextContent('test.gpx');
  });
});

