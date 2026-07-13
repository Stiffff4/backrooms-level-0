export const AUDIO_BUS_NAMES = [
  'master',
  'ambience',
  'lights',
  'footsteps',
  'events',
  'ui',
] as const;

export type AudioBusName = (typeof AUDIO_BUS_NAMES)[number];

export type AudioVolumeMap = Record<AudioBusName, number>;

export interface AudioVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AudioListenerPose {
  readonly position: AudioVector3;
  readonly forward: AudioVector3;
  readonly up?: AudioVector3;
}

export type AudioContextFactory = () => AudioContext;

export interface GameAudioEngineOptions {
  /** Pass false for the `noAudio` code path. No Web Audio objects will be created. */
  readonly enabled?: boolean;
  /** Injectable so the Web Audio graph can be tested without a browser. */
  readonly contextFactory?: AudioContextFactory;
  readonly initialVolumes?: Partial<AudioVolumeMap>;
  readonly muteOnFocusLoss?: boolean;
}

export type GameAudioEngineState =
  AudioContextState | 'idle' | 'disabled' | 'unavailable' | 'disposed';

export interface GameAudioEngineSnapshot {
  readonly enabled: boolean;
  readonly state: GameAudioEngineState;
  readonly nodeCount: number;
  readonly paused: boolean;
  readonly focused: boolean;
  readonly volumes: Readonly<AudioVolumeMap>;
  readonly hasActivationError: boolean;
}
