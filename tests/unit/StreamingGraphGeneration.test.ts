import { describe, expect, it } from 'vitest';

import { generateRoomGraph, validateRoomGraph } from '../../src/procedural/RoomGraphGenerator';

describe('streaming-scale graph generation', () => {
  it('creates a long deterministic spine across representative production seeds', () => {
    const seeds = [
      'phase-4-scale',
      'qa-scale-2',
      'threshold-production',
      'fluorescent-maze',
      'damp-carpet',
      'no-clipping',
    ];

    for (const seed of seeds) {
      const graph = generateRoomGraph({
        seed,
        targetRooms: 1024,
        frontierStrategy: 'deep',
      });

      expect(graph.rooms, seed).toHaveLength(1024);
      expect(graph.connections, seed).toHaveLength(1023);
      expect(Math.max(...graph.rooms.map((room) => room.depth)), seed).toBeGreaterThanOrEqual(500);
      expect(validateRoomGraph(graph), seed).toEqual([]);
    }
  }, 15_000);

  it('keeps an explicit logical safety ceiling', () => {
    expect(() =>
      generateRoomGraph({ seed: 'too-large', targetRooms: 2049, frontierStrategy: 'deep' }),
    ).toThrow(/logical safety limit of 2048/);
  });
});
