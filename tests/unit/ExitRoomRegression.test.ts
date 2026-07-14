import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';
import { exitPresentationConfig } from '../../src/exit/exit.presentation.config';
import type { ExitWallPlacement } from '../../src/exit/exit.presentation.types';
import { insetExitWallPlacement } from '../../src/exit/ExitPlacement';
import { ExitWallPresentation } from '../../src/exit/ExitWallPresentation';
import { generateRoomGraph } from '../../src/procedural/RoomGraphGenerator';
import { MODULAR_WALL_THICKNESS } from '../../src/rooms/builders/ModularRoomBuilder';
import { ModularWorld } from '../../src/rooms/ModularWorld';

function horizontalDot(left: Vector3, right: Vector3): number {
  return left.x * right.x + left.z * right.z;
}

describe('seed regression: threshold-2026-07-14 / room-0137', () => {
  it('places the visible exit in front of the rendered wall and keeps its trigger usable after rebases', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = generateRoomGraph({
      seed: 'threshold-2026-07-14',
      targetRooms: 1_024,
      frontierStrategy: 'deep',
    });
    const world = new ModularWorld(scene);

    try {
      world.setGraph(graph);
      const view = world.loadRoom('room-0137');
      expect(view.definition.id).toBe('room_medium_rect');
      const surface = view.definition.exitCompatibleSurfaces.find(
        (candidate) => candidate.id === 'north-wall-left',
      );
      expect(surface).toBeDefined();
      if (!surface) return;

      view.root.computeWorldMatrix(true);
      const matrix = view.root.getWorldMatrix();
      const nominalCenter = Vector3.TransformCoordinates(
        new Vector3(surface.localPosition.x, surface.localPosition.y, surface.localPosition.z),
        matrix,
      );
      const outward = Vector3.TransformNormal(
        new Vector3(surface.localForward.x, surface.localForward.y, surface.localForward.z),
        matrix,
      ).normalize();
      const inward = outward.scale(-1);
      const nominalPlacement: ExitWallPlacement = {
        roomId: view.id,
        surfaceId: surface.id,
        center: nominalCenter,
        inwardNormal: inward,
        width: surface.width,
        height: surface.height,
        seed: 'room-0137-regression',
      };
      const placement = insetExitWallPlacement(nominalPlacement, MODULAR_WALL_THICKNESS);
      const presentation = new ExitWallPresentation(scene, placement, world.materialLibrary.wall);

      try {
        presentation.root.computeWorldMatrix(true);
        presentation.wallMesh.computeWorldMatrix(true);
        const triggerOffset = horizontalDot(
          new Vector3(
            presentation.trigger.placement.center.x - nominalCenter.x,
            presentation.trigger.placement.center.y - nominalCenter.y,
            presentation.trigger.placement.center.z - nominalCenter.z,
          ),
          inward,
        );
        const visualOffset = horizontalDot(
          presentation.wallMesh.getAbsolutePosition().subtract(nominalCenter),
          inward,
        );

        expect(triggerOffset).toBeCloseTo(MODULAR_WALL_THICKNESS, 5);
        expect(visualOffset).toBeCloseTo(
          MODULAR_WALL_THICKNESS + exitPresentationConfig.visual.surfaceOffset,
          5,
        );
        expect(visualOffset - exitPresentationConfig.visual.thickness / 2).toBeGreaterThan(
          MODULAR_WALL_THICKNESS,
        );

        for (let index = 0; index < 16; index += 1) {
          const delta = { x: index % 2 === 0 ? -40 : 0, y: 0, z: index % 2 === 0 ? 0 : -40 };
          presentation.translate(delta);
        }

        const translated = presentation.trigger.placement;
        const approach = new Vector3(
          translated.center.x + translated.inwardNormal.x * 0.42,
          0.04,
          translated.center.z + translated.inwardNormal.z * 0.42,
        );
        const outwardVelocity = {
          x: -translated.inwardNormal.x * 2.65,
          y: 0,
          z: -translated.inwardNormal.z * 2.65,
        };

        let entered = false;
        for (let index = 0; index < 4; index += 1) {
          entered = presentation.trigger.update({
            previousPosition: approach,
            position: approach,
            forward: outwardVelocity,
            velocity: outwardVelocity,
            deltaSeconds: 0.04,
          }).entered;
        }
        expect(entered).toBe(true);
      } finally {
        presentation.dispose();
      }
    } finally {
      world.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});
