import type { PageEffect } from "./story";

export class NightAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private humOscillators: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private enabled = true;

  async start() {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }

    const context = new AudioContext();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const roomFilter = context.createBiquadFilter();

    master.gain.value = this.enabled ? 0.22 : 0;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 3_600;

    master.connect(compressor);
    compressor.connect(roomFilter);
    roomFilter.connect(context.destination);

    const humGain = context.createGain();
    humGain.gain.value = 0.035;
    humGain.connect(master);

    [52, 104].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index ? 0.22 : 0.42;
      oscillator.connect(gain);
      gain.connect(humGain);
      oscillator.start();
      this.humOscillators.push(oscillator);
    });

    const noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] =
        (Math.random() * 2 - 1) *
        (0.42 + 0.58 * Math.sin(index * 0.00031));
    }

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 620;
    noiseFilter.Q.value = 0.8;
    noiseGain.gain.value = 0.009;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    this.context = context;
    this.master = master;
    this.humGain = humGain;
    this.noiseSource = noise;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.context || !this.master) return;

    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(enabled ? 0.22 : 0, now + 0.16);
  }

  setEffect(effect: PageEffect) {
    if (!this.context || !this.humGain) return;
    const now = this.context.currentTime;
    const intense = ["relay", "sealed", "live", "mirror", "countdown"].includes(
      effect,
    );
    const ending = effect.startsWith("ending");
    const target = ending ? 0.018 : intense ? 0.075 : 0.035;

    this.humGain.gain.cancelScheduledValues(now);
    this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
    this.humGain.gain.linearRampToValueAtTime(target, now + 0.7);
  }

  cue(
    type:
      | "page"
      | "locked"
      | "knock"
      | "ring"
      | "relay"
      | "siren"
      | "ending",
  ) {
    if (!this.enabled || !this.context || !this.master) return;
    const context = this.context;
    const now = context.currentTime;

    if (type === "page") {
      this.tone(760, 0.026, 0.032, "square", now);
      this.tone(1_180, 0.02, 0.024, "sine", now + 0.035);
      return;
    }

    if (type === "locked") {
      this.tone(130, 0.12, 0.07, "sawtooth", now);
      return;
    }

    if (type === "relay") {
      [0, 0.09, 0.22].forEach((offset, index) => {
        this.tone(480 + index * 70, 0.018, 0.025, "square", now + offset);
      });
      return;
    }

    if (type === "ring") {
      [0, 0.15, 0.82, 0.97].forEach((offset) => {
        this.tone(1_070, 0.09, 0.035, "sine", now + offset);
        this.tone(1_320, 0.07, 0.02, "sine", now + offset);
      });
      return;
    }

    if (type === "knock") {
      [0, 0.22, 0.51].forEach((offset) => {
        this.tone(72, 0.12, 0.15, "triangle", now + offset);
      });
      return;
    }

    if (type === "siren") {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(190, now);
      oscillator.frequency.linearRampToValueAtTime(460, now + 2.4);
      oscillator.frequency.linearRampToValueAtTime(190, now + 4.8);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + 5.1);
      return;
    }

    this.tone(90, 1.7, 0.055, "sine", now);
    this.tone(660, 1.1, 0.018, "sine", now + 0.32);
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    start: number,
  ) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + Math.max(0.02, duration),
    );

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  dispose() {
    this.humOscillators.forEach((oscillator) => oscillator.stop());
    this.noiseSource?.stop();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.humGain = null;
    this.humOscillators = [];
    this.noiseSource = null;
  }
}
