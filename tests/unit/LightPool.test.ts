import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';
import {
  LIGHT_POOL_CAPACITY,
  LIGHT_POOL_DEFAULT_BUDGET,
  LIGHT_POOL_MAX_INTENSITY,
  LIGHT_POOL_RANGE,
  LightPool,
  type LightPoolCandidate,
} from '../../src/lighting/LightPool';

interface CandidateOverrides {
  readonly position?: Vector3;
  readonly enabled?: boolean;
  readonly visible?: boolean;
  readonly important?: boolean;
  readonly flickering?: boolean;
  readonly exitRelated?: boolean;
  readonly intensity?: number;
}

function candidate(
  id: string,
  distance: number,
  overrides: CandidateOverrides = {},
): LightPoolCandidate {
  return {
    id,
    position: overrides.position ?? new Vector3(distance, 2.35, 0),
    enabled: overrides.enabled ?? true,
    visible: overrides.visible ?? false,
    important: overrides.important ?? false,
    flickering: overrides.flickering ?? false,
    exitRelated: overrides.exitRelated ?? false,
    intensity: overrides.intensity ?? 0.8,
  };
}

function assignedIds(pool: LightPool): readonly string[] {
  return pool.assignments.map((assignment) => assignment.candidateId);
}

describe('LightPool', () => {
  it('preallocates exactly eight disabled, shadowless fluorescent proxies', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const baselineLights = scene.lights.length;
    const pool = new LightPool(scene);

    try {
      expect(pool.activeBudget).toBe(LIGHT_POOL_DEFAULT_BUDGET);
      expect(pool.lights).toHaveLength(LIGHT_POOL_CAPACITY);
      expect(scene.lights).toHaveLength(baselineLights + LIGHT_POOL_CAPACITY);
      expect(new Set(pool.lights).size).toBe(LIGHT_POOL_CAPACITY);
      expect(pool.assignments).toEqual([]);
      expect(pool.metrics).toMatchObject({
        capacity: LIGHT_POOL_CAPACITY,
        pooledLightCount: LIGHT_POOL_CAPACITY,
        activeBudget: LIGHT_POOL_DEFAULT_BUDGET,
        activeLightCount: 0,
        reassignments: 0,
        disposed: false,
      });

      for (const light of pool.lights) {
        expect(light.isEnabled()).toBe(false);
        expect(light.intensity).toBe(0);
        expect(light.range).toBe(LIGHT_POOL_RANGE);
        expect(light.shadowEnabled).toBe(false);
        expect(light.diffuse.g).toBeGreaterThan(light.diffuse.r);
        expect(light.diffuse.r).toBeGreaterThan(light.diffuse.b);
        expect(light.specular.g).toBeGreaterThan(light.specular.b);
      }
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('caps active lights and applies exit, importance, flicker, visibility, then distance', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const pool = new LightPool(scene, { activeBudget: 4 });

    try {
      const candidates = [
        candidate('near-hidden', 0.1),
        candidate('visible', 40, { visible: true }),
        candidate('flickering', 60, { flickering: true }),
        candidate('important', 80, { important: true }),
        candidate('exit', 100, { exitRelated: true }),
        candidate('disabled-exit', 0, { enabled: false, exitRelated: true }),
      ];

      pool.update(candidates, Vector3.Zero());

      expect(assignedIds(pool)).toEqual(['exit', 'important', 'flickering', 'visible']);
      expect(pool.assignments.map((assignment) => assignment.priority)).toEqual([8, 4, 2, 1]);
      expect(pool.assignments).toHaveLength(4);
      expect(pool.lights.filter((light) => light.isEnabled())).toHaveLength(4);
      expect(
        pool.assignments.some((assignment) => assignment.candidateId === 'disabled-exit'),
      ).toBe(false);
      expect(pool.metrics).toMatchObject({
        inputCandidateCount: 6,
        eligibleCandidateCount: 5,
        activeLightCount: 4,
      });
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('uses distance and id as deterministic tie-breakers independently of input order', () => {
    const firstEngine = new NullEngine();
    const firstScene = new Scene(firstEngine);
    const firstPool = new LightPool(firstScene, { activeBudget: 4 });
    const secondEngine = new NullEngine();
    const secondScene = new Scene(secondEngine);
    const secondPool = new LightPool(secondScene, { activeBudget: 4 });
    const sameRank = ['zeta', 'alpha', 'mu', 'beta'].map((id) =>
      candidate(id, 5, { visible: true }),
    );

    try {
      firstPool.update(sameRank, Vector3.Zero());
      secondPool.update([...sameRank].reverse(), Vector3.Zero());

      expect(assignedIds(firstPool)).toEqual(['alpha', 'beta', 'mu', 'zeta']);
      expect(assignedIds(secondPool)).toEqual(assignedIds(firstPool));

      const distanceCandidates = [candidate('far', 8), candidate('near', 2)];
      firstPool.update(distanceCandidates, Vector3.Zero());
      expect(assignedIds(firstPool).slice(0, 2)).toEqual(['near', 'far']);
    } finally {
      firstPool.dispose();
      secondPool.dispose();
      firstScene.dispose();
      secondScene.dispose();
      firstEngine.dispose();
      secondEngine.dispose();
    }
  });

  it('changes its live budget from four through eight and clears every excess slot', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const baselineLights = scene.lights.length;
    const pool = new LightPool(scene);
    const candidates = Array.from({ length: 8 }, (_, index) =>
      candidate(`fixture-${String(index)}`, index + 1, { visible: true }),
    );

    try {
      pool.update(candidates, Vector3.Zero());
      expect(pool.assignments).toHaveLength(6);

      pool.setActiveBudget(4);
      expect(pool.activeBudget).toBe(4);
      expect(pool.assignments).toHaveLength(4);
      expect(
        pool.lights.slice(4).every((light) => !light.isEnabled() && light.intensity === 0),
      ).toBe(true);

      pool.setActiveBudget(8);
      expect(pool.activeBudget).toBe(8);
      expect(pool.assignments).toHaveLength(8);
      expect(pool.lights.every((light) => light.isEnabled())).toBe(true);
      expect(scene.lights).toHaveLength(baselineLights + LIGHT_POOL_CAPACITY);
      expect(pool.metrics).toMatchObject({ activeBudget: 8, activeLightCount: 8 });
      expect(() => pool.setActiveBudget(3)).toThrow(RangeError);
      expect(() => pool.setActiveBudget(9)).toThrow(RangeError);
      expect(() => pool.setActiveBudget(4.5)).toThrow(RangeError);
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('reuses light identities and preserves stable assignments without needless thrashing', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const baselineLights = scene.lights.length;
    const pool = new LightPool(scene, { activeBudget: 4 });
    const initial = ['a', 'b', 'c', 'd'].map((id, index) =>
      candidate(id, index + 1, { visible: true }),
    );

    try {
      const lightIdentities = [...pool.lights];
      pool.update(initial, Vector3.Zero());
      const firstSlots = new Map(
        pool.assignments.map((assignment) => [assignment.candidateId, assignment.slotIndex]),
      );

      const movedAndReordered = [...initial].reverse().map((fixture, index) => ({
        ...fixture,
        position: new Vector3(index + 0.25, 2.35, 1),
        intensity: 0.4 + index * 0.1,
      }));
      pool.update(movedAndReordered, new Vector3(0.1, 0, 0));

      expect(pool.lights).toEqual(lightIdentities);
      expect(scene.lights).toHaveLength(baselineLights + LIGHT_POOL_CAPACITY);
      expect(pool.reassignments).toBe(0);
      for (const assignment of pool.assignments) {
        expect(assignment.slotIndex).toBe(firstSlots.get(assignment.candidateId));
      }

      const retainedCandidates = movedAndReordered.slice(0, 3);
      pool.update(
        [...retainedCandidates, candidate('replacement', 0.05, { visible: true })],
        Vector3.Zero(),
      );
      expect(pool.reassignments).toBe(1);
      expect(pool.metrics.lastUpdateReassignments).toBe(1);

      pool.update(
        pool.assignments.map((assignment) =>
          candidate(assignment.candidateId, assignment.distanceSquared ** 0.5, { visible: true }),
        ),
        Vector3.Zero(),
      );
      expect(pool.reassignments).toBe(1);
      expect(pool.metrics.lastUpdateReassignments).toBe(0);
      expect(scene.lights).toHaveLength(baselineLights + LIGHT_POOL_CAPACITY);
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('copies positions, clamps intensity, and keeps range, color, and shadows bounded', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const pool = new LightPool(scene, { activeBudget: 4 });
    const sourcePosition = new Vector3(4, 2.7, -3);

    try {
      pool.update(
        [
          candidate('overbright', 0, {
            position: sourcePosition,
            visible: true,
            intensity: LIGHT_POOL_MAX_INTENSITY * 4,
          }),
          candidate('negative', 1, { visible: true, intensity: -10 }),
          candidate('normal', 2, { visible: true, intensity: 0.72 }),
          candidate('infinite', 3, { visible: true, intensity: Number.POSITIVE_INFINITY }),
        ],
        Vector3.Zero(),
      );

      const overbright = pool.assignments.find(
        (assignment) => assignment.candidateId === 'overbright',
      );
      const negative = pool.assignments.find((assignment) => assignment.candidateId === 'negative');
      const normal = pool.assignments.find((assignment) => assignment.candidateId === 'normal');
      const infinite = pool.assignments.find((assignment) => assignment.candidateId === 'infinite');

      expect(overbright?.light.position.asArray()).toEqual(sourcePosition.asArray());
      expect(overbright?.light.position).not.toBe(sourcePosition);
      expect(overbright?.light.intensity).toBe(LIGHT_POOL_MAX_INTENSITY);
      expect(negative?.light.intensity).toBe(0);
      expect(normal?.light.intensity).toBeCloseTo(0.72);
      expect(infinite?.light.intensity).toBe(LIGHT_POOL_MAX_INTENSITY);

      sourcePosition.set(99, 99, 99);
      expect(overbright?.light.position.asArray()).toEqual([4, 2.7, -3]);
      for (const assignment of pool.assignments) {
        expect(assignment.light.range).toBe(LIGHT_POOL_RANGE);
        expect(assignment.light.shadowEnabled).toBe(false);
        expect(assignment.light.diffuse.asArray()).toEqual([0.88, 0.94, 0.58]);
        expect(assignment.light.specular.asArray()).toEqual([0.18, 0.2, 0.1]);
      }
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('excludes disabled and invalid candidates instead of consuming the budget', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const pool = new LightPool(scene, { activeBudget: 4 });

    try {
      pool.update(
        [
          candidate('enabled', 1),
          candidate('disabled', 0, { enabled: false, exitRelated: true }),
          candidate('', 2),
          candidate('invalid-position', 3, {
            position: new Vector3(Number.NaN, 2.35, 0),
          }),
        ],
        Vector3.Zero(),
      );

      expect(assignedIds(pool)).toEqual(['enabled']);
      expect(pool.lights.filter((light) => light.isEnabled())).toHaveLength(1);
      expect(pool.metrics).toMatchObject({
        inputCandidateCount: 4,
        eligibleCandidateCount: 1,
        activeLightCount: 1,
      });
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('disposes idempotently and restores the scene light baseline', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const ambient = new HemisphericLight('existing-ambient', Vector3.Up(), scene);
    const baselineLights = scene.lights.length;
    const pool = new LightPool(scene);

    try {
      pool.update([candidate('fixture', 1, { visible: true })], Vector3.Zero());
      expect(scene.lights).toHaveLength(baselineLights + LIGHT_POOL_CAPACITY);

      pool.dispose();
      pool.dispose();

      expect(scene.lights).toHaveLength(baselineLights);
      expect(scene.lights).toContain(ambient);
      expect(pool.lights).toEqual([]);
      expect(pool.assignments).toEqual([]);
      expect(pool.metrics).toMatchObject({
        pooledLightCount: 0,
        activeLightCount: 0,
        disposed: true,
      });
      expect(() => pool.update([], Vector3.Zero())).toThrow('LightPool has been disposed.');
      expect(() => pool.setActiveBudget(4)).toThrow('LightPool has been disposed.');
    } finally {
      pool.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});
