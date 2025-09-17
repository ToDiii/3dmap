# API Specification

## POST `/api/model`

Generates simplified 3D geometry from OpenStreetMap data.

### Request Body

```
{
  "scale": number,
  "baseHeight": number,             // optional (default 0)
  "buildingMultiplier": number,     // optional (default 1)
  "minArea": number,                // optional (default 0)
  "minBuildingHeightMM": number,    // optional (default 0)
  "waterHeightMM": number,          // optional (default 100)
  "greeneryHeightMM": number,       // optional (default 100)
  "beachHeightMM": number,          // optional (default 100)
  "pierHeightMM": number,           // optional (default 100)
  "minWaterAreaM2": number,         // optional (default 0)
  "footpathRoadsEnabled": boolean,  // optional (default true)
  "oceanEnabled": boolean,          // optional (default true)
  "beachEnabled": boolean,          // optional (default false)
  "piersEnabled": boolean,          // optional (default false)
  "elements": ["buildings", "roads", "water", "green"],
  "bbox": [south, west, north, east] // optional bounding box
}
```

### Response

```
{
  "features": [
    {
      "id": number,
      "type": "building" | "road" | "water" | "green" | "sand" | "pier",
      "geometry": [ [x, y, z], ... ],
      "height": number
    }
  ]
}
```

HTTP status `400` is returned for invalid input.
`500` is returned if the Overpass API request fails.
