// Synthesized sound engine using Web Audio API

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Initialize or resume AudioContext safely
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crowncards_sound');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  }
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('crowncards_sound', String(soundEnabled));
  }
  return soundEnabled;
}

// Mobile Haptic Feedback (Hardware vibration if supported + subtle acoustic haptic tick)
export function triggerHapticFeedback(pattern: number | number[] = 10) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

// 0. iOS Micro Haptic Tap Click (acoustic haptic feel for taps)
export function playHapticTap() {
  triggerHapticFeedback(8);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.025);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.025);
}

// 1. Tick click for roulette wheel / carousel deceleration
export function playTick(pitchMultiplier = 1) {
  triggerHapticFeedback(6);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(650 * pitchMultiplier, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

// 2. Realistic pack foil tear / rip sound
export function playPackRip() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate shaped noise
  for (let i = 0; i < bufferSize; i++) {
    const progress = i / bufferSize;
    // Crinkly amplitude modulation
    const mod = Math.sin(progress * 40 * Math.PI) * 0.3 + 0.7;
    data[i] = (Math.random() * 2 - 1) * mod * (1 - progress);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.35);
  filter.Q.setValueAtTime(3, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
}

// 3. Card slide / reveal swoosh
export function playCardReveal() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.01, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

// 4. Hit celebration chime (Ultra Rare / Win)
export function playHitChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

    const startTime = ctx.currentTime + i * 0.06;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

// 5. Legendary Grail Fanfare (Massive Hit / Grail)
export function playGrailFanfare() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Sub bass boom
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(110, ctx.currentTime);
  subOsc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.6);

  subGain.gain.setValueAtTime(0.3, ctx.currentTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start();
  subOsc.stop(ctx.currentTime + 0.8);

  // Glorious arpeggio chords
  const chords = [
    [523.25, 659.25, 783.99],       // C
    [587.33, 739.99, 880.00],       // D
    [659.25, 830.61, 987.77],       // E
    [1046.50, 1318.51, 1567.98]     // High C octave
  ];

  chords.forEach((chord, step) => {
    const startTime = ctx.currentTime + 0.15 + step * 0.12;
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  });
}

// 6. Interactive Multiplier Power-up Charge Sound (1x -> 5x)
export function playMultiplierPowerup(multiplier: number = 2) {
  triggerHapticFeedback([12, 30, 20]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const baseFreq = 300 + (multiplier - 1) * 120;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, ctx.currentTime + 0.16);

  // Filter for electric laser sweep
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.16);

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

// 7. Interactive Pack Swipe Air Whoosh
export function playSwipeWhoosh() {
  triggerHapticFeedback(8);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const progress = i / bufferSize;
    const envelope = Math.sin(progress * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.09);
  filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);
  filter.Q.setValueAtTime(2, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
}

// 8. Turbo Mode Electric Zap
export function playTurboSpark() {
  triggerHapticFeedback([15, 20, 25]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.09, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

// 9. Metallic Coin Clink / Cashout
export function playCoinClink() {
  triggerHapticFeedback(10);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [1760, 2637]; // A6, E7
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.05);
    osc.stop(ctx.currentTime + idx * 0.05 + 0.25);
  });
}

// 10. Card 3D Spin sound effect based on rarity and spin duration
export function playCardSpin(rarity: string, durationSec = 1.5) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const isGrail = rarity === 'Grail';
  const isSecret = rarity === 'Secret Rare';
  const isUltra = rarity === 'Ultra Rare';
  const isEpic = isSecret || isUltra;
  const isRare = rarity === 'Rare';

  if (isGrail) {
    triggerHapticFeedback([25, 60, 40, 80, 50, 90]);
    // Heartbeat sub-bass pulse + rising suspense vortex matching slow spin
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + durationSec * 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3400, ctx.currentTime + durationSec * 0.9);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } else if (isEpic) {
    triggerHapticFeedback([20, 45, 30, 60]);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + durationSec * 0.85);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } else if (isRare) {
    triggerHapticFeedback([15, 30, 20]);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + durationSec * 0.8);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } else {
    triggerHapticFeedback(10);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + durationSec * 0.85);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  }
}

// 11. Rapid Tick sound during rarity color cycling
export function playRarityCycleTick(step = 1) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  const freq = 420 + step * 70;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.045, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

// 12. Success Chime for settings applied and admin portal unlocks
export function playSuccessChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.07 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.07);
    osc.stop(ctx.currentTime + i * 0.07 + 0.35);
  });
}


