import { describe, expect, it } from 'vitest';
import {
  approachHorizontalVelocity,
  calculateDesiredHorizontalVelocity,
  smoothHorizontalVelocity,
} from '../../src/player/PlayerController';

describe('PlayerController velocity helpers', () => {
  it('acelera hacia la velocidad objetivo sin sobrepasarla', () => {
    const accelerated = smoothHorizontalVelocity({ x: 0, z: 0 }, { x: 0, z: 4 }, 10, 20, 0.1);
    const reached = smoothHorizontalVelocity(accelerated, { x: 0, z: 1.2 }, 10, 20, 0.1);

    expect(accelerated).toEqual({ x: 0, z: 1 });
    expect(reached).toEqual({ x: 0, z: 1.2 });
  });

  it('usa el frenado al soltar el movimiento y no invierte la velocidad', () => {
    const braking = smoothHorizontalVelocity({ x: 3, z: 4 }, { x: 0, z: 0 }, 5, 20, 0.1);
    const stopped = smoothHorizontalVelocity(braking, { x: 0, z: 0 }, 5, 20, 1);

    expect(braking.x).toBeCloseTo(1.8);
    expect(braking.z).toBeCloseTo(2.4);
    expect(stopped).toEqual({ x: 0, z: 0 });
  });

  it('limita el cambio vectorial manteniendo su dirección', () => {
    const result = approachHorizontalVelocity({ x: -1, z: 0 }, { x: 2, z: 4 }, 2.5);

    expect(Math.hypot(result.x + 1, result.z)).toBeCloseTo(2.5);
    expect(result.x).toBeGreaterThan(-1);
    expect(result.z).toBeGreaterThan(0);
  });

  it('normaliza el input diagonal para no correr más rápido', () => {
    const straight = calculateDesiredHorizontalVelocity(0, 1, 0, 4.5);
    const diagonal = calculateDesiredHorizontalVelocity(1, 1, 0, 4.5);

    expect(Math.hypot(straight.x, straight.z)).toBeCloseTo(4.5);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(4.5);
  });

  it('rota el movimiento local con el yaw de la cámara', () => {
    const forward = calculateDesiredHorizontalVelocity(0, 1, Math.PI / 2, 3);
    const strafe = calculateDesiredHorizontalVelocity(1, 0, Math.PI / 2, 3);

    expect(forward.x).toBeCloseTo(3);
    expect(forward.z).toBeCloseTo(0);
    expect(strafe.x).toBeCloseTo(0);
    expect(strafe.z).toBeCloseTo(-3);
  });
});
