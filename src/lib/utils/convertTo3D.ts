import * as THREE from 'three';

export type SimplePolygon = [number, number, number][];
export interface Feature {
        id?: number | string;
        geometry: SimplePolygon | SimplePolygon[];
        height: number;
        type: 'building' | 'road' | 'water' | 'green' | 'sand' | 'pier' | 'other';
        subtype?:
                | 'building_residential'
                | 'building_commercial'
                | 'building_industrial'
                | 'building_generic';
}

export interface MeshFeature {
	mesh: THREE.Mesh;
	type: Feature['type'];
	subtype?: Feature['subtype'];
	id?: number | string;
}

function toPolygons(geom: Feature['geometry']): SimplePolygon[] {
	if (Array.isArray(geom[0][0])) {
		return geom as SimplePolygon[];
	}
	return [geom as SimplePolygon];
}

export function convertTo3D(features: Feature[], baseHeight: number): MeshFeature[] {
	const meshes: MeshFeature[] = [];
	for (const f of features) {
		const polys = toPolygons(f.geometry);
		for (const poly of polys) {
			if (f.type === 'other') continue;
			const pts = poly.map(([x, _y, z]) => new THREE.Vector2(x, z));
			if (pts.length < 3) continue;
			if (!pts[0].equals(pts[pts.length - 1])) pts.push(pts[0]);
			const shape = new THREE.Shape(pts);
			const depth = Math.max(f.height - baseHeight, 0.1);
			const geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
			geom.rotateX(-Math.PI / 2);
			geom.translate(0, baseHeight, 0);
			const mesh = new THREE.Mesh(geom);
			mesh.userData = {
				id: f.id,
				featureType: f.type,
				subtype: f.subtype,
				height_final: f.height,
			};
			meshes.push({ mesh, type: f.type, subtype: f.subtype, id: f.id });
		}
	}
	return meshes;
}
