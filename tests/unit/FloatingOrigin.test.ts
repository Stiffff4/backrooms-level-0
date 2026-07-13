import { describe, expect, it } from 'vitest';
import { generateRoomGraph, getRoomGraphSignature } from '../../src/procedural/RoomGraphGenerator';
import type { Vector3Like } from '../../src/procedural/procedural.types';
import { applyWorldDelta, FloatingOrigin } from '../../src/world/FloatingOrigin';

function relative(first: Vector3Like, second: Vector3Like): Vector3Like {
  return {
    x: second.x - first.x,
    y: second.y - first.y,
    z: second.z - first.z,
  };
}

describe('FloatingOrigin', () => {
  it('usa 240 m por defecto y no rebasa por debajo del umbral', () => {
    const origin = new FloatingOrigin();

    expect(origin.config.rebaseThreshold).toBe(240);
    expect(origin.shouldRebase({ x: 239.99, y: 1.7, z: 0 })).toBe(false);
    expect(origin.update({ x: 100, y: 1.7, z: 100 })).toBeNull();
    expect(origin.metrics).toMatchObject({ rebaseCount: 0, totalShiftDistance: 0 });
  });

  it('produce un delta atómico opuesto y mantiene intactas las coordenadas lógicas', () => {
    const graph = generateRoomGraph({ seed: 'floating-graph', targetRooms: 30 });
    const signatureBefore = getRoomGraphSignature(graph);
    const origin = new FloatingOrigin();
    const event = origin.update({ x: 240, y: 1.72, z: -32 });

    expect(event).not.toBeNull();
    expect(event?.worldDelta).toEqual({ x: -240, y: 0, z: 32 });
    expect(event?.playerLocalAfter).toEqual({ x: 0, y: 1.72, z: 0 });
    expect(event?.originOffset).toEqual({ x: 240, y: 0, z: -32 });
    expect(getRoomGraphSignature(graph)).toBe(signatureBefore);
  });

  it('preserva posiciones relativas y la conversión lógica/local tras varios rebases', () => {
    const origin = new FloatingOrigin({ rebaseThreshold: 200 });
    const firstLogical = { x: 310, y: 0, z: -90 };
    const secondLogical = { x: 347, y: 2.8, z: -141 };
    const relativeBefore = relative(
      origin.logicalToLocal(firstLogical),
      origin.logicalToLocal(secondLogical),
    );
    const firstLocalBefore = origin.logicalToLocal(firstLogical);
    const firstEvent = origin.update({ x: 210, y: 1.7, z: -40 });
    expect(firstEvent).not.toBeNull();
    if (firstEvent === null) {
      return;
    }

    expect(applyWorldDelta(firstLocalBefore, firstEvent.worldDelta)).toEqual(
      origin.logicalToLocal(firstLogical),
    );
    expect(
      relative(origin.logicalToLocal(firstLogical), origin.logicalToLocal(secondLogical)),
    ).toEqual(relativeBefore);
    expect(origin.localToLogical(origin.logicalToLocal(secondLogical))).toEqual(secondLogical);

    const secondEvent = origin.update({ x: -15, y: 1.7, z: 205 });
    expect(secondEvent?.sequence).toBe(2);
    expect(origin.metrics.rebaseCount).toBe(2);
    expect(origin.metrics.totalShiftDistance).toBeCloseTo(
      Math.hypot(210, -40) + Math.hypot(-15, 205),
    );
    expect(
      relative(origin.logicalToLocal(firstLogical), origin.logicalToLocal(secondLogical)),
    ).toEqual(relativeBefore);
  });

  it('reset devuelve el delta de restauración y reinicia offset y métricas', () => {
    const origin = new FloatingOrigin({ rebaseThreshold: 200 });
    const logicalPosition = { x: 460, y: 1.7, z: -125 };
    expect(origin.update({ x: 230, y: 1.7, z: -40 })).not.toBeNull();
    const localBeforeReset = origin.logicalToLocal(logicalPosition);

    const reset = origin.reset();

    expect(reset.previousOriginOffset).toEqual({ x: 230, y: 0, z: -40 });
    expect(reset.worldDelta).toEqual({ x: 230, y: 0, z: -40 });
    expect(applyWorldDelta(localBeforeReset, reset.worldDelta)).toEqual(logicalPosition);
    expect(origin.logicalToLocal(logicalPosition)).toEqual(logicalPosition);
    expect(origin.localToLogical(logicalPosition)).toEqual(logicalPosition);
    expect(origin.metrics).toEqual({
      rebaseCount: 0,
      totalShiftDistance: 0,
      lastRebaseDistance: 0,
      originOffset: { x: 0, y: 0, z: 0 },
    });
  });

  it('valida configuración y coordenadas no finitas', () => {
    expect(() => new FloatingOrigin({ rebaseThreshold: 0 })).toThrow(/positive finite/);
    const origin = new FloatingOrigin();
    expect(() => origin.update({ x: Number.NaN, y: 0, z: 0 })).toThrow(/finite/);
  });
});
