import type { SeedInput } from '../procedural/procedural.types';
import { SeedBank, type SeededRandom } from '../procedural/SeedBank';
import { tensionConfig } from '../config/tension.config';
import type {
  TensionEvent,
  TensionEventFamily,
  TensionEventType,
  TensionPhase,
  TensionSnapshot,
  TensionUpdateInput,
  TensionUpdateResult,
} from './tension.types';

interface EventCandidate {
  readonly type: TensionEventType;
  readonly targetRoomId: string;
  readonly weight: number;
}

const EMPTY_EVENTS: readonly TensionEvent[] = Object.freeze([]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function phaseAt(elapsedSeconds: number): TensionPhase {
  const phases = tensionConfig.phases;
  if (elapsedSeconds < phases.orientationEndsAtSeconds) return 'orientation';
  if (elapsedSeconds < phases.monotonyEndsAtSeconds) return 'monotony';
  if (elapsedSeconds < phases.disorientationEndsAtSeconds) return 'disorientation';
  if (elapsedSeconds < phases.escalationEndsAtSeconds) return 'escalation';
  return 'resolution';
}

function familyOf(type: TensionEventType): TensionEventFamily {
  switch (type) {
    case 'light-dip':
    case 'blackout':
      return 'light';
    case 'silence':
      return 'audio';
    case 'palette-shift':
      return 'visual';
    case 'repetition-echo':
      return 'repetition';
    case 'layout-shift':
      return 'spatial';
  }
}

function assertInput(input: TensionUpdateInput): void {
  if (!Number.isFinite(input.elapsedSeconds) || input.elapsedSeconds < 0) {
    throw new RangeError('Tension elapsedSeconds must be finite and non-negative.');
  }
  if (!Number.isInteger(input.uniqueRooms) || input.uniqueRooms < 0) {
    throw new RangeError('Tension uniqueRooms must be a non-negative integer.');
  }
  if (!Number.isFinite(input.playerSpeed) || input.playerSpeed < 0) {
    throw new RangeError('Tension playerSpeed must be finite and non-negative.');
  }
  if (!Number.isFinite(input.secondsSinceMovement) || input.secondsSinceMovement < 0) {
    throw new RangeError('Tension secondsSinceMovement must be finite and non-negative.');
  }
}

/**
 * Deterministic environmental scheduler. Randomness is consumed only when a
 * room transition starts an event or schedules its next cooldown, never per frame.
 */
export class TensionDirector {
  private readonly seedBank: SeedBank;
  private rng: SeededRandom;
  private activeEvent: TensionEvent | null = null;
  private readonly recentDefinitions: string[] = [];
  private readonly cooldownUntilSeconds = new Map<TensionEventFamily, number>();
  private readonly cooldownUntilRooms = new Map<TensionEventFamily, number>();
  private history: TensionEvent[] = [];
  private previousRoomId: string | null = null;
  private lastVariationAtSeconds = 0;
  private lastElapsedSeconds = 0;
  private nextEventAtSeconds: number;
  private eventSequence = 0;
  private roomSequence = 0;
  private totalEventCount = 0;
  private blackoutCount = 0;
  private layoutShiftCount = 0;
  private lastEventType: TensionEventType | null = null;
  private revision = 0;
  private disposed = false;
  private snapshot: TensionSnapshot;

  public constructor(seed: SeedInput) {
    this.seedBank = new SeedBank(seed);
    this.rng = this.seedBank.createRng('tension', 'director');
    this.nextEventAtSeconds =
      tensionConfig.phases.orientationEndsAtSeconds +
      this.range(tensionConfig.scheduling.firstEventDelaySeconds);
    this.snapshot = this.createSnapshot({
      elapsedSeconds: 0,
      uniqueRooms: 0,
      currentRoomId: null,
      currentDefinitionId: null,
      currentDefinitionTags: [],
      playerSpeed: 0,
      secondsSinceMovement: 0,
      quality: 'default',
      reducedFlashing: false,
      exitDistance: null,
      layoutShiftCandidates: [],
    });
  }

  public get current(): TensionSnapshot {
    return this.snapshot;
  }

  public get eventHistory(): readonly TensionEvent[] {
    return Object.freeze([...this.history]);
  }

  public update(input: TensionUpdateInput): TensionUpdateResult {
    this.assertActive();
    assertInput(input);
    if (input.elapsedSeconds < this.lastElapsedSeconds) {
      throw new RangeError('Tension time cannot move backwards without reset.');
    }

    const started: TensionEvent[] = [];
    const ended: TensionEvent[] = [];
    this.expireEvent(input.elapsedSeconds, ended);
    const roomChanged = this.recordRoomTransition(input);
    if (
      roomChanged &&
      this.activeEvent !== null &&
      this.activeEvent.targetRoomId !== input.currentRoomId
    ) {
      this.expireEvent(input.elapsedSeconds, ended, true);
    }
    if (
      roomChanged &&
      this.activeEvent === null &&
      input.elapsedSeconds >= this.nextEventAtSeconds &&
      phaseAt(input.elapsedSeconds) !== 'orientation'
    ) {
      const candidate = this.chooseAutomaticCandidate(input);
      if (candidate === null) {
        this.nextEventAtSeconds = input.elapsedSeconds + tensionConfig.scheduling.retryDelaySeconds;
      } else {
        this.startEvent(candidate.type, candidate.targetRoomId, input, false, started);
      }
    }

    this.lastElapsedSeconds = input.elapsedSeconds;
    this.snapshot = this.createSnapshot(input);
    return Object.freeze({
      snapshot: this.snapshot,
      startedEvents: Object.freeze(started),
      endedEvents: Object.freeze(ended),
    });
  }

  /** Test/debug-safe deterministic hook; production scheduling never calls it. */
  public forceEvent(type: TensionEventType, input: TensionUpdateInput): TensionUpdateResult {
    this.assertActive();
    assertInput(input);
    if (input.elapsedSeconds < this.lastElapsedSeconds) {
      throw new RangeError('Tension time cannot move backwards without reset.');
    }
    const ended: TensionEvent[] = [];
    this.expireEvent(input.elapsedSeconds, ended, true);
    this.recordRoomTransition(input);
    const targetRoomId =
      type === 'layout-shift' ? input.layoutShiftCandidates[0] : input.currentRoomId;
    if (!targetRoomId) {
      throw new Error(`Cannot force ${type} without a valid target room.`);
    }
    const started: TensionEvent[] = [];
    this.startEvent(type, targetRoomId, input, true, started);
    this.lastElapsedSeconds = input.elapsedSeconds;
    this.snapshot = this.createSnapshot(input);
    return Object.freeze({
      snapshot: this.snapshot,
      startedEvents: Object.freeze(started),
      endedEvents: Object.freeze(ended),
    });
  }

  public clearTransientEvents(input: TensionUpdateInput): TensionUpdateResult {
    this.assertActive();
    assertInput(input);
    const ended: TensionEvent[] = [];
    this.expireEvent(input.elapsedSeconds, ended, true);
    this.lastElapsedSeconds = input.elapsedSeconds;
    this.snapshot = this.createSnapshot(input);
    return Object.freeze({
      snapshot: this.snapshot,
      startedEvents: EMPTY_EVENTS,
      endedEvents: Object.freeze(ended),
    });
  }

  public reset(): void {
    this.assertActive();
    this.rng = this.seedBank.createRng('tension', 'director');
    this.activeEvent = null;
    this.recentDefinitions.length = 0;
    this.cooldownUntilSeconds.clear();
    this.cooldownUntilRooms.clear();
    this.history = [];
    this.previousRoomId = null;
    this.lastVariationAtSeconds = 0;
    this.lastElapsedSeconds = 0;
    this.eventSequence = 0;
    this.roomSequence = 0;
    this.totalEventCount = 0;
    this.blackoutCount = 0;
    this.layoutShiftCount = 0;
    this.lastEventType = null;
    this.revision += 1;
    this.nextEventAtSeconds =
      tensionConfig.phases.orientationEndsAtSeconds +
      this.range(tensionConfig.scheduling.firstEventDelaySeconds);
    this.snapshot = this.createSnapshot({
      elapsedSeconds: 0,
      uniqueRooms: 0,
      currentRoomId: null,
      currentDefinitionId: null,
      currentDefinitionTags: [],
      playerSpeed: 0,
      secondsSinceMovement: 0,
      quality: 'default',
      reducedFlashing: false,
      exitDistance: null,
      layoutShiftCandidates: [],
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.activeEvent = null;
    this.history = [];
    this.recentDefinitions.length = 0;
    this.cooldownUntilSeconds.clear();
    this.cooldownUntilRooms.clear();
  }

  private recordRoomTransition(input: TensionUpdateInput): boolean {
    if (input.currentRoomId === null || input.currentRoomId === this.previousRoomId) {
      return false;
    }
    this.previousRoomId = input.currentRoomId;
    this.roomSequence += 1;
    const definitionId = input.currentDefinitionId;
    if (definitionId === null) return true;

    const recentlySeen = this.recentDefinitions.slice(-3).includes(definitionId);
    const special = input.currentDefinitionTags.some((tag) =>
      ['advanced', 'arch', 'pillar-grid', 'low-ceiling', 'high-ceiling', 'damp'].includes(tag),
    );
    if (!recentlySeen || special) {
      this.lastVariationAtSeconds = input.elapsedSeconds;
    }
    this.recentDefinitions.push(definitionId);
    if (this.recentDefinitions.length > 12) this.recentDefinitions.shift();
    return true;
  }

  private chooseAutomaticCandidate(input: TensionUpdateInput): EventCandidate | null {
    const phase = phaseAt(input.elapsedSeconds);
    const currentRoomId = input.currentRoomId;
    if (currentRoomId === null) return null;
    const candidates: EventCandidate[] = [];
    const add = (type: TensionEventType, targetRoomId: string, weight: number): void => {
      if (this.isEligible(type, input)) candidates.push({ type, targetRoomId, weight });
    };

    add('light-dip', currentRoomId, phase === 'monotony' ? 5 : 3.2);
    if (phase !== 'monotony') {
      add('palette-shift', currentRoomId, 2.2);
      const layoutTarget = input.layoutShiftCandidates[0];
      if (layoutTarget) add('layout-shift', layoutTarget, 1.6);
    }
    if (this.isRepetitionContext(input)) add('repetition-echo', currentRoomId, 2.8);
    if (phase === 'escalation' || phase === 'resolution') {
      add('silence', currentRoomId, 2.5);
      add('blackout', currentRoomId, phase === 'resolution' ? 1.6 : 0.8);
    }
    if (candidates.length === 0) return null;
    return this.rng.weightedPick(candidates, (candidate) => candidate.weight);
  }

  private isEligible(type: TensionEventType, input: TensionUpdateInput): boolean {
    const family = familyOf(type);
    if ((this.cooldownUntilSeconds.get(family) ?? 0) > input.elapsedSeconds) return false;
    if ((this.cooldownUntilRooms.get(family) ?? 0) > this.roomSequence) return false;
    if (type === this.lastEventType) return false;
    if (type === 'blackout') {
      if (this.blackoutCount >= tensionConfig.limits.blackoutPerSession) return false;
      if (input.currentDefinitionTags.includes('blackout') || input.exitDistance !== null)
        return false;
      if (input.playerSpeed > 5.2) return false;
    }
    if (type === 'layout-shift') {
      return (
        this.layoutShiftCount < tensionConfig.limits.layoutShiftsPerSession &&
        input.layoutShiftCandidates.length > 0
      );
    }
    return true;
  }

  private isRepetitionContext(input: TensionUpdateInput): boolean {
    const definitionId = input.currentDefinitionId;
    if (!definitionId || this.recentDefinitions.length < 4) return false;
    return this.recentDefinitions.slice(0, -1).slice(-6).includes(definitionId);
  }

  private startEvent(
    type: TensionEventType,
    targetRoomId: string,
    input: TensionUpdateInput,
    forced: boolean,
    started: TensionEvent[],
  ): void {
    if (!forced && !this.isEligible(type, input)) return;
    const duration = this.range(tensionConfig.durationsSeconds[type]);
    const event: TensionEvent = Object.freeze({
      id: `tension-${String(this.eventSequence).padStart(3, '0')}-${type}`,
      type,
      family: familyOf(type),
      targetRoomId,
      startedAtSeconds: input.elapsedSeconds,
      endsAtSeconds: input.elapsedSeconds + duration,
      roomSequence: this.roomSequence,
      forced,
    });
    this.eventSequence += 1;
    this.totalEventCount += 1;
    this.lastEventType = type;
    if (type === 'blackout') this.blackoutCount += 1;
    if (type === 'layout-shift') this.layoutShiftCount += 1;
    this.history.push(event);
    if (this.history.length > tensionConfig.scheduling.maximumHistory) this.history.shift();
    started.push(event);
    if (duration > 0) this.activeEvent = event;
    this.applyCooldown(event, input.elapsedSeconds);
    this.nextEventAtSeconds =
      input.elapsedSeconds + this.nextGlobalInterval(phaseAt(input.elapsedSeconds));
    this.revision += 1;
  }

  private applyCooldown(event: TensionEvent, now: number): void {
    let seconds: readonly [number, number];
    switch (event.family) {
      case 'light':
        seconds = event.type === 'blackout' ? [300, 300] : tensionConfig.cooldowns.lightSeconds;
        break;
      case 'audio':
        seconds = tensionConfig.cooldowns.silenceSeconds;
        break;
      case 'visual':
        seconds = tensionConfig.cooldowns.visualSeconds;
        break;
      case 'repetition':
        seconds = tensionConfig.cooldowns.repetitionSeconds;
        break;
      case 'spatial':
        seconds = tensionConfig.cooldowns.spatialSeconds;
        this.cooldownUntilRooms.set(
          event.family,
          this.roomSequence + Math.floor(this.range(tensionConfig.cooldowns.spatialRooms)),
        );
        break;
    }
    this.cooldownUntilSeconds.set(event.family, now + this.range(seconds));
  }

  private expireEvent(now: number, ended: TensionEvent[], force = false): void {
    if (this.activeEvent === null) return;
    if (!force && now < this.activeEvent.endsAtSeconds) return;
    ended.push(this.activeEvent);
    this.activeEvent = null;
    this.revision += 1;
  }

  private createSnapshot(input: TensionUpdateInput): TensionSnapshot {
    const phase = phaseAt(input.elapsedSeconds);
    const active = this.activeEvent ? Object.freeze([this.activeEvent]) : EMPTY_EVENTS;
    const activeType = this.activeEvent?.type ?? null;
    let silenceFactor = 0;
    if (activeType === 'silence') silenceFactor = tensionConfig.effects.silenceFactor;
    if (activeType === 'blackout') silenceFactor = tensionConfig.effects.blackoutSilenceFactor;
    const qualityScale = input.quality === 'low' ? 0.7 : input.quality === 'high' ? 1 : 0.86;
    const accessibilityScale = input.reducedFlashing
      ? tensionConfig.effects.reducedFlashingStrengthScale
      : 1;
    const baseVisualStrength =
      activeType === 'palette-shift'
        ? 0.16
        : activeType === 'repetition-echo'
          ? 0.1
          : activeType === 'blackout'
            ? 0.035
            : activeType === 'light-dip'
              ? 0.018
              : 0;
    const secondsWithoutVariation = Math.max(0, input.elapsedSeconds - this.lastVariationAtSeconds);
    return Object.freeze({
      phase,
      intensity: this.calculateIntensity(input, phase, secondsWithoutVariation),
      activeEvents: active,
      activeEventType: activeType,
      silenceFactor,
      visualEffectStrength: baseVisualStrength * qualityScale * accessibilityScale,
      visualEffectPhase: input.elapsedSeconds,
      secondsWithoutVariation,
      nextEventAtSeconds: this.nextEventAtSeconds,
      eventCount: this.totalEventCount,
      blackoutCount: this.blackoutCount,
      layoutShiftCount: this.layoutShiftCount,
      lastEventType: this.lastEventType,
      revision: this.revision,
    });
  }

  private calculateIntensity(
    input: TensionUpdateInput,
    phase: TensionPhase,
    secondsWithoutVariation: number,
  ): number {
    const ranges: Record<TensionPhase, readonly [number, number, number, number]> = {
      orientation: [0, 0.08, 0, tensionConfig.phases.orientationEndsAtSeconds],
      monotony: [
        0.08,
        0.28,
        tensionConfig.phases.orientationEndsAtSeconds,
        tensionConfig.phases.monotonyEndsAtSeconds,
      ],
      disorientation: [
        0.28,
        0.58,
        tensionConfig.phases.monotonyEndsAtSeconds,
        tensionConfig.phases.disorientationEndsAtSeconds,
      ],
      escalation: [
        0.58,
        0.82,
        tensionConfig.phases.disorientationEndsAtSeconds,
        tensionConfig.phases.escalationEndsAtSeconds,
      ],
      resolution: [
        0.82,
        1,
        tensionConfig.phases.escalationEndsAtSeconds,
        tensionConfig.phases.resolutionEndsAtSeconds,
      ],
    };
    const [minimum, maximum, start, end] = ranges[phase];
    const phaseProgress = clamp((input.elapsedSeconds - start) / Math.max(1, end - start), 0, 1);
    const explorationPressure = clamp((input.uniqueRooms - 12) / 108, 0, 1) * 0.055;
    const stagnationPressure = clamp(secondsWithoutVariation / 240, 0, 1) * 0.045;
    const speedPressure = clamp(input.playerSpeed / 5, 0, 1) * 0.012;
    const stillnessRelief = clamp(input.secondsSinceMovement / 30, 0, 1) * 0.018;
    const exitPressure =
      input.exitDistance === null ? 0 : clamp(1 - input.exitDistance / 24, 0, 1) * 0.08;
    const phaseValue = minimum + (maximum - minimum) * phaseProgress;
    return clamp(
      phaseValue +
        explorationPressure +
        stagnationPressure +
        speedPressure +
        exitPressure -
        stillnessRelief,
      0,
      1,
    );
  }

  private nextGlobalInterval(phase: TensionPhase): number {
    if (phase === 'orientation') return tensionConfig.scheduling.firstEventDelaySeconds[0];
    return this.range(tensionConfig.scheduling.phaseIntervalsSeconds[phase]);
  }

  private range(bounds: readonly [number, number]): number {
    const [minimum, maximum] = bounds;
    return minimum + (maximum - minimum) * this.rng.next();
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('TensionDirector has been disposed.');
  }
}
