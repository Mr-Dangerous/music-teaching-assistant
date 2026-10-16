/**
 * SongImport.js - Turn a parsed MIDI file into a starting song package
 *
 * Used by song-builder.html. The teacher then adjusts staff lines, phrases,
 * instruments and lyrics before saving the package.
 */

import { PACKAGE_TYPE, PACKAGE_VERSION, autoDoMidi, measureBeats, getMeasures } from './SongModel.js';
import { guessInstrument } from './SongInstruments.js';

export function quantizeNotes(notes, q) {
  const out = [];
  for (const n of notes) {
    const t = Math.round(n.t / q) * q;
    const d = Math.max(q, Math.round(n.d / q) * q);
    out.push([round(t), round(d), n.midi]);
  }
  return out;
}

const round = (x) => Math.round(x * 10000) / 10000;

/** Song length rounded up to a full measure (after the pickup) */
export function computeTotalBeats(pkg) {
  let end = 0;
  for (const p of pkg.parts) for (const [t, d] of p.notes) end = Math.max(end, t + d);
  const mb = measureBeats(pkg);
  const pickup = pkg.pickupBeats || 0;
  const body = Math.max(end - pickup, mb);
  return round(pickup + Math.ceil(body / mb - 1e-6) * mb);
}

export function defaultPhraseStarts(pkg, every = 4) {
  const measures = getMeasures(pkg);
  const first = measures[0] && measures[0].pickup ? 1 : 0;
  const starts = [0];
  for (let i = first + every; i < measures.length; i += every) starts.push(i);
  return starts;
}

/** do pitch class from the key signature (major or relative minor share the same do) */
export function doFromKeySig(keySig) {
  if (!keySig) return null;
  return ((keySig.sharps * 7) % 12 + 12) % 12;
}

export function packageFromMidi(midi, fileName = '', quantize = 0.25) {
  const tracks = midi.tracks.filter(t => t.notes.length);
  const title = midi.title || fileName.replace(/\.midi?$/i, '').replace(/[-_]+/g, ' ').trim() || 'New Song';

  const parts = tracks.map((t, i) => {
    const unpitched = t.channel === 9;
    return {
      id: 'p' + (i + 1),
      name: t.name || (unpitched ? 'Percussion ' + (i + 1) : 'Part ' + (i + 1)),
      kind: unpitched ? 'unpitched' : 'pitched',
      instrument: guessInstrument(t.name, t.program, t.channel),
      volume: 0,
      lines: unpitched ? 1 : 3,
      doMidi: 60,
      lyrics: '',
      notes: quantizeNotes(t.notes, quantize),
      sourceTrack: t.index
    };
  });

  // do: key signature, else the melody's final note
  let doPc = doFromKeySig(midi.keySig);
  const firstPitched = parts.find(p => p.kind === 'pitched');
  if (doPc === null && firstPitched && firstPitched.notes.length) {
    doPc = firstPitched.notes[firstPitched.notes.length - 1][2] % 12;
  }
  if (doPc === null) doPc = 0;
  parts.forEach(p => { if (p.kind === 'pitched') p.doMidi = autoDoMidi(p.notes, doPc); });

  const pkg = {
    type: PACKAGE_TYPE,
    version: PACKAGE_VERSION,
    title,
    tempo: midi.tempo,
    timeSig: { ...midi.timeSig },
    pickupBeats: 0,
    totalBeats: 0,
    phraseStarts: [0],
    textDefaults: { solfege: true, lyrics: true, rhythm: false },
    defaultPart: firstPitched ? firstPitched.id : parts[0]?.id,
    doPitchClass: doPc,
    quantize,
    parts
  };
  pkg.totalBeats = computeTotalBeats(pkg);
  pkg.phraseStarts = defaultPhraseStarts(pkg, 4);
  return pkg;
}
