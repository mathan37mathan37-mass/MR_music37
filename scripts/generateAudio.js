import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to write standard 44-byte PCM WAV
function createWavBuffer(sampleRate, numChannels, leftChannel, rightChannel) {
  const numSamples = leftChannel.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16 bits

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, leftChannel[i]));
    const valL = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
    buffer.writeInt16LE(Math.floor(valL), offset);
    offset += 2;

    const sR = Math.max(-1, Math.min(1, rightChannel ? rightChannel[i] : leftChannel[i]));
    const valR = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
    buffer.writeInt16LE(Math.floor(valR), offset);
    offset += 2;
  }

  return buffer;
}

// 16 track musical compositions
const TRACK_CONFIGS = [
  { id: 'track-1', genre: 'synthwave', bpm: 120, key: 57 /* A2 */, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]] },
  { id: 'track-2', genre: 'electronic', bpm: 128, key: 60 /* C3 */, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 7], [2, 5, 9, 12]] },
  { id: 'track-3', genre: 'rnb', bpm: 85, key: 58 /* Bb2 */, scale: [0, 2, 3, 5, 7, 10], chords: [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [1, 5, 8, 12]] },
  { id: 'track-4', genre: 'pop', bpm: 116, key: 62 /* D3 */, scale: [0, 2, 4, 7, 9, 11], chords: [[0, 4, 7, 12], [-5, -1, 2, 7], [-3, 0, 4, 9], [-7, -3, 0, 5]] },
  { id: 'track-5', genre: 'ambient', bpm: 72, key: 55 /* G2 */, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11, 14], [2, 5, 9, 12, 16], [-3, 0, 4, 7, 11], [-5, -1, 2, 7, 9]] },
  { id: 'track-6', genre: 'lofi', bpm: 80, key: 53 /* F2 */, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7, 11], [7, 11, 14, 17], [2, 5, 9, 12], [5, 9, 12, 16]] },
  { id: 'track-7', genre: 'dance', bpm: 126, key: 58 /* Bb2 */, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12, 15], [3, 7, 10, 15], [-2, 5, 10, 14], [-4, 3, 8, 12]] },
  { id: 'track-8', genre: 'hiphop', bpm: 92, key: 55 /* G2 */, scale: [0, 3, 5, 6, 7, 10], chords: [[0, 3, 7, 10], [-2, 1, 5, 8], [-4, -1, 3, 7], [-5, -2, 2, 5]] },
  { id: 'track-9', genre: 'rock', bpm: 130, key: 52 /* E2 */, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]] },
  { id: 'track-10', genre: 'indie', bpm: 104, key: 60 /* C3 */, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 9], [-5, -1, 2, 7], [-3, 0, 4, 7], [-7, -3, 0, 5]] },
  { id: 'track-11', genre: 'futurebass', bpm: 140, key: 63 /* Eb3 */, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 10, 15], [5, 8, 12, 15], [3, 7, 10, 14], [-2, 5, 10, 13]] },
  { id: 'track-12', genre: 'chillhop', bpm: 78, key: 57 /* A2 */, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 10, 14, 17]] },
  { id: 'track-13', genre: 'synthpop', bpm: 122, key: 62 /* D3 */, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [-5, -1, 2, 7], [-3, 0, 4, 7], [2, 5, 9, 12]] },
  { id: 'track-14', genre: 'cyberpunk', bpm: 132, key: 50 /* D2 */, scale: [0, 1, 4, 5, 7, 8, 11], chords: [[0, 7, 12], [1, 8, 13], [5, 12, 17], [7, 14, 19]] },
  { id: 'track-15', genre: 'acoustic', bpm: 96, key: 59 /* B2 */, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [-5, -1, 2, 7], [-3, 0, 4, 7], [-7, -3, 0, 5]] },
  { id: 'track-16', genre: 'funk', bpm: 112, key: 53 /* F2 */, scale: [0, 3, 5, 7, 10], chords: [[0, 4, 7, 10], [5, 9, 12, 15], [3, 7, 10, 13], [1, 5, 8, 11]] }
];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function generateTrackWav(config) {
  const sampleRate = 22050;
  const durationSec = 24; // 24 seconds rich loop
  const totalSamples = sampleRate * durationSec;
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const secondsPerBeat = 60 / config.bpm;
  const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);
  const beatsPerBar = 4;
  const samplesPerBar = samplesPerBeat * beatsPerBar;
  const totalBars = Math.floor(totalSamples / samplesPerBar);

  for (let bar = 0; bar < totalBars; bar++) {
    const chordIndex = bar % config.chords.length;
    const chordOffsets = config.chords[chordIndex];
    const barStart = bar * samplesPerBar;

    // 1. Synth Chord Pad / Rhodes layer
    chordOffsets.forEach((offset, noteIdx) => {
      const midiNote = config.key + offset + 12;
      const freq = midiToFreq(midiNote);
      const pan = (noteIdx / (chordOffsets.length - 1 || 1)) * 0.8 - 0.4; // stereo spread

      for (let s = 0; s < samplesPerBar; s++) {
        const idx = barStart + s;
        if (idx >= totalSamples) break;
        const t = s / sampleRate;

        // Envelope: smooth attack and decay
        const env = Math.min(1, t / 0.15) * Math.exp(-t / (secondsPerBeat * 3.5));
        
        // Tone generator (mix of sine + soft triangle + slight chorus)
        const phase1 = 2 * Math.PI * freq * t;
        const phase2 = 2 * Math.PI * (freq * 1.003) * t; // subtle detune chorus
        let wave = 0.5 * Math.sin(phase1) + 0.3 * Math.sin(phase2);
        
        if (config.genre === 'synthwave' || config.genre === 'cyberpunk') {
          // Sawtooth richness
          wave += 0.2 * ((phase1 % (2 * Math.PI)) / Math.PI - 1);
        }

        const amp = wave * env * 0.22;
        left[idx] += amp * (0.5 - pan);
        right[idx] += amp * (0.5 + pan);
      }
    });

    // 2. Bassline
    const bassRoot = config.key + chordOffsets[0] - 12;
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const beatStart = barStart + beat * samplesPerBeat;
      const bassMidi = (beat === 2 && config.genre !== 'ambient') ? bassRoot + 7 : bassRoot;
      const freq = midiToFreq(bassMidi);

      for (let s = 0; s < samplesPerBeat; s++) {
        const idx = beatStart + s;
        if (idx >= totalSamples) break;
        const t = s / sampleRate;
        const env = Math.min(1, t / 0.02) * Math.exp(-t / (secondsPerBeat * 0.7));
        const p = 2 * Math.PI * freq * t;
        // Warm sub + harmonic
        const wave = 0.7 * Math.sin(p) + 0.3 * Math.sin(2 * p);
        const amp = wave * env * 0.32;
        left[idx] += amp * 0.5;
        right[idx] += amp * 0.5;
      }
    }

    // 3. Drum Beats (Kick, Snare/Clap, Hi-Hat)
    if (config.genre !== 'ambient') {
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const beatStart = barStart + beat * samplesPerBeat;

        // Kick Drum (beat 0 and 2, or 4-on-the-floor for dance/electronic)
        const isKick = (config.genre === 'dance' || config.genre === 'electronic' || config.genre === 'futurebass')
          ? true
          : (beat === 0 || beat === 2);

        if (isKick) {
          for (let s = 0; s < Math.min(sampleRate * 0.25, samplesPerBeat); s++) {
            const idx = beatStart + s;
            if (idx >= totalSamples) break;
            const t = s / sampleRate;
            const kickPitch = 130 * Math.exp(-t * 32) + 45;
            const env = Math.exp(-t * 18);
            const wave = Math.sin(2 * Math.PI * kickPitch * t);
            const amp = wave * env * 0.45;
            left[idx] += amp * 0.5;
            right[idx] += amp * 0.5;
          }
        }

        // Snare / Clap (beat 1 and 3)
        if (beat === 1 || beat === 3) {
          for (let s = 0; s < Math.min(sampleRate * 0.2, samplesPerBeat); s++) {
            const idx = beatStart + s;
            if (idx >= totalSamples) break;
            const t = s / sampleRate;
            const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
            const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 28);
            const amp = (noise * 0.7 + tone * 0.3) * 0.28;
            left[idx] += amp * 0.5;
            right[idx] += amp * 0.5;
          }
        }

        // Hi-Hats (every 16th or 8th note)
        const subdivisions = 4;
        const subSamples = Math.floor(samplesPerBeat / subdivisions);
        for (let sub = 0; sub < subdivisions; sub++) {
          const hatStart = beatStart + sub * subSamples;
          const isAccent = sub === 2; // offbeat
          for (let s = 0; s < Math.min(sampleRate * 0.05, subSamples); s++) {
            const idx = hatStart + s;
            if (idx >= totalSamples) break;
            const t = s / sampleRate;
            const noise = (Math.random() * 2 - 1) * Math.exp(-t * 70);
            const amp = noise * (isAccent ? 0.12 : 0.06);
            left[idx] += amp * 0.4;
            right[idx] += amp * 0.6; // slight stereo offset
          }
        }
      }
    }

    // 4. Melodic Arpeggio / Lead motif
    const arpNotes = [0, 2, 4, 7, 9, 12];
    const arpSteps = 8;
    const arpSampleStep = Math.floor(samplesPerBar / arpSteps);
    for (let step = 0; step < arpSteps; step++) {
      const arpStart = barStart + step * arpSampleStep;
      const noteOffset = arpNotes[(step * 2 + bar) % arpNotes.length];
      const leadMidi = config.key + 24 + noteOffset;
      const freq = midiToFreq(leadMidi);

      for (let s = 0; s < Math.min(sampleRate * 0.2, arpSampleStep); s++) {
        const idx = arpStart + s;
        if (idx >= totalSamples) break;
        const t = s / sampleRate;
        const env = Math.min(1, t / 0.01) * Math.exp(-t * 9);
        const p = 2 * Math.PI * freq * t;
        const wave = 0.6 * Math.sin(p) + 0.3 * Math.sin(2 * p) + 0.1 * Math.sin(3 * p);
        const amp = wave * env * 0.18;
        const pan = Math.sin(step) * 0.3;
        left[idx] += amp * (0.5 - pan);
        right[idx] += amp * (0.5 + pan);
      }
    }
  }

  // Master Limiter / Normalizer
  let maxPeak = 0.0001;
  for (let i = 0; i < totalSamples; i++) {
    const pL = Math.abs(left[i]);
    const pR = Math.abs(right[i]);
    if (pL > maxPeak) maxPeak = pL;
    if (pR > maxPeak) maxPeak = pR;
  }
  const normFactor = 0.85 / maxPeak;
  for (let i = 0; i < totalSamples; i++) {
    left[i] *= normFactor;
    right[i] *= normFactor;
  }

  return createWavBuffer(sampleRate, 2, left, right);
}

const outDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Generating 16 high-fidelity audio tracks in: ${outDir}`);

TRACK_CONFIGS.forEach((config) => {
  const wavBuf = generateTrackWav(config);
  const outPath = path.join(outDir, `${config.id}.wav`);
  fs.writeFileSync(outPath, wavBuf);
  console.log(`✓ Generated ${config.id}.wav (${config.genre.toUpperCase()}, ${config.bpm} BPM, ${(wavBuf.length / 1024).toFixed(1)} KB)`);
});

console.log('All 16 tracks successfully created!');
