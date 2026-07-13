import type { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AmbientDirector } from '../audio/AmbientDirector';
import { FootstepSystem } from '../audio/FootstepSystem';
import { GameAudioEngine } from '../audio/GameAudioEngine';
import { ProceduralAudioBank, hashAudioSeed } from '../audio/ProceduralAudioBank';
import { GameClock } from '../game/GameClock';
import { SessionStats } from '../game/SessionStats';
import { DebugHud } from '../debug/DebugHud';
import { parseDebugOptions } from '../debug/QueryParams';
import { EngineBootstrap } from '../engine/EngineBootstrap';
import { createGameplayScene } from '../engine/SceneFactory';
import { PlayerController } from '../player/PlayerController';
import { SimpleRoomBuilder } from '../rooms/builders/SimpleRoomBuilder';
import type { BuiltRoom } from '../rooms/room.types';
import { renderErrorScreen } from '../ui/ErrorScreen';
import { CreditsDialog } from '../ui/CreditsDialog';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsStore } from '../ui/SettingsStore';
import { TitleScreen } from '../ui/TitleScreen';
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

  private engineBootstrap: EngineBootstrap | null = null;
  private scene: Scene | null = null;
  private room: BuiltRoom | null = null;
  private player: PlayerController | null = null;
  private titleScreen: TitleScreen | null = null;
  private pauseMenu: PauseMenu | null = null;
  private creditsDialog: CreditsDialog | null = null;
  private debugHud: DebugHud | null = null;
  private audioBank: ProceduralAudioBank | null = null;
  private ambientDirector: AmbientDirector | null = null;
  private footsteps: FootstepSystem | null = null;
  private footstepCount = 0;
  private disposed = false;

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
    try {
      this.stateMachine.transition('loading');
      this.engineBootstrap = EngineBootstrap.create(this.canvas);
      this.scene = createGameplayScene(this.engineBootstrap.engine);
      this.room = new SimpleRoomBuilder(this.scene).build();
      this.player = new PlayerController(
        this.scene,
        this.canvas,
        this.room.spawnPoint,
        this.settings.value,
      );
      this.player.setEnabled(false);
      this.installUi();
      this.installSubscriptions();
      window.addEventListener('blur', this.handleWindowBlur);
      window.addEventListener('focus', this.handleWindowFocus);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      if (this.debugOptions.debug) {
        this.debugHud = new DebugHud(this.root, this.scene);
      }

      this.engineBootstrap.start(() => this.renderFrame());
      this.root.querySelector('#boot-status')?.remove();
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

    for (const unsubscribe of this.unsubscribers.splice(0)) {
      unsubscribe();
    }
    this.events.clear();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
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
    this.room?.dispose();
    this.room = null;
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
      this.updateAudioFrame();
    }
    this.updateDebugSnapshot();
    const audioSnapshot = this.audioEngine.snapshot;
    this.debugHud?.update(performance.now(), [
      `AUDIO ${audioSnapshot.state} / ${this.getAudioNodeCount()} NODES`,
      `STEPS ${this.footstepCount}`,
    ]);
    this.scene.render();
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
    const movement = this.player.movementFrame;
    this.root.dataset.playerX = position.x.toFixed(4);
    this.root.dataset.playerY = position.y.toFixed(4);
    this.root.dataset.playerZ = position.z.toFixed(4);
    this.root.dataset.playerMoving = String(movement.moving);
    this.root.dataset.playerSprinting = String(movement.sprinting);
    this.root.dataset.playerGrounded = String(movement.grounded);
    this.root.dataset.elapsedSeconds = this.clock.elapsedSeconds.toFixed(2);
    this.root.dataset.fps = (this.engineBootstrap?.engine.getFps() ?? 0).toFixed(1);
    this.syncAudioDebugSnapshot();
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
    if (!this.room || !this.player) {
      return;
    }

    this.stats.reset();
    this.clock.reset();
    this.footstepCount = 0;
    this.footsteps?.resetAfterRebase();
    this.player.setPosition(this.room.spawnPoint);
    this.player.setLookRotation(0);
    await this.resumeGame();
  }

  private returnToTitle(): void {
    if (!this.room || !this.player || this.stateMachine.state !== 'paused') {
      return;
    }

    this.player.releasePointerLock();
    this.player.setEnabled(false);
    this.player.setPosition(this.room.spawnPoint);
    this.player.setLookRotation(0);
    this.stats.reset();
    this.clock.reset();
    this.footstepCount = 0;
    this.footsteps?.resetAfterRebase();
    this.pauseMenu?.hide();
    this.titleScreen?.show();
    this.titleScreen?.setReady();
    this.stateMachine.transition('title');
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
