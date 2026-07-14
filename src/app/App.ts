import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AmbientDirector } from '../audio/AmbientDirector';
import { FootstepSystem } from '../audio/FootstepSystem';
import { GameAudioEngine } from '../audio/GameAudioEngine';
import { LightingAudioBridge } from '../audio/LightingAudioBridge';
import { ProceduralAudioBank, hashAudioSeed } from '../audio/ProceduralAudioBank';
import { getRoomAudioProfile, toAmbientProfile } from '../audio/RoomAudioProfiles';
import { gameConfig } from '../config/game.config';
import { tensionConfig } from '../config/tension.config';
import { GameClock } from '../game/GameClock';
import { SessionStats } from '../game/SessionStats';
import { DebugHud } from '../debug/DebugHud';
import { parseDebugOptions } from '../debug/QueryParams';
import { EngineBootstrap } from '../engine/EngineBootstrap';
import { createGameplayScene } from '../engine/SceneFactory';
import { PlayerController } from '../player/PlayerController';
import { assertValidRoomGraph, generateRoomGraph } from '../procedural/RoomGraphGenerator';
import {
  ADVANCED_ROOM_DEFINITION_IDS,
  getRoomDefinition,
  getRoomDefinitions,
} from '../procedural/RoomCatalog';
import { hashSeed } from '../procedural/SeedBank';
import type { RoomGraph, RoomInstance } from '../procedural/procedural.types';
import { PixelRenderPipeline } from '../rendering/PixelRenderPipeline';
import { QualityManager } from '../rendering/QualityManager';
import { LightingDirector, type LightingFrameSnapshot } from '../lighting/LightingDirector';
import { FIXTURE_FLICKER_PROFILES, type FixtureFlickerProfile } from '../lighting/lighting.types';
import { ModularWorld } from '../rooms/ModularWorld';
import type { BuiltModularRoom } from '../rooms/rendering/rendering.types';
import { TensionDirector } from '../tension/TensionDirector';
import {
  TENSION_EVENT_TYPES,
  type TensionEvent,
  type TensionEventType,
  type TensionSnapshot,
  type TensionUpdateInput,
  type TensionUpdateResult,
} from '../tension/tension.types';
import { renderErrorScreen } from '../ui/ErrorScreen';
import { CreditsDialog } from '../ui/CreditsDialog';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsStore, type GameSettings } from '../ui/SettingsStore';
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
  private readonly qualityManager = new QualityManager(
    this.debugOptions.quality ?? this.settings.value.quality,
  );
  private readonly unsubscribers: (() => void)[] = [];
  private readonly audioEngine: GameAudioEngine;
  private readonly audioLocalForward = Vector3.Forward();
  private readonly audioForward = Vector3.Zero();
  private readonly floatingOrigin = new FloatingOrigin({
    rebaseThreshold: this.debugOptions.debug ? 40 : gameConfig.world.floatingOriginThreshold,
  });

  private engineBootstrap: EngineBootstrap | null = null;
  private pixelPipeline: PixelRenderPipeline | null = null;
  private scene: Scene | null = null;
  private roomGraph: RoomGraph | null = null;
  private modularWorld: ModularWorld | null = null;
  private chunkStreamer: ChunkStreamer<BuiltModularRoom> | null = null;
  private visibilityGuard: StreamingVisibilityGuard | null = null;
  private lightingDirector: LightingDirector | null = null;
  private lightingSnapshot: LightingFrameSnapshot | null = null;
  private tensionDirector: TensionDirector | null = null;
  private tensionSnapshot: TensionSnapshot | null = null;
  private lastVisibility: StreamingVisibilityResult | null = null;
  private roomsById = new Map<string, RoomInstance>();
  private readonly visitedDefinitionIds = new Set<string>();
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
  private lightingAudioBridge: LightingAudioBridge | null = null;
  private footsteps: FootstepSystem | null = null;
  private footstepCount = 0;
  private layoutSignature = '';
  private currentRoomDefinitionId: string | null = null;
  private advancedRoomCount = 0;
  private debugStreamingAdvanceToken = 0;
  private debugTensionElapsedSeconds: number | null = null;
  private lastMovementAtSeconds = 0;
  private lastAppliedTensionRevision = -1;
  private lastAppliedTensionIntensity = -1;
  private lastPixelEffectKey = '';
  private readonly tensionLightingRoomIds = new Set<string>();
  private readonly tensionFixtureIds = new Set<string>();
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

  private readonly handleDebugLightingOverride = (event: Event): void => {
    if (!this.debugOptions.debug || !this.lightingDirector || !this.modularWorld) {
      return;
    }
    const requested = (event as CustomEvent<{ profile?: string | null }>).detail?.profile ?? null;
    const profile: FixtureFlickerProfile | null =
      requested !== null && FIXTURE_FLICKER_PROFILES.includes(requested as FixtureFlickerProfile)
        ? (requested as FixtureFlickerProfile)
        : null;
    const roomId = this.modularWorld.activeRoomId;
    if (!roomId) {
      return;
    }
    this.lightingDirector.setRoomOverride(roomId, profile === null ? null : { profile });
    this.root.dataset.debugLightingOverride = profile ?? 'none';
    this.updateLightingFrame();
    if (this.lightingSnapshot) {
      this.lightingAudioBridge?.update(this.lightingSnapshot);
    }
  };

  private readonly handleDebugTensionEvent = (event: Event): void => {
    if (!this.debugOptions.debug || !this.tensionDirector) {
      return;
    }
    const detail = (event as CustomEvent<{ type?: string | null; elapsedSeconds?: number }>).detail;
    if (Number.isFinite(detail?.elapsedSeconds)) {
      this.debugTensionElapsedSeconds = Math.max(0, detail?.elapsedSeconds ?? 0);
    }
    const requested = detail?.type ?? null;
    const type = TENSION_EVENT_TYPES.includes(requested as TensionEventType)
      ? (requested as TensionEventType)
      : null;
    const input = this.createTensionInput();
    const result =
      type === null
        ? this.tensionDirector.clearTransientEvents(input)
        : this.tensionDirector.forceEvent(type, input);
    this.root.dataset.debugTensionEvent = type ?? 'none';
    this.applyTensionResult(result);
    this.updateLightingFrame();
    this.updateAudioFrame();
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
      this.engineBootstrap = EngineBootstrap.create(this.canvas, { resizeOwnership: 'external' });
      this.pixelPipeline = PixelRenderPipeline.create({
        canvas: this.canvas,
        engine: this.engineBootstrap.engine,
        quality: this.qualityManager.current,
      });
      this.pixelPipeline.setUserEffects({
        dithering: this.settings.value.dithering,
        reducedFlashing: this.settings.value.reducedFlashing,
      });
      this.scene = createGameplayScene(this.engineBootstrap.engine);
      this.scene.fogEnd = this.qualityManager.current.fogEnd;
      this.lightingDirector = new LightingDirector(this.scene, {
        lightBudget: this.qualityManager.current.lightBudget,
        reducedFlashing: this.settings.value.reducedFlashing,
      });
      this.tensionDirector = new TensionDirector(this.debugOptions.seed);
      this.roomGraph = generateRoomGraph({
        seed: this.debugOptions.seed,
        targetRooms: gameConfig.world.logicalRoomCount,
        frontierStrategy: 'deep',
      });
      assertValidRoomGraph(this.roomGraph);
      this.roomsById = new Map(this.roomGraph.rooms.map((room) => [room.id, room]));
      const advancedDefinitionIds = new Set<string>(ADVANCED_ROOM_DEFINITION_IDS);
      this.advancedRoomCount = this.roomGraph.rooms.filter((room) =>
        advancedDefinitionIds.has(room.definitionId),
      ).length;
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
      this.modularWorld.materialLibrary.applyQuality({
        normalMaps: this.qualityManager.current.normalMaps,
        anisotropy: this.qualityManager.current.anisotropy,
      });
      this.syncRenderingSnapshot();
      this.modularWorld.setGraph(this.roomGraph);
      this.visibilityGuard = new StreamingVisibilityGuard(
        this.roomGraph,
        this.modularWorld,
        this.scene,
        { fogEnd: this.qualityManager.current.fogEnd },
      );
      this.chunkStreamer = this.createChunkStreamer();
      const textureReadiness = await this.modularWorld.materialLibrary.whenAllTexturesSettled();
      this.syncRenderingSnapshot();
      if (!textureReadiness.criticalReady) {
        const failures = textureReadiness.failures
          .filter((failure) => failure.critical)
          .map((failure) => `${failure.id}: ${failure.message}`)
          .join('; ');
        throw new Error(`No se pudieron cargar las texturas críticas de Level 0. ${failures}`);
      }
      this.streamAround(this.roomGraph.startRoomId);
      this.player = new PlayerController(
        this.scene,
        this.canvas,
        this.modularWorld.spawnPoint,
        this.settings.value,
      );
      this.player.setLookRotation(this.modularWorld.spawnYaw);
      this.player.setEnabled(false);
      this.pixelPipeline.attach(this.player.camera);
      this.syncRenderingSnapshot();
      const initialTransition = this.modularWorld.updatePlayerPosition(this.player.position);
      this.recordRoomEntry(initialTransition.roomId);
      this.updateTensionFrame();
      this.updateLightingFrame();
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
        this.root.addEventListener(
          'backrooms:debug-lighting-override',
          this.handleDebugLightingOverride,
        );
        this.root.addEventListener('backrooms:debug-tension-event', this.handleDebugTensionEvent);
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
    this.root.removeEventListener(
      'backrooms:debug-lighting-override',
      this.handleDebugLightingOverride,
    );
    this.root.removeEventListener('backrooms:debug-tension-event', this.handleDebugTensionEvent);
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
    this.lightingAudioBridge?.dispose();
    this.lightingAudioBridge = null;
    this.ambientDirector?.dispose();
    this.ambientDirector = null;
    this.audioBank?.dispose();
    this.audioBank = null;
    this.pixelPipeline?.dispose();
    this.pixelPipeline = null;
    this.tensionDirector?.dispose();
    this.tensionDirector = null;
    this.tensionSnapshot = null;
    this.lightingDirector?.dispose();
    this.lightingDirector = null;
    this.lightingSnapshot = null;
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
    this.visitedDefinitionIds.clear();
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
        if (frame.distance > 0) {
          this.lastMovementAtSeconds = this.clock.elapsedSeconds;
        }
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
        this.applyRenderingSettings(current, changedKeys.includes('quality'));
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
      this.updateLightingFrame();
      this.updateTensionFrame();
      this.updateAudioFrame();
    }
    this.updateDebugSnapshot();
    const audioSnapshot = this.audioEngine.snapshot;
    const renderMetrics = this.pixelPipeline?.metrics;
    this.debugHud?.update(performance.now(), [
      `AUDIO ${audioSnapshot.state} / ${this.getAudioNodeCount()} NODES`,
      `STEPS ${this.footstepCount}`,
      `ROOM ${this.modularWorld?.activeRoomId ?? 'none'} / ${this.stats.snapshot(this.clock.elapsedSeconds).roomsVisited} VISITED`,
      `STREAM ${this.chunkStreamer?.metrics.activeRoomCount ?? 0} ACTIVE / ${this.chunkStreamer?.metrics.preloadRoomCount ?? 0} PRELOAD / ${this.modularWorld?.pooledRoomCount ?? 0} POOLED`,
      `ORIGIN ${this.floatingOrigin.metrics.rebaseCount} REBASES`,
      `RENDER ${this.qualityManager.presetName.toUpperCase()} ${renderMetrics?.bufferWidth ?? 0}x${renderMetrics?.bufferHeight ?? 0}`,
      `LIGHTS ${this.lightingSnapshot?.metrics.pool.activeLightCount ?? 0}/${this.lightingSnapshot?.metrics.pool.activeBudget ?? 0} / ${this.lightingSnapshot?.metrics.animatedFixtureCount ?? 0} FLICKER`,
      `TENSION ${this.tensionSnapshot?.phase.toUpperCase() ?? 'OFF'} ${(this.tensionSnapshot?.intensity ?? 0).toFixed(2)} / ${this.tensionSnapshot?.activeEventType ?? 'QUIET'}`,
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
    this.visitedDefinitionIds.add(instance.definitionId);
    this.applyRoomAudioProfile(instance.definitionId);
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

  private applyRoomAudioProfile(definitionId: string): void {
    const definition = getRoomDefinition(definitionId);
    const profile = getRoomAudioProfile(definition.audioProfile);
    const ambientProfile = toAmbientProfile(profile);
    this.ambientDirector?.setProfile(
      {
        ...ambientProfile,
        silenceFactor: Math.max(
          ambientProfile.silenceFactor,
          this.tensionSnapshot?.silenceFactor ?? 0,
        ),
      },
      0.8,
    );
    this.ambientDirector?.setTension(this.tensionSnapshot?.intensity ?? 0, 1.2);
    this.footsteps?.setWetness(profile.wetness);
    this.root.dataset.roomAudioProfile = profile.reverbPreset;
    this.root.dataset.roomAudioProfileId = definition.audioProfile;
    this.root.dataset.ambientSilenceFactor = Math.max(
      ambientProfile.silenceFactor,
      this.tensionSnapshot?.silenceFactor ?? 0,
    ).toFixed(4);
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

  private createTensionInput(): TensionUpdateInput {
    const elapsedSeconds = this.debugTensionElapsedSeconds ?? this.clock.elapsedSeconds;
    const definition = this.currentRoomDefinitionId
      ? getRoomDefinition(this.currentRoomDefinitionId)
      : null;
    const world = this.modularWorld;
    const visible = new Set([
      ...(this.lastVisibility?.visibleRoomIds ?? []),
      ...(this.lastVisibility?.visibleEntranceRoomIds ?? []),
    ]);
    const shifted = new Set(world?.spatialAnomalyRoomIds ?? []);
    const layoutShiftCandidates = this.lastVisibility
      ? (world?.loadedRoomIds ?? [])
          .filter(
            (roomId) =>
              roomId !== world?.activeRoomId &&
              !visible.has(roomId) &&
              !this.recentlyLeftRooms.has(roomId) &&
              !shifted.has(roomId),
          )
          .sort()
      : [];
    return {
      elapsedSeconds,
      uniqueRooms: this.stats.snapshot(elapsedSeconds).roomsVisited,
      currentRoomId: world?.activeRoomId ?? null,
      currentDefinitionId: this.currentRoomDefinitionId,
      currentDefinitionTags: definition?.tags ?? [],
      playerSpeed: this.player?.movementFrame.horizontalSpeed ?? 0,
      secondsSinceMovement: Math.max(0, elapsedSeconds - this.lastMovementAtSeconds),
      quality: this.qualityManager.presetName,
      reducedFlashing: this.settings.value.reducedFlashing,
      exitDistance: null,
      layoutShiftCandidates,
    };
  }

  private updateTensionFrame(): void {
    if (!this.tensionDirector) {
      return;
    }
    this.applyTensionResult(this.tensionDirector.update(this.createTensionInput()));
  }

  private applyTensionResult(result: TensionUpdateResult): void {
    for (const event of result.startedEvents) {
      this.root.dataset.tensionLastEventTarget = event.targetRoomId;
      this.root.dataset.tensionLastEventType = event.type;
      if (event.type === 'layout-shift') {
        this.applySpatialTensionEvent(event);
      }
    }

    const previousRevision = this.tensionSnapshot?.revision ?? -1;
    this.tensionSnapshot = result.snapshot;
    if (
      result.snapshot.revision !== this.lastAppliedTensionRevision ||
      result.snapshot.revision !== previousRevision
    ) {
      this.syncTensionLightingEffects(result.snapshot);
      if (this.currentRoomDefinitionId) {
        this.applyRoomAudioProfile(this.currentRoomDefinitionId);
      }
      this.lastAppliedTensionRevision = result.snapshot.revision;
      this.updateLightingFrame();
    }

    if (Math.abs(result.snapshot.intensity - this.lastAppliedTensionIntensity) >= 0.015) {
      this.lastAppliedTensionIntensity = result.snapshot.intensity;
      this.ambientDirector?.setTension(result.snapshot.intensity, 1.6);
      this.events.emit('tensionChanged', {
        phase: result.snapshot.phase,
        intensity: result.snapshot.intensity,
        activeEventType: result.snapshot.activeEventType,
      });
    }
    this.applyTensionPixelEffect(result.snapshot);
    this.syncTensionDebugSnapshot();
  }

  private applySpatialTensionEvent(event: TensionEvent): void {
    const world = this.modularWorld;
    if (!world) {
      return;
    }
    const visible = new Set([
      ...(this.lastVisibility?.visibleRoomIds ?? []),
      ...(this.lastVisibility?.visibleEntranceRoomIds ?? []),
    ]);
    if (
      event.targetRoomId === world.activeRoomId ||
      visible.has(event.targetRoomId) ||
      !world.isRoomLoaded(event.targetRoomId)
    ) {
      throw new Error(
        `Tension layout shift target ${event.targetRoomId} was not safely out of view.`,
      );
    }
    world.setRoomSpatialAnomaly(event.targetRoomId, true);
  }

  private syncTensionLightingEffects(snapshot: TensionSnapshot): void {
    const lighting = this.lightingDirector;
    const world = this.modularWorld;
    if (!lighting || !world) {
      return;
    }

    const loadedAnchors = world.lightAnchors;
    const loadedRoomIds = new Set(loadedAnchors.map((anchor) => anchor.roomId));
    const loadedFixtureIds = new Set(loadedAnchors.map((anchor) => anchor.id));
    for (const fixtureId of this.tensionFixtureIds) {
      if (loadedFixtureIds.has(fixtureId)) {
        lighting.setFixtureOverride(fixtureId, null);
      }
    }
    for (const roomId of this.tensionLightingRoomIds) {
      if (loadedRoomIds.has(roomId)) {
        lighting.setRoomOverride(roomId, null);
      }
    }
    this.tensionFixtureIds.clear();
    this.tensionLightingRoomIds.clear();

    const event = snapshot.activeEvents[0];
    if (!event || !loadedRoomIds.has(event.targetRoomId)) {
      return;
    }
    if (event.type === 'light-dip') {
      lighting.setRoomOverride(event.targetRoomId, {
        profile: 'slow-fluctuation',
        visualScale: tensionConfig.effects.lightDipVisualScale,
        audioScale: tensionConfig.effects.lightDipAudioScale,
      });
      this.tensionLightingRoomIds.add(event.targetRoomId);
      return;
    }
    if (event.type !== 'blackout') {
      return;
    }

    lighting.setRoomOverride(event.targetRoomId, { profile: 'off', enabled: true });
    this.tensionLightingRoomIds.add(event.targetRoomId);
    const playerPosition = this.player?.position;
    const beacon = loadedAnchors
      .filter((anchor) => anchor.roomId === event.targetRoomId && anchor.enabled)
      .sort((left, right) => {
        if (!playerPosition) {
          return right.fixtureIndex - left.fixtureIndex;
        }
        return (
          Vector3.DistanceSquared(right.node.getAbsolutePosition(), playerPosition) -
          Vector3.DistanceSquared(left.node.getAbsolutePosition(), playerPosition)
        );
      })[0];
    if (beacon) {
      lighting.setFixtureOverride(beacon.id, {
        profile: 'stable',
        enabled: true,
        visualScale: tensionConfig.effects.blackoutBeaconVisualScale,
        audioScale: 0,
      });
      this.tensionFixtureIds.add(beacon.id);
    }
  }

  private applyTensionPixelEffect(snapshot: TensionSnapshot): void {
    const phase =
      snapshot.visualEffectStrength > 0 ? Math.floor(snapshot.visualEffectPhase * 12) / 12 : 0;
    const key = `${snapshot.visualEffectStrength.toFixed(5)}:${phase.toFixed(3)}`;
    if (key === this.lastPixelEffectKey) {
      return;
    }
    this.lastPixelEffectKey = key;
    this.pixelPipeline?.setContextEffects({
      anomalyStrength: snapshot.visualEffectStrength,
      anomalyPhase: phase,
    });
  }

  private syncTensionDebugSnapshot(): void {
    const snapshot = this.tensionSnapshot;
    this.root.dataset.tensionPhase = snapshot?.phase ?? 'orientation';
    this.root.dataset.tensionIntensity = (snapshot?.intensity ?? 0).toFixed(4);
    this.root.dataset.tensionActiveEvent = snapshot?.activeEventType ?? 'none';
    this.root.dataset.tensionEventCount = String(snapshot?.eventCount ?? 0);
    this.root.dataset.tensionBlackoutCount = String(snapshot?.blackoutCount ?? 0);
    this.root.dataset.tensionLayoutShifts = String(snapshot?.layoutShiftCount ?? 0);
    this.root.dataset.tensionSilenceFactor = (snapshot?.silenceFactor ?? 0).toFixed(4);
    this.root.dataset.tensionVisualStrength = (snapshot?.visualEffectStrength ?? 0).toFixed(5);
    this.root.dataset.tensionNextEventAt = (snapshot?.nextEventAtSeconds ?? 0).toFixed(2);
    this.root.dataset.tensionSecondsWithoutVariation = (
      snapshot?.secondsWithoutVariation ?? 0
    ).toFixed(2);
    this.root.dataset.worldSpatialAnomalies = String(this.modularWorld?.spatialAnomalyCount ?? 0);
    this.root.dataset.worldSpatialAnomalyRooms =
      this.modularWorld?.spatialAnomalyRoomIds.join(',') ?? '';
  }

  private updateLightingFrame(): void {
    const player = this.player;
    const world = this.modularWorld;
    const director = this.lightingDirector;
    if (!player || !world || !director) {
      return;
    }
    this.lightingSnapshot = director.update({
      anchors: world.lightAnchors,
      anchorRevision: world.lightAnchorRevision,
      activeRoomId: world.activeRoomId,
      visibleRoomIds: this.lastVisibility?.visibleRoomIds ?? [],
      playerPosition: player.position,
      absoluteTimeSeconds: this.clock.elapsedSeconds,
    });
    this.syncLightingDebugSnapshot();
  }

  private syncLightingDebugSnapshot(): void {
    const snapshot = this.lightingSnapshot;
    const metrics = snapshot?.metrics;
    const pool = metrics?.pool;
    this.root.dataset.lightPoolCapacity = String(pool?.capacity ?? 0);
    this.root.dataset.lightPoolBudget = String(pool?.activeBudget ?? 0);
    this.root.dataset.lightPoolActive = String(pool?.activeLightCount ?? 0);
    this.root.dataset.activeRoomLightProxies = String(metrics?.activeRoomProxyCount ?? 0);
    this.root.dataset.lightPoolReassignments = String(pool?.reassignments ?? 0);
    this.root.dataset.lightingFixtures = String(metrics?.fixtureCount ?? 0);
    this.root.dataset.lightingAnimatedFixtures = String(metrics?.animatedFixtureCount ?? 0);
    this.root.dataset.lightingEmitterUploads = String(metrics?.emitterUploadCount ?? 0);
    this.root.dataset.lightingReducedFlashing = String(metrics?.reducedFlashing ?? false);
    this.root.dataset.lightingAudioIntensity = (snapshot?.globalAudioIntensity ?? 0).toFixed(4);
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
    if (this.lightingSnapshot) {
      this.lightingAudioBridge?.update(this.lightingSnapshot);
    }
    if (!this.audioEngine.context) {
      return;
    }

    player.camera.computeWorldMatrix();
    const position = player.camera.globalPosition;
    player.camera.getDirectionToRef(this.audioLocalForward, this.audioForward);
    this.audioEngine.updateListener({ position, forward: this.audioForward });
    this.syncAudioDebugSnapshot();
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
    this.root.dataset.roomDefinitionCount = String(getRoomDefinitions().length);
    this.root.dataset.advancedRoomCount = String(this.advancedRoomCount);
    this.root.dataset.connectionCount = String(graph?.connections.length ?? 0);
    this.root.dataset.generationAttempts = String(graph?.generationStats.attemptedPlacements ?? 0);
    this.root.dataset.generationRejections = String(graph?.generationStats.rejectedOverlaps ?? 0);
    this.root.dataset.sealedSockets = String(graph?.generationStats.sealedSockets ?? 0);
    this.root.dataset.currentRoomId = world?.activeRoomId ?? '';
    this.root.dataset.currentRoomDefinition = this.currentRoomDefinitionId ?? '';
    this.root.dataset.visitedRoomDefinitions = [...this.visitedDefinitionIds].sort().join(',');
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
    this.syncRenderingSnapshot();
  }

  private applyRenderingSettings(settings: Readonly<GameSettings>, updatePreset: boolean): void {
    if (updatePreset) {
      this.qualityManager.setPreset(settings.quality);
    }
    const quality = this.qualityManager.current;
    if (this.pixelPipeline?.quality.name !== quality.name) {
      this.pixelPipeline?.setQuality(quality);
    }
    this.pixelPipeline?.setUserEffects({
      dithering: settings.dithering,
      reducedFlashing: settings.reducedFlashing,
    });
    this.modularWorld?.materialLibrary.applyQuality({
      normalMaps: quality.normalMaps,
      anisotropy: quality.anisotropy,
    });
    this.lightingDirector?.setLightBudget(quality.lightBudget);
    this.lightingDirector?.setReducedFlashing(settings.reducedFlashing);
    this.lightingAudioBridge?.setVoiceBudget(this.getLightingAudioVoiceBudget());
    if (this.scene) {
      this.scene.fogEnd = quality.fogEnd;
    }
    this.visibilityGuard?.setFogEnd(quality.fogEnd);
    this.updateTensionFrame();
    this.updateLightingFrame();
    this.syncRenderingSnapshot();
    window.requestAnimationFrame(() => {
      if (!this.disposed) {
        this.syncRenderingSnapshot();
      }
    });
  }

  private syncRenderingSnapshot(): void {
    const quality = this.qualityManager.current;
    const effects = this.pixelPipeline?.effects;
    const metrics = this.pixelPipeline?.metrics;
    const textures = this.modularWorld?.materialLibrary.readiness;
    this.root.dataset.qualityPreset = quality.name;
    this.root.dataset.renderInternalHeight = String(quality.internalHeight);
    this.root.dataset.renderBufferWidth = String(metrics?.bufferWidth ?? 0);
    this.root.dataset.renderBufferHeight = String(metrics?.bufferHeight ?? 0);
    this.root.dataset.renderDithering = String(effects?.dithering ?? quality.dithering);
    this.root.dataset.renderGrainStrength = String(effects?.grainStrength ?? quality.grainStrength);
    this.root.dataset.renderAnomalyStrength = (effects?.anomalyStrength ?? 0).toFixed(5);
    this.root.dataset.renderNormalMaps = String(quality.normalMaps);
    this.root.dataset.renderAnisotropy = String(quality.anisotropy);
    this.root.dataset.renderLightBudget = String(quality.lightBudget);
    this.root.dataset.fogStart = String(this.scene?.fogStart ?? 0);
    this.root.dataset.fogEnd = String(this.scene?.fogEnd ?? quality.fogEnd);
    this.root.dataset.texturesCriticalReady = String(textures?.criticalReady ?? false);
    this.root.dataset.texturesSettled = String(textures?.allSettled ?? false);
    this.root.dataset.texturesReady = String(
      (textures?.allSettled ?? false) && (textures?.criticalReady ?? false),
    );
    this.root.dataset.textureReadyCount = String(textures?.readyCount ?? 0);
    this.root.dataset.textureFailedCount = String(textures?.failedCount ?? 0);
  }

  private syncAudioDebugSnapshot(): void {
    const snapshot = this.audioEngine.snapshot;
    this.root.dataset.audioState = snapshot.state === 'idle' ? 'uninitialized' : snapshot.state;
    this.root.dataset.audioNodeCount = String(this.getAudioNodeCount());
    this.root.dataset.audioMixState = snapshot.paused || !snapshot.focused ? 'paused' : 'active';
    this.root.dataset.footstepCount = String(this.footstepCount);
    this.root.dataset.footstepPendingDistance = (this.footsteps?.pendingDistance ?? 0).toFixed(3);
    const lightingAudio = this.lightingAudioBridge?.metrics;
    const ambient = this.ambientDirector?.debugSnapshot;
    this.root.dataset.lightingAudioVoices = String(lightingAudio?.activeVoiceCount ?? 0);
    this.root.dataset.lightingAudioVoiceBudget = String(lightingAudio?.voiceBudget ?? 0);
    this.root.dataset.lightingAudioPops = String(lightingAudio?.popCount ?? 0);
    this.root.dataset.lightingAudioModulation = (lightingAudio?.globalModulation ?? 0).toFixed(4);
    this.root.dataset.ambientTension = (
      ambient?.tension ??
      this.tensionSnapshot?.intensity ??
      0
    ).toFixed(4);
    this.root.dataset.ambientSilenceFactor = (
      ambient?.silenceFactor ??
      this.tensionSnapshot?.silenceFactor ??
      0
    ).toFixed(4);
  }

  private getAudioNodeCount(): number {
    return (
      this.audioEngine.nodeCount +
      (this.ambientDirector?.nodeCount ?? 0) +
      (this.lightingAudioBridge?.nodeCount ?? 0) +
      (this.footsteps?.activeVoiceCount ?? 0) * 3
    );
  }

  private getLightingAudioVoiceBudget(): 2 | 3 | 4 {
    switch (this.qualityManager.presetName) {
      case 'low':
        return 2;
      case 'default':
        return 3;
      case 'high':
        return 4;
    }
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

    const initialAudioProfile = this.currentRoomDefinitionId
      ? toAmbientProfile(
          getRoomAudioProfile(getRoomDefinition(this.currentRoomDefinitionId).audioProfile),
        )
      : undefined;
    const bank = new ProceduralAudioBank(context, { seed: this.debugOptions.seed });
    const ambientDirector = new AmbientDirector(
      {
        context,
        ambienceBus: ambienceBus.input,
        lightsBus: lightsBus.input,
        eventsBus: eventsBus.input,
      },
      bank,
      initialAudioProfile === undefined
        ? { autoPops: false }
        : { autoPops: false, profile: initialAudioProfile },
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
    this.lightingAudioBridge = new LightingAudioBridge(
      { context, lightsBus: lightsBus.input },
      bank,
      ambientDirector,
      this.getLightingAudioVoiceBudget(),
    );
    if (this.lightingSnapshot) {
      this.lightingAudioBridge.update(this.lightingSnapshot);
    }
    ambientDirector.setPaused(paused);
    footsteps.setPaused(paused);
    if (this.currentRoomDefinitionId) {
      this.applyRoomAudioProfile(this.currentRoomDefinitionId);
    }
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
    this.visitedDefinitionIds.clear();
    this.resetRoomVisits();
    this.clock.reset();
    this.tensionDirector?.reset();
    this.tensionSnapshot = null;
    this.debugTensionElapsedSeconds = null;
    this.lastMovementAtSeconds = 0;
    this.lastAppliedTensionRevision = -1;
    this.lastAppliedTensionIntensity = -1;
    this.lastPixelEffectKey = '';
    this.tensionLightingRoomIds.clear();
    this.tensionFixtureIds.clear();
    this.modularWorld.clearSpatialAnomalies();
    this.pixelPipeline?.setContextEffects({ anomalyStrength: 0, anomalyPhase: 0 });
    this.ambientDirector?.setTension(0, 0.5);
    this.lightingDirector?.reset();
    this.lightingSnapshot = null;
    this.lightingAudioBridge?.reset();
    this.footstepCount = 0;
    this.footsteps?.resetAfterRebase();
    this.streamAround(this.roomGraph.startRoomId);
    this.player.setPosition(this.modularWorld.spawnPoint);
    this.player.setLookRotation(this.modularWorld.spawnYaw);
    const transition = this.modularWorld.updatePlayerPosition(this.player.position);
    this.recordRoomEntry(transition.roomId);
    this.updateTensionFrame();
    this.updateLightingFrame();
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
