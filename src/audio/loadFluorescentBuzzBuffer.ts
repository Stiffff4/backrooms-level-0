const BUZZ_AUDIO_URL = `${import.meta.env.BASE_URL}assets/audio/fluorescent-light-buzz.wav`;
const CROSSFADE_SECONDS = 0.012;

function averageChannels(decoded: AudioBuffer, context: AudioContext): AudioBuffer {
  if (decoded.numberOfChannels <= 1) {
    const mono = context.createBuffer(1, decoded.length, decoded.sampleRate);
    mono.copyToChannel(decoded.getChannelData(0), 0);
    return mono;
  }

  const mono = context.createBuffer(1, decoded.length, decoded.sampleRate);
  const target = mono.getChannelData(0);
  for (let channelIndex = 0; channelIndex < decoded.numberOfChannels; channelIndex += 1) {
    const source = decoded.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < target.length; sampleIndex += 1) {
      target[sampleIndex] = (target[sampleIndex] ?? 0) + (source[sampleIndex] ?? 0);
    }
  }
  const scale = 1 / decoded.numberOfChannels;
  for (let sampleIndex = 0; sampleIndex < target.length; sampleIndex += 1) {
    target[sampleIndex] = (target[sampleIndex] ?? 0) * scale;
  }
  return mono;
}

function smoothLoopSeam(buffer: AudioBuffer): void {
  const samples = buffer.getChannelData(0);
  if (samples.length < 16) {
    return;
  }
  const crossfadeSamples = Math.max(
    8,
    Math.min(Math.floor(samples.length / 6), Math.round(buffer.sampleRate * CROSSFADE_SECONDS)),
  );
  if (crossfadeSamples <= 1) {
    return;
  }

  const head = samples.slice(0, crossfadeSamples);
  const tailStart = samples.length - crossfadeSamples;
  for (let index = 0; index < crossfadeSamples; index += 1) {
    const blend = index / (crossfadeSamples - 1);
    const headSample = head[index] ?? 0;
    const tailSample = samples[tailStart + index] ?? 0;
    samples[tailStart + index] = tailSample * (1 - blend) + headSample * blend;
  }
  samples[samples.length - 1] = samples[0] ?? 0;
}

/**
 * Loads the user-supplied fluorescent buzz recording and converts it to a
 * mono loop-friendly buffer. Returns null on network/decode failure so the
 * procedural fallback can still boot the game.
 */
export async function loadFluorescentBuzzBuffer(
  context: AudioContext,
): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(BUZZ_AUDIO_URL, { cache: 'force-cache' });
    if (!response.ok) {
      return null;
    }
    const encoded = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(encoded.slice(0));
    const mono = averageChannels(decoded, context);
    smoothLoopSeam(mono);
    return mono;
  } catch {
    return null;
  }
}
