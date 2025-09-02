// Einheitlicher Zugriff auf mergeBufferGeometries – stabil in Dev, SSR, Tests.
// Versucht zuerst benannten Export, fällt sonst auf Namespace-Import zurück.

let _mergeBufferGeometries: ((geoms: any[], useGroups?: boolean) => any) | null = null;

try {
	const mod = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
	if (mod && typeof (mod as any).mergeBufferGeometries === 'function') {
		_mergeBufferGeometries = (mod as any).mergeBufferGeometries;
	}
} catch {
	/* ignore import errors */
}

if (!_mergeBufferGeometries) {
	try {
		const ns = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
		const fn =
			(ns && (ns as any).mergeBufferGeometries) ||
			(ns && (ns as any).default && (ns as any).default.mergeBufferGeometries);
		if (typeof fn === 'function') _mergeBufferGeometries = fn;
	} catch {
		/* ignore import errors */
	}
}

export function mergeBufferGeometries(geoms: any[], useGroups = false) {
	if (!_mergeBufferGeometries) {
		throw new Error(
			'[three] mergeBufferGeometries nicht verfügbar. ' +
				"Stelle sicher, dass 'three' installiert ist und den benannten Export liefert. " +
				'Alternativ: three updaten oder Utils-Datei vendoren.'
		);
	}
	return _mergeBufferGeometries(geoms, useGroups);
}
