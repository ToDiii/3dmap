export interface M2MProject {
  generatorOptions: {
    mapWidthMM: number;
    baseLayerMM: number;
    elevationEnabled: boolean;
    elevationExaggeration: number;

    roadEnabled: boolean;
    footpathRoadsEnabled: boolean;
    customRoadWidths: Record<string, number>;

    waterEnabled: boolean;
    waterHeightMM: number;
    minWaterAreaM2: number;
    customWaterwayWidths: Record<string, number>;
    oceanEnabled: boolean;
    beachEnabled: boolean;
    beachHeightMM: number;
    piersEnabled: boolean;
    pierHeightMM: number;

    greeneryEnabled: boolean;
    greeneryHeightMM: number;

    buildingsEnabled: boolean;
    buildingScaleFactor: number;
    minBuildingHeightMM: number;
    minBuildingAreaM2: number;

    gpxPathEnabled: boolean;
    gpxPathHeightMM: number;
    gpxPathWidthMeters: number;
    gpxPathColor: string;
    gpxPathGeoJSON: GeoJSON.LineString | null;

    roadColor: string;
    waterColor: string;
    greeneryColor: string;
    buildingColor: string;
    sandColor: string;
    pierColor: string;
    baseColor: string;

    frameEnabled: boolean;
    frameHeightMM: number;
    frameThicknessMM: number;
    cropMapToBounds: boolean;
  };
  areaPolygon?: GeoJSON.Polygon;
}
