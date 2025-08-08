import { describe, it, expect } from 'vitest';
import { mergeBufferGeometries } from '$lib/three/geometry';

describe('mergeBufferGeometries wrapper', () => {
  it('should be a function', () => {
    expect(typeof mergeBufferGeometries).toBe('function');
  });

  it('should throw when given an empty array', () => {
    expect(() => mergeBufferGeometries([], true)).toThrow();
  });
});
