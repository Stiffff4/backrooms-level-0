import { describe, expect, it } from 'vitest';
import type {
  ExitTransitionFrame,
  ExitWallPlacement,
} from '../../src/exit/exit.presentation.types';
import { ExitTransitionTrigger } from '../../src/exit/ExitTransitionTrigger';

const placement: ExitWallPlacement = {
  roomId: 'room-42',
  surfaceId: 'far-wall',
  center: { x: 0, y: 1.225, z: 5 },
  inwardNormal: { x: 0, y: 0, z: -2 },
  width: 2.8,
  height: 2.45,
  seed: 'exit-trigger',
};

function frame(overrides: Partial<ExitTransitionFrame> = {}): ExitTransitionFrame {
  return {
    previousPosition: { x: 0, y: 0.04, z: 4.5 },
    position: { x: 0, y: 0.04, z: 4.5 },
    forward: { x: 0, y: 0, z: 1 },
    velocity: { x: 0, y: 0, z: 2.4 },
    deltaSeconds: 0.04,
    ...overrides,
  };
}

describe('ExitTransitionTrigger', () => {
  it('normaliza el plano y activa tras una aproximación corta aun bloqueado por collider', () => {
    const trigger = new ExitTransitionTrigger(placement);
    expect(trigger.placement.inwardNormal).toEqual({ x: 0, y: 0, z: -1 });

    expect(trigger.update(frame()).entered).toBe(false);
    expect(trigger.update(frame()).activationProgress).toBeCloseTo(2 / 3, 5);
    const entered = trigger.update(frame());
    expect(entered).toMatchObject({
      entered: true,
      insideSurface: true,
      insideActivationBand: true,
      approachSpeed: 2.4,
      facingAlignment: 1,
      activationProgress: 1,
    });
    expect(entered.signedDistance).toBeCloseTo(0.5, 5);
  });

  it('rechaza aproximaciones laterales, fuera de superficie o mirando en dirección opuesta', () => {
    const trigger = new ExitTransitionTrigger(placement);
    for (let index = 0; index < 10; index += 1) {
      trigger.update(
        frame({
          previousPosition: { x: 1.3, y: 0.04, z: 4.5 },
          position: { x: 1.3, y: 0.04, z: 4.5 },
        }),
      );
    }
    expect(trigger.snapshot.insideSurface).toBe(false);
    expect(trigger.snapshot.entered).toBe(false);

    trigger.reset();
    for (let index = 0; index < 10; index += 1) {
      trigger.update(frame({ forward: { x: 0, y: 0, z: -1 } }));
    }
    expect(trigger.snapshot.facingAlignment).toBe(-1);
    expect(trigger.snapshot.entered).toBe(false);

    trigger.reset();
    for (let index = 0; index < 10; index += 1) {
      trigger.update(frame({ velocity: { x: 2, y: 0, z: 0 } }));
    }
    expect(trigger.snapshot.approachSpeed).toBe(0);
    expect(trigger.snapshot.entered).toBe(false);
  });

  it('conserva un cruce barrido y completa el dwell al otro lado del plano', () => {
    const trigger = new ExitTransitionTrigger(placement);
    const crossing = frame({
      previousPosition: { x: 0, y: 0.04, z: 4.9 },
      position: { x: 0, y: 0.04, z: 5.05 },
      deltaSeconds: 0.06,
    });
    expect(trigger.update(crossing)).toMatchObject({ crossedPlane: true, entered: false });
    expect(
      trigger.update(
        frame({
          previousPosition: { x: 0, y: 0.04, z: 5.05 },
          position: { x: 0, y: 0.04, z: 5.08 },
          deltaSeconds: 0.06,
        }),
      ),
    ).toMatchObject({ crossedPlane: true, entered: true });
  });

  it('sigue el floating origin y reinicia su latch sin conservar progreso', () => {
    const trigger = new ExitTransitionTrigger(placement);
    trigger.translate({ x: -200, y: 0, z: 14 });
    expect(trigger.placement.center).toEqual({ x: -200, y: 1.225, z: 19 });

    trigger.update(
      frame({
        previousPosition: { x: -200, y: 0.04, z: 18.5 },
        position: { x: -200, y: 0.04, z: 18.5 },
      }),
    );
    expect(trigger.snapshot.activationProgress).toBeGreaterThan(0);
    trigger.reset();
    expect(trigger.snapshot).toMatchObject({ entered: false, activationProgress: 0 });
  });

  it('valida placement y delta para impedir triggers degenerados', () => {
    expect(
      () => new ExitTransitionTrigger({ ...placement, inwardNormal: { x: 0, y: 1, z: 0 } }),
    ).toThrow(/horizontal non-zero/);
    expect(() => new ExitTransitionTrigger({ ...placement, width: 0.2 })).toThrow(/too narrow/);
    const trigger = new ExitTransitionTrigger(placement);
    expect(() => trigger.update(frame({ deltaSeconds: Number.NaN }))).toThrow(RangeError);
  });
});
