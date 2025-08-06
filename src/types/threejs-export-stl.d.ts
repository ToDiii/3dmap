declare module 'threejs-export-stl' {
  export const mimeType: string;
  export function fromMesh(
    mesh: import('three').Mesh,
    binary?: boolean
  ): ArrayBuffer | string;
}
