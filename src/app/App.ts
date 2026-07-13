import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AmbientDirector } from '../audio/AmbientDirector';
import { FootstepSystem } from '../audio/FootstepSystem';
import { GameAudioEngine } from '../audio/GameAudioEngine';
import { ProceduralAudioBank, hashAudioSeed } from '../audio/ProceduralAudioBank';
import { gameConfig } from '../config/game.config';
import { GameClock } from '../game/GameClock';
import { SessionStats } from '../game/SessionStats';
import { DebugHud } from '../debug/DebugHud';
import { parseDebugOptions } from '../debug/QueryParams';
import { EngineBootstrap } from '../engine/EngineBootstrap';
import { createGameplayScene } from '../engine/SceneFactory';
import { PlayerController } from '../player/PlayerController';
import { assertValidRoomGraph, generateRoomGraph } from '../procedural/RoomGraphGenerator';
import { hashSeed } from '../procedural/SeedBank';
import type { RoomGraph, RoomInstance } from '../procedural/procedural.types';
import { ModularWorld } from '../rooms/ModularWorld';
import type { BuiltModularRoom } from '../rooms/rendering/rendering.types';
import { renderErrorScreen } from '../ui/ErrorScreen';
import { CreditsDialog } from '../ui/CreditsDialog';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsStore } from '../ui/SettingsStore';
import { TitleScreen } from '../ui/TitleScreen';
import { ChunkStreamer } from '../world/ChunkStreamer';
import { FloatingOrigin } from '../world/FloatingOrigin';
import {
  StreamingVisibilityGuard,
  type StreamingVisibilityResult,
} from '../world/StreamingVisibilityGuard';
import type { ChunkStreamingResult } from '../world/world.types';
import { GameEventBus } from './GameEventBus';
import { GameStateMachine, type GameState } from './GameStateMachine';

export class App {
  private readonly stateMachine = new GameStateMachine();
  private readonly events = new GameEventBus();
  private readonly settings = new SettingsStore();
  private readonly clock = new GameClock();
  private readonly stats = new SessionStats();
  private readonly debugOptions = parseDebugOptions(window.location.search);
  private readonly unsubscribers: (() => void)[] = [];
  private readonly audioEngine: GameAudioEngine;
  private readonly audioLocalForward = Vector3.Forward();
  private readonly audioForward = Vector3.Zero();
  private readonly floatingOrigin = new FloatingOrigin({
    rebaseThreshold: this.debugOptions.debug ? 40 : gameConfig.world.floatingOriginThreshold,
  });

  private engineBootstrap: EngineBootstrap | null = null;
  private scene: Scene | null = null;
  private roomGraph: RoomGraph | null = null;
  private modularWorld: ModularWorld | null = null;
  private chunkStreamer: ChunkStreamer<BuiltModularRoom> | null = null;
  private visibilityGuard: StreamingVisibilityGuard | null = null;
  private lastVisibility: StreamingVisibilityResult | null = null;
  private roomsById = new Map<string, RoomInstance>();
  private streamingRoute: readonly string[] = [];
  private streamingRouteIndex = 0;
  private readonly recentlyLeftRooms = new Map<string, number>();
  private player: PlayerController | null = null;
  private titleScreen: TitleScreen | null = null;
  private pauseMenu: PauseMenu | null = null;
  private creditsDialog: CreditsDialog | null = null;
  private debugHud: DebugHud | null = null;
  private audioBank: ProceduralAudioBank | null = null;
  private ambientDirector: AmbientDirector | null = null;
  private footsteps: FootstepSystem | null = null;
  private footstepCount = 0;
  private layoutSignature = '';
  private currentRoomDefinitionId: string | null = null;
  private debugStreamingAdvanceToken = 0;
  private disposed = false;

  private readonly handleDebugAdvanceStreaming = (event: Event): void => {
    if (!this.debugOptions.debug) {
      return;
    }
    const requested = (event as CustomEvent<{ steps?: number }>).detail?.steps ?? 1;
    const steps = Number.isFinite(requested)
      ? Math.max(1, Math.min(512, Math.floor(requested)))
      : 1;
    const token = ++this.debugStreamingAdvanceToken;
    this.root.dataset.debugStreamingPending = 'true';
    void this.advanceDebugStreamingInBatches(steps, token).catch((error: unknown) => {
      if (!this.disposed) {
        this.showFatalError(error);
      }
    });
  };

  private readonly handleWindowBlur = (): void => {
    this.audioEngine.setFocused(false);
    this.pauseForFocusLoss();
  };
  private readonly handleWindowFocus = (): void => this.audioEngine.setFocused(true);
  private readonly handleVisibilityChange = (): void => {
    this.audioEngine.setFocused(document.visibilityState === 'visible' && document.hasFocus());
    if (document.visibilityState === 'hidden') {
      this.pauseForFocusLoss();
    }
  };

  public constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const settings = this.settings.value;
    this.audioEngine = new GameAudioEngine({
      enabled: !this.debugOptions.noAudio,
      initialVolumes: {
        master: settings.masterVolume,
        ambience: settings.ambienceVolume,
        lights: settings.ambienceVolume,
        footsteps: settings.footstepsVolume,
      },
    });
    this.audioEngine.setPaused(true);
    this.syncAudioDebugSnapshot();

    this.unsubscribers.push(
      this.stateMachine.subscribe((next, previous) => {
        this.events.emit('stateChanged', { next, previous });
        this.root.dataset.gameState = next;
        const paused = next !== 'playing' && next !== 'entering';
        this.audioEngine.setPaused(paused);
        this.ambientDirector?.setPaused(paused);
        this.footsteps?.setPaused(paused);
        this.syncAudioDebugSnapshot();
      }),
    );
  }

  public async start(): Promise<void> {
    const bootStartedAt = performance.now();
    try {
      this.stateMachine.transition('loading');
      this.engineBootstrap = EngineBootstrap.create(this.canvas);
      this.scene = createGameplayScene(this.engineBootstrap.engine);
      this.roomGraph = generateRoomGraph({
        seed: this.debugOptions.seed,
        targetRooms: gameConfig.world.logicalRoomCount,
        frontierStrategy: 'deep',
      });
      assertValidRoomGraph(this.roomGraph);
      this.roomsById = new Map(this.roomGraph.rooms.map((room) => [room.id, room]));
      this.streamingRoute = this.buildDeepStreamingRoute(this.roomGraph);
      this.streamingRouteIndex = 0;
      this.layoutSignature = hashSeed(
        JSON.stringify({
          rooms: this.roomGraph.rooms.map((room) => ({
            definitionId: room.definitionId,
            transform: room.worldTransform,
            sockets: room.socketStates,
          })),
          connections: this.roomGraph.connections,
        }),
      ).toString(16);
      this.modularWorld = new ModularWorld(this.scene, undefined, {
        maxLoadedRooms: gameConfig.world.maxMaterializedRooms,
        pooledRoomLimit: gameConfig.world.pooledRoomViews,
      });
      this.modularWorld.setGraph(this.roomGraph);
      this.visibilityGuard = new StreamingVisibilityGuard(
        this.roomGraph,
        this.modularWorld,
        this.scene,
        { fogEnd: gameConfig.world.fogEnd },
      );
      this.chunkStreamer = this.createChunkStreamer();
      this.streamAround(this.roomGraph.startRoomId);
      this.player = new PlayerController(
        this.scene,
        this.canvas,
        this.modularWorld.spawnPoint,
        this.settings.value,
      );
      this.player.setLookRotation(this.modularWorld.spawnYaw);
      this.player.setEnabled(false);
      const initialTransition = this.modularWorld.updatePlayerPosition(this.player.position);
      this.recordRoomEntry(initialTransition.roomId);
      this.syncWorldDebugSnapshot();
      this.installUi();
      this.installSubscriptions();
      window.addEventListener('blur', this.handleWindowBlur);
      window.addEventListener('focus', this.handleWindowFocus);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      if (this.debugOptions.debug) {
        this.debugHud = new DebugHud(this.root, this.scene);
        this.root.addEventListener(
          'backrooms:debug-advance-streaming',
          this.handleDebugAdvanceStreaming,
        );
      }

      this.engineBootstrap.start(() => this.renderFrame());
      this.root.querySelector('#boot-status')?.remove();
      this.root.dataset.bootDurationMs = (performance.now() - bootStartedAt).toFixed(2);
      this.stateMachine.transition('title');
      this.titleScreen?.setReady();
      await Promise.resolve();
    } catch (error: unknown) {
      this.showFatalError(error);
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.debugStreamingAdvanceToken += 1;

    for (const unsubscribe of this.unsubscribers.splice(0)) {
      unsubscribe();
    }
    this.events.clear();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.root.removeEventListener(
      'backrooms:debug-advance-streaming',
      this.handleDebugAdvanceStreaming,
    );
    this.debugHud?.dispose();
    this.debugHud = null;
    this.pauseMenu?.dispose();
    this.pauseMenu = null;
    this.creditsDialog?.dispose();
    this.creditsDialog = null;
    this.titleScreen?.dispose();
    this.titleScreen = null;
    this.footsteps?.dispose();
    this.footsteps = null;
    this.ambientDirector?.dispose();
    this.ambientDirector = null;
    this.audioBank?.dispose();
    this.audioBank = null;
    this.player?.dispose();
    this.player = null;
    this.chunkStreamer?.dispose();
    this.chunkStreamer = null;
    this.visibilityGuard = null;
    this.lastVisibility = null;
    this.modularWorld?.dispose();
    this.modularWorld = null;
    this.roomGraph = null;
    this.roomsById.clear();
    this.streamingRoute = [];
    this.recentlyLeftRooms.clear();
    this.scene?.dispose();
    this.scene = null;
    this.engineBootstrap?.dispose();
    this.engineBootstrap = null;
    void this.audioEngine.dispose();
  }

  private installUi(): void {
    this.creditsDialog = new CreditsDialog(this.root);
    this.titleScreen = new TitleScreen(this.root, this.settings, {
      onEnter: () => void this.enterGame(),
      onCredits: () => this.creditsDialog?.show(),
    });
    this.pauseMenu = new PauseMenu(this.root, this.settings, {
      onResume: () => void this.resumeGame(),
      onRestartSeed: () => void this.restartSession(),
      onExitToMenu: () => this.returnToTitle(),
    });
  }

  private installSubscriptions(): void {
    if (!this.player) {
      return;
    }

    this.unsubscribers.push(
      this.player.subscribePointerLock((locked) => this.handlePointerLock(locked)),
      this.player.subscribeMovement((frame) => {
        this.stats.recordMovement(frame.distance, frame.sprinting);
        this.footstepCount += this.footsteps?.update(frame) ?? 0;
      }),
      this.settings.subscribe(({ current, changedKeys }) => {
        this.player?.updateSettings(current);
        this.audioEngine.setVolumes({
          master: current.masterVolume,
          ambience: current.ambienceVolume,
          lights: current.ambienceVolume,
          footsteps: current.footstepsVolume,
        });
        for (const key of changedKeys) {
          this.events.emit('settingsChanged', { key });
        }
      }),
    );
  }

  private renderFrame(): void {
    if (!this.scene || !this.engineBootstrap) {
      return;
    }

    if (this.stateMachine.state === 'playing') {
      this.player?.update(this.engineBootstrap.engine.getDeltaTime() / 1000);
      this.updateWorldFrame();
      this.updateAudioFrame();
    }
    this.updateDebugSnapshot();
    const audioSnapshot = this.audioEngine.snapshot;
    this.debugHud?.update(performance.now(), [
      `AUDIO ${audioSnapshot.state} / ${this.getAudioNodeCount()} NODES`,
      `STEPS ${this.footstepCount}`,
      `ROOM ${this.modularWorld?.activeRoomId ?? 'none'} / ${this.stats.snapshot(this.clock.elapsedSeconds).roomsVisited} VISITED`,
      `STREAM ${this.chunkStreamer?.metrics.activeRoomCount ?? 0} ACTIVE / ${this.chunkStreamer?.metrics.preloadRoomCount ?? 0} PRELOAD / ${this.modularWorld?.pooledRoomCount ?? 0} POOLED`,
      `ORIGIN ${this.floatingOrigin.metrics.rebaseCount} REBASES`,
      `SEED ${this.debugOptions.seed}`,
    ]);
    this.scene.render();
  }

  private updateWorldFrame(): void {
    if (!this.player || !this.modularWorld) {
      return;
    }
    const transition = this.modularWorld.updatePlayerPosition(this.player.position);
    if (transition.changed) {
      if (transition.previousRoomId) {
        this.recentlyLeftRooms.set(transition.previousRoomId, this.clock.elapsedSeconds);
      }
      this.recordRoomEntry(transition.roomId);
      if (transition.roomId) {
        this.streamAround(transition.roomId);
      }
    }
    this.applyFloatingOrigin();
  }

  private recordRoomEntry(roomId: string | null): void {
    if (!roomId || !this.roomGraph) {
      this.currentRoomDefinitionId = null;
      return;
    }
    const instance = this.roomsById.get(roomId);
    if (!instance) {
      this.currentRoomDefinitionId = null;
      return;
    }

    const firstVisit = this.stats.recordRoomVisit(roomId);
    instance.visitState = 'visited';
    this.currentRoomDefinitionId = instance.definitionId;
    const routeIndex = this.streamingRoute.indexOf(roomId);
    if (routeIndex >= 0) {
      this.streamingRouteIndex = routeIndex;
    }
    this.events.emit('roomEntered', { roomId, definitionId: instance.definitionId, firstVisit });
    this.syncWorldDebugSnapshot();
  }

  private resetRoomVisits(): void {
    if (!this.roomGraph) {
      return;
    }
    for (const room of this.roomGraph.rooms) {
      room.visitState = room.id === this.roomGraph.startRoomId ? 'visible' : 'unvisited';
    }
  }

  private createChunkStreamer(): ChunkStreamer<BuiltModularRoom> {
    if (!this.roomGraph || !this.modularWorld) {
      throw new Error('Cannot create streaming before the logical and rendered worlds exist.');
    }
    const world = this.modularWorld;
    return new ChunkStreamer<BuiltModularRoom>(
      this.roomGraph,
      {
        materialize: (room) => world.loadRoom(room.id),
        dematerialize: (room) => {
          world.unloadRoom(room.id);
        },
      },
      {
        activeRadius: gameConfig.world.activeGraphRadius,
        preloadRadius: gameConfig.world.preloadGraphRadius,
        maxMaterializedRooms: gameConfig.world.maxMaterializedRooms,
      },
    );
  }

  private streamAround(roomId: string): ChunkStreamingResult {
    if (!this.chunkStreamer) {
      throw new Error('Chunk streaming is not initialized.');
    }
    const recentCutoff = this.clock.elapsedSeconds - gameConfig.world.recentlyLeftProtectionSeconds;
    for (const [recentRoomId, leftAt] of this.recentlyLeftRooms) {
      if (leftAt < recentCutoff) {
        this.recentlyLeftRooms.delete(recentRoomId);
      }
    }

    const visibility =
      this.visibilityGuard && this.player
        ? (() => {
            this.player.camera.computeWorldMatrix();
            return this.visibilityGuard.evaluate({
              camera: this.player.camera,
              playerPosition: this.player.position,
            });
          })()
        : null;
    this.lastVisibility = visibility;
    const result = this.chunkStreamer.update({
      currentRoomId: roomId,
      visibleRoomIds: visibility?.visibleRoomIds ?? [],
      visibleEntranceRoomIds: visibility?.visibleEntranceRoomIds ?? [],
      exitRoomId: null,
      recentlyLeftRoomIds: [...this.recentlyLeftRooms.keys()],
    });
    if (visibility && this.visibilityGuard) {
      const verification = this.visibilityGuard.verifyRetention(visibility, {
        // Verify the renderer independently from the streamer's intended set.
        // A bookkeeping bug must not be able to prove its own correctness.
        materializedRoomIds: this.modularWorld?.loadedRoomIds ?? [],
      });
      if (verification.violationCount > 0) {
        throw new Error(
          `Streaming removed protected rooms: ${verification.missingRoomIds.join(', ')}.`,
        );
      }
    }
    return result;
  }

  private applyFloatingOrigin(): void {
    if (!this.player || !this.modularWorld) {
      return;
    }
    const rebase = this.floatingOrigin.update(this.player.position);
    if (!rebase) {
      return;
    }

    const delta = new Vector3(rebase.worldDelta.x, rebase.worldDelta.y, rebase.worldDelta.z);
    this.modularWorld.translate(delta);
    this.player.setPosition(
      new Vector3(rebase.playerLocalAfter.x, rebase.playerLocalAfter.y, rebase.playerLocalAfter.z),
      false,
    );
    this.footsteps?.resetAfterRebase();
    this.events.emit('originRebased', {
      sequence: rebase.sequence,
      worldDelta: rebase.worldDelta,
      originOffset: rebase.originOffset,
    });
    this.syncWorldDebugSnapshot();
  }

  private buildDeepStreamingRoute(graph: RoomGraph): readonly string[] {
    const roomsById = new Map(graph.rooms.map((room) => [room.id, room]));
    const adjacency = new Map<string, string[]>();
    for (const room of graph.rooms) {
      adjacency.set(room.id, []);
    }
    for (const connection of graph.connections) {
      adjacency.get(connection.roomAId)?.push(connection.roomBId);
      adjacency.get(connection.roomBId)?.push(connection.roomAId);
    }

    const deepest = [...graph.rooms].sort(
      (left, right) => right.depth - left.depth || right.spawnedAt - left.spawnedAt,
    )[0];
    if (!deepest) {
      throw new Error('Cannot build a streaming route from an empty room graph.');
    }

    const reversedRoute = [deepest.id];
    let current = deepest;
    while (current.id !== graph.startRoomId) {
      const parentId = (adjacency.get(current.id) ?? []).find(
        (candidateId) => roomsById.get(candidateId)?.depth === current.depth - 1,
      );
      const parent = parentId ? roomsById.get(parentId) : undefined;
      if (!parent) {
        throw new Error(`Deep streaming route lost the parent of ${current.id}.`);
      }
      reversedRoute.push(parent.id);
      current = parent;
    }
    return Object.freeze(reversedRoute.reverse());
  }

  private advanceDebugStreaming(steps: number): void {
    if (!this.player || !this.modularWorld || this.streamingRoute.length === 0) {
      return;
    }
    for (let index = 0; index < steps; index += 1) {
      const nextIndex = Math.min(this.streamingRouteIndex + 1, this.streamingRoute.length - 1);
      if (nextIndex === this.streamingRouteIndex) {
        break;
      }
      const nextRoomId = this.streamingRoute[nextIndex];
      if (!nextRoomId) {
        break;
      }
      const previousRoomId = this.modularWorld.activeRoomId;
      // The debug traversal represents several seconds of real walking per
      // room; keep only the immediately previous room inside the grace window.
      this.recentlyLeftRooms.clear();
      if (previousRoomId) {
        this.recentlyLeftRooms.set(previousRoomId, this.clock.elapsedSeconds);
      }
      this.streamAround(nextRoomId);
      const view = this.modularWorld.getLoadedRoom(nextRoomId);
      if (!view) {
        throw new Error(`Debug streaming did not materialize ${nextRoomId}.`);
      }
      this.player.setPosition(
        new Vector3(
          view.trigger.center.x,
          view.trigger.center.y - view.definition.footprint.height / 2 + 0.04,
          view.trigger.center.z,
        ),
      );
      const transition = this.modularWorld.updatePlayerPosition(this.player.position);
      this.recordRoomEntry(transition.roomId);
      this.streamingRouteIndex = nextIndex;
      this.applyFloatingOrigin();
    }
    this.syncWorldDebugSnapshot();
  }

  private async advanceDebugStreamingInBatches(steps: number, token: number): Promise<void> {
    let remaining = steps;
    while (remaining > 0 && token === this.debugStreamingAdvanceToken && !this.disposed) {
      const batchSize = Math.min(8, remaining);
      this.advanceDebugStreaming(batchSize);
      remaining -= batchSize;
      if (remaining > 0) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    }

    if (token === this.debugStreamingAdvanceToken && !this.disposed) {
      this.root.dataset.debugStreamingPending = 'false';
      this.root.dispatchEvent(new CustomEvent('backrooms:debug-streaming-advance-complete'));
    }
  }

  private updateAudioFrame(): void {
    const player = this.player;
    if (!player) {
      return;
    }

    this.ambientDirector?.update();
    if (!this.audioEngine.context) {
      return;
    }

    player.camera.computeWorldMatrix();
    const position = player.camera.globalPosition;
    player.camera.getDirectionToRef(this.audioLocalForward, this.audioForward);
    this.audioEngine.updateListener({ position, forward: this.audioForward });
  }

  private updateDebugSnapshot(): void {
    if (!this.debugOptions.debug || !this.player) {
      return;
    }

    const position = this.player.position;
    const logicalPosition = this.floatingOrigin.localToLogical(position);
    const movement = this.player.movementFrame;
    this.root.dataset.playerX = position.x.toFixed(4);
    this.root.dataset.playerY = position.y.toFixed(4);
    this.root.dataset.playerZ = position.z.toFixed(4);
    this.root.dataset.playerLogicalX = logicalPosition.x.toFixed(4);
    this.root.dataset.playerLogicalY = logicalPosition.y.toFixed(4);
    this.root.dataset.playerLogicalZ = logicalPosition.z.toFixed(4);
    this.root.dataset.playerMoving = String(movement.moving);
    this.root.dataset.playerSprinting = String(movement.sprinting);
    this.root.dataset.playerGrounded = String(movement.grounded);
    this.root.dataset.elapsedSeconds = this.clock.elapsedSeconds.toFixed(2);
    this.root.dataset.fps = (this.engineBootstrap?.engine.getFps() ?? 0).toFixed(1);
    this.syncAudioDebugSnapshot();
    this.syncWorldDebugSnapshot();
  }

  private syncWorldDebugSnapshot(): void {
    const graph = this.roomGraph;
    const world = this.modularWorld;
    const stats = this.stats.snapshot(this.clock.elapsedSeconds);
    const streaming = this.chunkStreamer?.metrics;
    const origin = this.floatingOrigin.metrics;
    this.root.dataset.seed = this.debugOptions.seed;
    this.root.dataset.layoutValid = graph ? 'true' : 'false';
    this.root.dataset.layoutSignature = this.layoutSignature;
    this.root.dataset.roomCount = String(graph?.rooms.length ?? 0);
    this.root.dataset.connectionCount = String(graph?.connections.length ?? 0);
    this.root.dataset.generationAttempts = String(graph?.generationStats.attemptedPlacements ?? 0);
    this.root.dataset.generationRejections = String(graph?.generationStats.rejectedOverlaps ?? 0);
    this.root.dataset.sealedSockets = String(graph?.generationStats.sealedSockets ?? 0);
    this.root.dataset.currentRoomId = world?.activeRoomId ?? '';
    this.root.dataset.currentRoomDefinition = this.currentRoomDefinitionId ?? '';
    this.root.dataset.visitedRooms = String(stats.roomsVisited);
    this.root.dataset.worldMeshes = String(world?.metrics.meshCount ?? 0);
    this.root.dataset.worldColliders = String(world?.metrics.colliderCount ?? 0);
    this.root.dataset.worldTriangles = String(world?.metrics.triangleCount ?? 0);
    this.root.dataset.worldActiveRooms = String(world?.metrics.activeRoomCount ?? 0);
    this.root.dataset.worldPooledRooms = String(world?.metrics.pooledRoomCount ?? 0);
    this.root.dataset.streamActiveRooms = String(streaming?.activeRoomCount ?? 0);
    this.root.dataset.streamPreloadRooms = String(streaming?.preloadRoomCount ?? 0);
    this.root.dataset.streamProtectedRooms = String(streaming?.protectedRoomCount ?? 0);
    this.root.dataset.streamMaterializedRooms = String(streaming?.materializedRoomCount ?? 0);
    this.root.dataset.streamPeakMaterializedRooms = String(
      streaming?.peakMaterializedRoomCount ?? 0,
    );
    this.root.dataset.streamHistoryRooms = String(streaming?.historyRoomCount ?? 0);
    this.root.dataset.streamMaterializations = String(streaming?.totalMaterializations ?? 0);
    this.root.dataset.streamDematerializations = String(streaming?.totalDematerializations ?? 0);
    this.root.dataset.streamBudget = String(
      streaming?.budget ?? gameConfig.world.maxMaterializedRooms,
    );
    this.root.dataset.streamVisibleRooms = String(this.lastVisibility?.visibleRoomIds.length ?? 0);
    this.root.dataset.streamVisibleEntrances = String(
      this.lastVisibility?.visibleEntranceRoomIds.length ?? 0,
    );
    this.root.dataset.visibleUnloadViolations = String(this.visibilityGuard?.violationCount ?? 0);
    this.root.dataset.streamingRouteIndex = String(this.streamingRouteIndex);
    this.root.dataset.streamingRouteLength = String(this.streamingRoute.length);
    this.root.dataset.floatingOriginRebases = String(origin.rebaseCount);
    this.root.dataset.floatingOriginThreshold = String(this.floatingOrigin.config.rebaseThreshold);
    this.root.dataset.floatingOriginX = origin.originOffset.x.toFixed(4);
    this.root.dataset.floatingOriginZ = origin.originOffset.z.toFixed(4);
    this.root.dataset.fogMode = this.scene?.fogMode === Scene.FOGMODE_LINEAR ? 'linear' : 'other';
    this.root.dataset.fogStart = String(this.scene?.fogStart ?? 0);
    this.root.dataset.fogEnd = String(this.scene?.fogEnd ?? 0);
    this.root.dataset.sceneMeshes = String(this.scene?.meshes.length ?? 0);
    this.root.dataset.sceneMaterials = String(this.scene?.materials.length ?? 0);
    this.root.dataset.sceneTransformNodes = String(this.scene?.transformNodes.length ?? 0);
  }

  private syncAudioDebugSnapshot(): void {
    const snapshot = this.audioEngine.snapshot;
    this.root.dataset.audioState = snapshot.state === 'idle' ? 'uninitialized' : snapshot.state;
    this.root.dataset.audioNodeCount = String(this.getAudioNodeCount());
    this.root.dataset.audioMixState = snapshot.paused || !snapshot.focused ? 'paused' : 'active';
    this.root.dataset.footstepCount = String(this.footstepCount);
    this.root.dataset.footstepPendingDistance = (this.footsteps?.pendingDistance ?? 0).toFixed(3);
  }

  private getAudioNodeCount(): number {
    return (
      this.audioEngine.nodeCount +
      (this.ambientDirector?.nodeCount ?? 0) +
      (this.footsteps?.activeVoiceCount ?? 0) * 3
    );
  }

  private async enterGame(): Promise<void> {
    if (!this.player || this.stateMachine.state !== 'title') {
      return;
    }

    this.stateMachine.transition('entering');
    this.titleScreen?.setEntering();
    this.player.setEnabled(true);
    const audioActivation = this.activateAudioFromUserGesture();
    const pointerLockRequest = this.player.requestPointerLock();
    const [, locked] = await Promise.all([audioActivation, pointerLockRequest]);
    if (!locked && this.readState() === 'entering') {
      this.player.setEnabled(false);
      this.stateMachine.transition('title');
      this.titleScreen?.setReady('Haz clic de nuevo para activar el mouse.');
    }
  }

  private async activateAudioFromUserGesture(): Promise<void> {
    const activated = await this.audioEngine.activateFromUserGesture();
    if (activated) {
      this.initializeAudioSystems();
    }
    this.syncAudioDebugSnapshot();
  }

  private initializeAudioSystems(): void {
    if (this.audioBank || this.ambientDirector || this.footsteps) {
      return;
    }

    const context = this.audioEngine.context;
    const ambienceBus = this.audioEngine.ambienceBus;
    const lightsBus = this.audioEngine.lightsBus;
    const footstepsBus = this.audioEngine.footstepsBus;
    const eventsBus = this.audioEngine.eventsBus;
    if (!context || !ambienceBus || !lightsBus || !footstepsBus || !eventsBus) {
      return;
    }

    const bank = new ProceduralAudioBank(context, { seed: this.debugOptions.seed });
    const ambientDirector = new AmbientDirector(
      {
        context,
        ambienceBus: ambienceBus.input,
        lightsBus: lightsBus.input,
        eventsBus: eventsBus.input,
      },
      bank,
    );
    const footsteps = new FootstepSystem(context, footstepsBus.input, {
      seed: hashAudioSeed(this.debugOptions.seed),
      initialCondition: 'damp',
    });

    this.audioBank = bank;
    this.ambientDirector = ambientDirector;
    this.footsteps = footsteps;
    const paused = this.stateMachine.state !== 'playing' && this.stateMachine.state !== 'entering';
    ambientDirector.start();
    ambientDirector.setPaused(paused);
    footsteps.setPaused(paused);
  }

  private async resumeGame(): Promise<void> {
    if (!this.player || this.stateMachine.state !== 'paused') {
      return;
    }

    this.player.setEnabled(true);
    const audioActivation = this.activateAudioFromUserGesture();
    const pointerLockRequest = this.player.requestPointerLock();
    const [, locked] = await Promise.all([audioActivation, pointerLockRequest]);
    if (!locked) {
      this.player.setEnabled(false);
      this.pauseMenu?.show();
    }
  }

  private handlePointerLock(locked: boolean): void {
    this.events.emit('pointerLockChanged', { locked });
    const state = this.stateMachine.state;

    if (locked && (state === 'entering' || state === 'paused')) {
      this.titleScreen?.hide();
      this.pauseMenu?.hide();
      this.player?.setEnabled(true);
      this.clock.start();
      this.stateMachine.transition('playing');
      return;
    }

    if (!locked && state === 'playing') {
      this.player?.setEnabled(false);
      this.clock.pause();
      this.stateMachine.transition('paused');
      this.pauseMenu?.show();
    }
  }

  private pauseForFocusLoss(): void {
    if (this.stateMachine.state !== 'playing') {
      return;
    }

    this.player?.releasePointerLock();
    this.player?.setEnabled(false);
    this.clock.pause();
    this.stateMachine.transition('paused');
    this.pauseMenu?.show();
  }

  private async restartSession(): Promise<void> {
    if (!this.modularWorld || !this.player) {
      return;
    }

    this.resetStreamingSessionState();
    await this.resumeGame();
  }

  private returnToTitle(): void {
    if (!this.modularWorld || !this.player || this.stateMachine.state !== 'paused') {
      return;
    }

    this.player.releasePointerLock();
    this.player.setEnabled(false);
    this.resetStreamingSessionState();
    this.pauseMenu?.hide();
    this.titleScreen?.show();
    this.titleScreen?.setReady();
    this.stateMachine.transition('title');
  }

  private resetStreamingSessionState(): void {
    if (!this.roomGraph || !this.modularWorld || !this.player) {
      return;
    }

    this.debugStreamingAdvanceToken += 1;
    this.root.dataset.debugStreamingPending = 'false';

    const reset = this.floatingOrigin.reset();
    this.modularWorld.translate(
      new Vector3(reset.worldDelta.x, reset.worldDelta.y, reset.worldDelta.z),
    );
    this.chunkStreamer?.dispose();
    this.chunkStreamer = this.createChunkStreamer();
    this.visibilityGuard?.resetViolationCount();
    this.lastVisibility = null;
    this.recentlyLeftRooms.clear();
    this.streamingRouteIndex = 0;
    this.stats.reset();
    this.resetRoomVisits();
    this.clock.reset();
    this.footstepCount = 0;
    this.footsteps?.resetAfterRebase();
    this.streamAround(this.roomGraph.startRoomId);
    this.player.setPosition(this.modularWorld.spawnPoint);
    this.player.setLookRotation(this.modularWorld.spawnYaw);
    const transition = this.modularWorld.updatePlayerPosition(this.player.position);
    this.recordRoomEntry(transition.roomId);
    this.syncWorldDebugSnapshot();
  }

  private showFatalError(error: unknown): void {
    this.events.emit('fatalError', { error });
    if (this.stateMachine.canTransition('fatalError')) {
      this.stateMachine.transition('fatalError');
    }
    this.dispose();
    renderErrorScreen(this.root, error);
  }

  private readState(): GameState {
    return this.stateMachine.state;
  }
}
