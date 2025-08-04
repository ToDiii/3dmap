declare module 'three/examples/jsm/utils/BufferGeometryUtils.js' {
  import { BufferGeometry } from 'three';
  export function mergeBufferGeometries(
    geometries: BufferGeometry[],
    useGroups?: boolean
  ): BufferGeometry;
}
