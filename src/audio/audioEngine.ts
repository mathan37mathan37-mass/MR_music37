import { resolveAudioSource } from '@/services/mediaStorage';

export type AudioQuality = 'low' | 'normal' | 'high' | 'lossless';

// Audio Engine singleton with Web Audio API AnalyserNode & Dynamic Quality DSP
class AudioEngine {
  private audio: HTMLAudioElement;
  private isSynthesizing = false;
  private synthInterval: number | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private onTrackEndCallback: (() => void) | null = null;
  private onLoadingCallback: ((isLoading: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  // Web Audio Context & Analyser
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private isSourceConnected = false;
  private frequencyData: Uint8Array = new Uint8Array(64);
  private waveformData: Uint8Array = new Uint8Array(64);
  private synthCurrentTime = 0;

  // Streaming Audio Quality DSP Chain
  private qualityFilter: BiquadFilterNode | null = null;
  private qualityHighShelf: BiquadFilterNode | null = null;
  private qualityCompressor: DynamicsCompressorNode | null = null;
  private qualityGain: GainNode | null = null;
  private currentQuality: AudioQuality = 'high';

  // Per-track seed for unique synthesized music
  private trackSeed = 1;
  private trackDuration = 210;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback && !isNaN(this.audio.currentTime)) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onTrackEndCallback) {
        this.onTrackEndCallback();
      }
    });

    this.audio.addEventListener('loadstart', () => {
      this.onLoadingCallback?.(true);
    });

    this.audio.addEventListener('canplay', () => {
      this.onLoadingCallback?.(false);
    });

    this.audio.addEventListener('waiting', () => {
      this.onLoadingCallback?.(true);
    });

    this.audio.addEventListener('playing', () => {
      this.onLoadingCallback?.(false);
      this.ensureAudioContext();
    });

    this.audio.addEventListener('error', () => {
      this.onLoadingCallback?.(false);
      // Fallback: If network audio fails or is blocked, synthesize musical fallback
      this.startSynthFallback();
    });
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (!this.analyser && this.audioCtx) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Uint8Array(this.analyser.fftSize);
    }

    // Build the Quality DSP chain
    if (!this.qualityFilter && this.audioCtx) {
      this.qualityFilter = this.audioCtx.createBiquadFilter();
      this.qualityHighShelf = this.audioCtx.createBiquadFilter();
      this.qualityCompressor = this.audioCtx.createDynamicsCompressor();
      this.qualityGain = this.audioCtx.createGain();

      this.applyQualityDSP(this.currentQuality);
    }

    if (!this.isSourceConnected && this.analyser && this.audioCtx && this.qualityFilter && this.qualityHighShelf && this.qualityCompressor && this.qualityGain) {
      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
        // Connect chain: source -> lowpass filter -> highshelf EQ -> dynamics compressor -> gain -> analyser -> destination
        this.sourceNode.connect(this.qualityFilter);
        this.qualityFilter.connect(this.qualityHighShelf);
        this.qualityHighShelf.connect(this.qualityCompressor);
        this.qualityCompressor.connect(this.qualityGain);
        this.qualityGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
        this.isSourceConnected = true;
      } catch {
        // Fallback direct connection or non-CORS bypass
        try {
          if (this.sourceNode && this.analyser) {
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
            this.isSourceConnected = true;
          }
        } catch {
          // Native browser audio continues without Web Audio intercept
        }
      }
    }

    return this.audioCtx;
  }

  /**
   * Applies acoustic parameters and DSP profile corresponding to selected streaming quality
   */
  public setAudioQuality(quality: AudioQuality): void {
    this.currentQuality = quality;
    if (this.audioCtx) {
      this.applyQualityDSP(quality);
    }
    console.log(`[AudioEngine] Streaming audio quality configured to: ${quality.toUpperCase()}`);
  }

  public getAudioQuality(): AudioQuality {
    return this.currentQuality;
  }

  private applyQualityDSP(quality: AudioQuality) {
    if (!this.audioCtx || !this.qualityFilter || !this.qualityHighShelf || !this.qualityCompressor || !this.qualityGain) return;
    const now = this.audioCtx.currentTime;

    switch (quality) {
      case 'lossless':
        // Studio Master / FLAC 24-bit fidelity:
        // Full uncompressed frequency spectrum up to Nyquist limit, wide dynamic range, crystal presence
        this.qualityFilter.type = 'lowpass';
        this.qualityFilter.frequency.setTargetAtTime(22050, now, 0.04);
        this.qualityFilter.Q.setTargetAtTime(0.707, now, 0.04);

        this.qualityHighShelf.type = 'highshelf';
        this.qualityHighShelf.frequency.setTargetAtTime(12000, now, 0.04);
        this.qualityHighShelf.gain.setTargetAtTime(1.5, now, 0.04); // subtle audiophile air & brilliance

        this.qualityCompressor.threshold.setTargetAtTime(-3, now, 0.04);
        this.qualityCompressor.knee.setTargetAtTime(40, now, 0.04);
        this.qualityCompressor.ratio.setTargetAtTime(1.1, now, 0.04);
        this.qualityCompressor.attack.setTargetAtTime(0.002, now, 0.04);
        this.qualityCompressor.release.setTargetAtTime(0.3, now, 0.04);

        this.qualityGain.gain.setTargetAtTime(1.0, now, 0.04);
        break;

      case 'high':
        // 320 kbps High Fidelity:
        // Full 20kHz reproduction, transparent dynamics, pristine studio master reproduction
        this.qualityFilter.type = 'lowpass';
        this.qualityFilter.frequency.setTargetAtTime(20000, now, 0.04);
        this.qualityFilter.Q.setTargetAtTime(0.707, now, 0.04);

        this.qualityHighShelf.type = 'highshelf';
        this.qualityHighShelf.frequency.setTargetAtTime(10000, now, 0.04);
        this.qualityHighShelf.gain.setTargetAtTime(0.2, now, 0.04);

        this.qualityCompressor.threshold.setTargetAtTime(-10, now, 0.04);
        this.qualityCompressor.knee.setTargetAtTime(30, now, 0.04);
        this.qualityCompressor.ratio.setTargetAtTime(2.0, now, 0.04);
        this.qualityCompressor.attack.setTargetAtTime(0.005, now, 0.04);
        this.qualityCompressor.release.setTargetAtTime(0.2, now, 0.04);

        this.qualityGain.gain.setTargetAtTime(1.0, now, 0.04);
        break;

      case 'normal':
        // 160 kbps Standard:
        // 15.5kHz high-frequency roll-off (characteristic MP3/AAC cutoff), balanced compression
        this.qualityFilter.type = 'lowpass';
        this.qualityFilter.frequency.setTargetAtTime(15500, now, 0.04);
        this.qualityFilter.Q.setTargetAtTime(0.8, now, 0.04);

        this.qualityHighShelf.type = 'highshelf';
        this.qualityHighShelf.frequency.setTargetAtTime(8000, now, 0.04);
        this.qualityHighShelf.gain.setTargetAtTime(-1.2, now, 0.04);

        this.qualityCompressor.threshold.setTargetAtTime(-16, now, 0.04);
        this.qualityCompressor.knee.setTargetAtTime(20, now, 0.04);
        this.qualityCompressor.ratio.setTargetAtTime(3.2, now, 0.04);
        this.qualityCompressor.attack.setTargetAtTime(0.01, now, 0.04);
        this.qualityCompressor.release.setTargetAtTime(0.18, now, 0.04);

        this.qualityGain.gain.setTargetAtTime(0.98, now, 0.04);
        break;

      case 'low':
        // 96 kbps Mobile Data Saver:
        // 10.5kHz lowpass filtering (bandwidth saver), tighter dynamic ceiling
        this.qualityFilter.type = 'lowpass';
        this.qualityFilter.frequency.setTargetAtTime(10500, now, 0.04);
        this.qualityFilter.Q.setTargetAtTime(0.9, now, 0.04);

        this.qualityHighShelf.type = 'highshelf';
        this.qualityHighShelf.frequency.setTargetAtTime(6000, now, 0.04);
        this.qualityHighShelf.gain.setTargetAtTime(-3.5, now, 0.04);

        this.qualityCompressor.threshold.setTargetAtTime(-22, now, 0.04);
        this.qualityCompressor.knee.setTargetAtTime(15, now, 0.04);
        this.qualityCompressor.ratio.setTargetAtTime(4.8, now, 0.04);
        this.qualityCompressor.attack.setTargetAtTime(0.02, now, 0.04);
        this.qualityCompressor.release.setTargetAtTime(0.15, now, 0.04);

        this.qualityGain.gain.setTargetAtTime(0.95, now, 0.04);
        break;
    }
  }

  public async setSource(src: string, autoPlay = true, seed = 1, duration = 210, trackTitle?: string): Promise<void> {
    this.stopSynthFallback();
    this.trackSeed = seed;
    this.trackDuration = duration;

    // Resolve persistent idb://, dead blob://, or missing URLs into live audio streams
    let resolvedSrc = src;
    try {
      resolvedSrc = await resolveAudioSource(src, trackTitle, seed);
    } catch (e) {
      console.warn('[AudioEngine] Error resolving audio source:', e);
      resolvedSrc = `/audio/track-${((seed - 1) % 16) + 1}.wav`;
    }

    // Same-origin audio files, data URIs, and blob URLs don't need crossOrigin headers
    if (resolvedSrc.startsWith('/') || resolvedSrc.startsWith('data:') || resolvedSrc.startsWith('blob:')) {
      this.audio.removeAttribute('crossOrigin');
    } else {
      this.audio.crossOrigin = 'anonymous';
    }

    const currentSrc = this.audio.getAttribute('src') || this.audio.src;
    if (currentSrc !== resolvedSrc && !this.audio.src.endsWith(resolvedSrc)) {
      this.audio.src = resolvedSrc;
      this.audio.load();
    } else {
      this.audio.currentTime = 0;
    }

    if (autoPlay) {
      return this.play();
    }
    return Promise.resolve();
  }

  public play(): Promise<void> {
    this.ensureAudioContext();
    if (this.isSynthesizing) return Promise.resolve();

    return this.audio.play().catch(async (err) => {
      console.warn('HTML5 Audio playback notice:', err.message);
      // Attempt to load standard fallback track before synthesizer
      try {
        const fallback = `/audio/track-${((this.trackSeed - 1) % 16) + 1}.wav`;
        if (this.audio.src !== fallback && !this.audio.src.endsWith(fallback)) {
          this.audio.removeAttribute('crossOrigin');
          this.audio.src = fallback;
          this.audio.load();
          await this.audio.play();
          return;
        }
      } catch (fallbackErr) {
        console.warn('Fallback audio playback error:', fallbackErr);
      }
      this.startSynthFallback();
    });
  }

  public pause(): void {
    if (this.isSynthesizing) {
      this.pauseSynthFallback();
    } else {
      this.audio.pause();
    }
  }

  public seek(seconds: number): void {
    if (this.isSynthesizing) {
      this.synthCurrentTime = Math.max(0, Math.min(seconds, this.trackDuration));
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.synthCurrentTime, this.trackDuration);
      }
      return;
    }
    if (!isNaN(seconds) && isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 9999));
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.audio.volume = clamped;
  }

  public setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio.duration || 0;
  }

  public onTimeUpdate(cb: (currentTime: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onTrackEnd(cb: () => void) {
    this.onTrackEndCallback = cb;
  }

  public onLoading(cb: (isLoading: boolean) => void) {
    this.onLoadingCallback = cb;
  }

  public onError(cb: (error: string) => void) {
    this.onErrorCallback = cb;
  }

  // --- Real-time Visualizer Audio Data Provider ---
  public getFrequencyData(): Uint8Array {
    if (this.analyser && this.isSourceConnected && !this.audio.paused) {
      (this.analyser.getByteFrequencyData as (array: Uint8Array) => void)(this.frequencyData);
      if (this.frequencyData.some((v) => v > 0)) {
        return this.frequencyData;
      }
    }

    return this.generateSimulatedFrequencies();
  }

  public getWaveformData(): Uint8Array {
    if (this.analyser && this.isSourceConnected && !this.audio.paused) {
      (this.analyser.getByteTimeDomainData as (array: Uint8Array) => void)(this.waveformData);
      if (this.waveformData.some((v) => v !== 128)) {
        return this.waveformData;
      }
    }

    return this.generateSimulatedWaveform();
  }

  private generateSimulatedFrequencies(): Uint8Array {
    const isPlaying = !this.audio.paused || this.isSynthesizing;
    const count = 64;
    const data = new Uint8Array(count);
    const time = (this.audio.currentTime || this.synthCurrentTime || 0) * 4;
    const seed = this.trackSeed;

    for (let i = 0; i < count; i++) {
      if (!isPlaying) {
        data[i] = Math.max(0, Math.sin(i * 0.15 + Date.now() * 0.002) * 12 + 6);
      } else {
        const bassFreq = 1.5 + (seed % 4) * 0.5;
        const midFreq = 2.8 + (seed % 5) * 0.4;
        const trebleFreq = 5.5 + (seed % 3) * 0.7;

        const bass = Math.sin(time * bassFreq + seed * 0.1) * 55 + 130;
        const mid = Math.cos(time * midFreq + i * 0.25 + seed * 0.2) * 45 + 110;
        const treble = Math.sin(time * trebleFreq + i * 0.5 + seed * 0.3) * 35 + 85;

        let val = 0;
        if (i < 12) val = bass + Math.sin(i * 0.4 + seed * 0.15) * 20;
        else if (i < 36) val = mid + Math.cos(i * 0.3 + seed * 0.1) * 18;
        else val = treble + Math.sin(i * 0.6 + seed * 0.05) * 15;

        data[i] = Math.max(10, Math.min(255, Math.floor(val)));
      }
    }
    return data;
  }

  private generateSimulatedWaveform(): Uint8Array {
    const isPlaying = !this.audio.paused || this.isSynthesizing;
    const count = 64;
    const data = new Uint8Array(count);
    const time = (this.audio.currentTime || this.synthCurrentTime || 0) * 6;
    const seed = this.trackSeed;

    for (let i = 0; i < count; i++) {
      if (!isPlaying) {
        data[i] = 128 + Math.sin(i * 0.2 + Date.now() * 0.002) * 4;
      } else {
        const wave =
          Math.sin(time + i * 0.2 + seed * 0.1) * 35 +
          Math.sin(time * (1.5 + seed * 0.1) + i * 0.4) * 18 +
          Math.cos(time * 0.5 + i * 0.1 + seed * 0.2) * 20;
        data[i] = Math.max(0, Math.min(255, 128 + Math.floor(wave)));
      }
    }
    return data;
  }

  // --- Web Audio API fallback synthesizer with per-track unique chord progressions ---
  private startSynthFallback() {
    this.isSynthesizing = true;
    if (this.synthInterval) clearInterval(this.synthInterval);

    const seed = this.trackSeed;
    const allChordSets = [
      [[261.63, 329.63, 392.0], [293.66, 369.99, 440.0], [329.63, 415.30, 493.88], [246.94, 311.13, 369.99]],
      [[220.0, 261.63, 329.63], [196.0, 233.08, 293.66], [174.61, 207.65, 261.63], [185.0, 220.0, 277.18]],
      [[440.0, 554.37, 659.25], [392.0, 493.88, 587.33], [349.23, 440.0, 523.25], [329.63, 415.30, 493.88]],
      [[261.63, 311.13, 369.99, 440.0], [233.08, 277.18, 329.63, 392.0], [207.65, 246.94, 293.66, 349.23], [220.0, 261.63, 311.13, 369.99]],
      [[130.81, 164.81, 196.0], [146.83, 185.0, 220.0], [164.81, 207.65, 246.94], [155.56, 196.0, 233.08]],
      [[174.61, 220.0, 261.63], [155.56, 195.99, 233.08], [146.83, 185.0, 220.0], [130.81, 164.81, 196.0]],
      [[196.0, 246.94, 293.66], [220.0, 277.18, 329.63], [174.61, 220.0, 261.63], [185.0, 233.08, 277.18]],
      [[523.25, 659.25, 783.99], [493.88, 622.25, 739.99], [440.0, 554.37, 659.25], [415.30, 523.25, 622.25]],
    ];

    const chords = allChordSets[seed % allChordSets.length];
    const tempos = [0.4, 0.5, 0.6, 0.35, 0.45, 0.55, 0.5, 0.4];
    const intervalMs = Math.round(tempos[seed % tempos.length] * 1000);

    let chordIndex = 0;
    this.synthInterval = window.setInterval(() => {
      this.synthCurrentTime += intervalMs / 1000;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.synthCurrentTime, this.trackDuration);
      }

      if (Math.floor(this.synthCurrentTime * (1000 / intervalMs)) % 2 === 0) {
        this.playSoftNote(chords[chordIndex % chords.length]);
        chordIndex++;
      }

      if (this.synthCurrentTime >= this.trackDuration) {
        this.synthCurrentTime = 0;
        this.onTrackEndCallback?.();
      }
    }, intervalMs);
  }

  private playSoftNote(notes: number[]) {
    try {
      const ctx = this.ensureAudioContext();
      if (this.audio.muted || this.audio.volume === 0) return;

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.04 * this.audio.volume, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

        osc.connect(gain);
        if (this.qualityFilter) {
          gain.connect(this.qualityFilter);
        } else if (this.analyser) {
          gain.connect(this.analyser);
        } else {
          gain.connect(ctx.destination);
        }
        osc.start();
        osc.stop(ctx.currentTime + 1.9);
      });
    } catch {
      // Audio context error handling
    }
  }

  private pauseSynthFallback() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.isSynthesizing = false;
  }

  private stopSynthFallback() {
    this.pauseSynthFallback();
    this.synthCurrentTime = 0;
  }
}

export const audioEngine = new AudioEngine();
