/**
 * SongPlayer.js - Plays a song package with Tone.js and reports beats for the
 * moving beat bar. Requires the global `Tone`.
 *
 *   const player = new SongPlayer();
 *   player.load(pkg);
 *   await player.play({ fromBeat, countIn: true, onBeat, onCount, onMark, marks, onEnd });
 *   player.setTempoFactor(0.75);  // live
 *   player.setMuted('p2', true);  // live
 *   player.stop();
 */

import { createInstrument } from './SongInstruments.js';
import { getMeasures, measureBeats, beatLength } from './SongModel.js';

const EPS = 1e-6;

export class SongPlayer {
  constructor() {
    this.pkg = null;
    this.master = null;
    this.parts = new Map();   // id -> { inst, channel }
    this.muted = new Set();
    this.tempoFactor = 1;
    this.playing = false;
    this.click = null;
    this._session = 0;
  }

  load(pkg) {
    this.stop();
    this._disposeParts();
    this.pkg = pkg;
    this.muted.clear();
  }

  async ensureAudio() {
    await Tone.start();
    if (!this.master) {
      this.master = new Tone.Volume(-2).toDestination();
      this.click = createInstrument('woodblock');
      this.click.output.connect(this.master);
    }
    if (this.pkg) {
      for (const part of this.pkg.parts) {
        if (!this.parts.has(part.id)) this._buildPart(part);
      }
    }
  }

  _buildPart(part) {
    const inst = createInstrument(part.instrument);
    const channel = new Tone.Volume(part.volume || 0);
    channel.mute = this.muted.has(part.id);
    inst.output.connect(channel);
    channel.connect(this.master);
    this.parts.set(part.id, { inst, channel });
  }

  _disposeParts() {
    for (const { inst, channel } of this.parts.values()) {
      inst.dispose();
      channel.dispose();
    }
    this.parts.clear();
  }

  /** Rebuild one part's sound (builder: instrument or volume changed) */
  refreshPart(partId) {
    const existing = this.parts.get(partId);
    if (existing) {
      existing.inst.dispose();
      existing.channel.dispose();
      this.parts.delete(partId);
    }
    const part = this.pkg && this.pkg.parts.find(p => p.id === partId);
    if (part && this.master) this._buildPart(part);
  }

  setMuted(partId, muted) {
    if (muted) this.muted.add(partId); else this.muted.delete(partId);
    const p = this.parts.get(partId);
    if (p) p.channel.mute = muted;
  }

  setTempoFactor(f) {
    this.tempoFactor = f;
    if (this.pkg && typeof Tone !== 'undefined') Tone.Transport.bpm.value = this.pkg.tempo * f;
  }

  /** Every counted beat time in [from, to) aligned to the measures */
  beatTimes(from = 0, to = Infinity) {
    const bl = beatLength(this.pkg);
    const out = [];
    for (const m of getMeasures(this.pkg)) {
      const end = m.start + m.length;
      if (m.pickup) {
        const list = [];
        for (let t = end - bl; t >= m.start - EPS; t -= bl) list.unshift(t);
        out.push(...list);
      } else {
        for (let t = m.start; t < end - EPS; t += bl) out.push(t);
      }
    }
    return out.filter(t => t >= from - EPS && t < to - EPS);
  }

  /**
   * Start playback.
   * opts: { fromBeat, toBeat, countIn, marks: [beatTimes], onBeat(t), onMark(t), onCount(n, total), onEnd() }
   */
  async play(opts = {}) {
    if (!this.pkg) return;
    await this.ensureAudio();
    this.stop();
    const session = ++this._session;
    const pkg = this.pkg;
    const transport = Tone.Transport;
    const PPQ = transport.PPQ;
    const ticks = (b) => Math.round(b * PPQ) + 'i';
    const fromBeat = opts.fromBeat || 0;
    const toBeat = opts.toBeat ?? pkg.totalBeats;
    const bl = beatLength(pkg);

    transport.cancel(0);
    transport.position = 0;
    transport.bpm.value = pkg.tempo * this.tempoFactor;

    // Count-in: one measure of clicks (shortened when starting on a pickup)
    let offset = 0;
    if (opts.countIn) {
      offset = measureBeats(pkg);
      if (fromBeat < EPS && pkg.pickupBeats > EPS) offset = measureBeats(pkg) - pkg.pickupBeats;
      const counts = Math.round(offset / bl);
      for (let i = 0; i < counts; i++) {
        transport.schedule((time) => {
          this.click.trigger(84, 0.05, time, i === 0 ? 1 : 0.7);
          Tone.Draw.schedule(() => { if (session === this._session && opts.onCount) opts.onCount(i + 1, counts); }, time);
        }, ticks(i * bl));
      }
    }

    // Notes
    for (const part of pkg.parts) {
      const entry = this.parts.get(part.id);
      if (!entry) continue;
      for (const [t, d, midi] of part.notes) {
        if (t < fromBeat - EPS || t >= toBeat - EPS) continue;
        const len = Math.min(d, toBeat - t);
        transport.schedule((time) => {
          entry.inst.trigger(midi, len * 60 / transport.bpm.value, time, 0.8);
        }, ticks(t - fromBeat + offset));
      }
    }

    // Beat bar + note highlight callbacks
    for (const b of this.beatTimes(fromBeat, toBeat)) {
      transport.schedule((time) => {
        Tone.Draw.schedule(() => { if (session === this._session && opts.onBeat) opts.onBeat(b); }, time);
      }, ticks(b - fromBeat + offset));
    }
    for (const m of opts.marks || []) {
      if (m < fromBeat - EPS || m >= toBeat - EPS) continue;
      transport.schedule((time) => {
        Tone.Draw.schedule(() => { if (session === this._session && opts.onMark) opts.onMark(m); }, time);
      }, ticks(m - fromBeat + offset));
    }

    transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        if (session !== this._session) return;
        this.stop();
        if (opts.onEnd) opts.onEnd();
      }, time);
    }, ticks(toBeat - fromBeat + offset));

    this.playing = true;
    transport.start('+0.1');
  }

  stop() {
    if (typeof Tone === 'undefined') return;
    this._session++;
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.playing = false;
  }

  /** Play a single note immediately (tap-to-hear) */
  async previewNote(partId, midi, beats = 1) {
    await this.ensureAudio();
    const p = this.parts.get(partId);
    if (!p) return;
    const sec = beats * 60 / (this.pkg.tempo * this.tempoFactor);
    p.inst.trigger(midi, Math.min(Math.max(sec, 0.25), 1.5), Tone.now() + 0.02, 0.85);
  }

  dispose() {
    this.stop();
    this._disposeParts();
  }
}
