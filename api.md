# API Specification

## POST `/api/model`

Generates simplified 3D geometry from OpenStreetMap data.

### Request Body
```
{
  "scale": number,
  "baseHeight": number,             // optional (default 0)
  "buildingMultiplier": number,     // optional (default 1)
  "elements": ["buildings", "roads", "water"],
  "bbox": [south, west, north, east] // optional bounding box
}
```

### Response
```
{
  "features": [
    {
      "id": number,
      "type": "building" | "road" | "water",
      "geometry": [ [x, y, z], ... ],
      "height": number
    }
  ]
}
```

HTTP status `400` is returned for invalid input.
`500` is returned if the Overpass API request fails.
