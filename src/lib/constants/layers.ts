import type { ExpressionSpecification } from 'maplibre-gl';

export interface LayerConfig {
  ids: string[];
  detailFilter?: ExpressionSpecification;
}

export const LAYERS: Record<string, LayerConfig> = {
  building: {
    ids: ['building'],
    detailFilter: ['>=', ['get', 'area'], 50]
  },
  water: {
    ids: ['water']
  },
  green: {
    ids: ['landuse', 'natural']
  },
  road: {
    ids: ['road']
  }
};
