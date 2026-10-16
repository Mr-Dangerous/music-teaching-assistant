/**
 * SongInstruments.js - Synthesized instrument presets for the Song Player
 *
 * All sounds are built from Tone.js synths (no sample downloads), so they work
 * offline. Requires the global `Tone` (load Tone.js before using createInstrument).
 *
 *   import { INSTRUMENTS, createInstrument, guessInstrument } from './SongInstruments.js';
 *   const inst = createInstrument('triangle');
 *   inst.output.connect(destination);
 *   inst.trigger(midi, durationSeconds, time, velocity);
 */

const P = (id, label, group, make) => ({ id, label, group, pitched: true, make });
const U = (id, label, group, make) => ({ id, label, group, pitched: false, make });

const CLASSROOM = 'Classroom Percussion';
const MALLETS = 'Classroom Pitched';
const WINDS = 'Woodwinds';
const BRASS = 'Brass';
const STRINGS = 'Strings';
const OTHER = 'Other';

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Building blocks ----

function membrane(note, opts, maxDur = 0.6) {
  const s = new Tone.MembraneSynth(opts);
  return {
    nodes: [s], out: s,
    trigger: (m, d, t, v) => s.triggerAttackRelease(note, Math.min(d, maxDur), t, v)
  };
}

function pitchedMembrane(opts) {
  const s = new Tone.MembraneSynth(opts);
  return {
    nodes: [s], out: s,
    trigger: (m, d, t, v) => s.triggerAttackRelease(freq(m), Math.min(d, 1.5), t, v)
  };
}

function noise({ type = 'white', decay = 0.1, filter = 'highpass', cutoff = 5000, q = 1, attack = 0.002 }) {
  const f = new Tone.Filter({ type: filter, frequency: cutoff, Q: q });
  const s = new Tone.NoiseSynth({ noise: { type }, envelope: { attack, decay, sustain: 0, release: 0.02 } });
  s.connect(f);
  return { nodes: [s, f], out: f, trigger: (m, d, t, v) => s.triggerAttackRelease(decay, t, v) };
}

/** Struck metal: a few sine partials at fixed frequencies */
function partials(list, type = 'sine') {
  const out = new Tone.Gain(1);
  const voices = list.map(([f, gain, decay]) => {
    const g = new Tone.Gain(gain).connect(out);
    const s = new Tone.Synth({
      oscillator: { type },
      envelope: { attack: 0.001, decay, sustain: 0, release: decay * 0.5 }
    }).connect(g);
    return { s, g, f, decay };
  });
  return {
    nodes: [out, ...voices.flatMap(x => [x.s, x.g])], out,
    trigger: (m, d, t, v) => voices.forEach(x => x.s.triggerAttackRelease(x.f, x.decay, t, v))
  };
}

function combine(...blocks) {
  const out = new Tone.Gain(1);
  blocks.forEach(b => b.out.connect(out));
  return {
    nodes: [out, ...blocks.flatMap(b => b.nodes)], out,
    trigger: (m, d, t, v) => blocks.forEach(b => b.trigger(m, d, t, v))
  };
}

/** Polyphonic pitched synth with optional filter / vibrato chain */
function poly(Voice, opts, { filter, vibrato, maxDur } = {}) {
  const s = new Tone.PolySynth(Voice, opts);
  s.maxPolyphony = 12;
  const nodes = [s];
  let last = s;
  if (filter) {
    const f = new Tone.Filter(filter);
    last.connect(f); last = f; nodes.push(f);
  }
  if (vibrato) {
    const vb = new Tone.Vibrato(vibrato);
    last.connect(vb); last = vb; nodes.push(vb);
  }
  return {
    nodes, out: last,
    trigger: (m, d, t, v) => s.triggerAttackRelease(freq(m), maxDur ? Math.min(d, maxDur) : d, t, v)
  };
}

/** Plucked strings - PluckSynth is monophonic, so rotate through a small pool */
function plucked(opts) {
  const out = new Tone.Gain(1);
  const pool = Array.from({ length: 6 }, () => new Tone.PluckSynth(opts).connect(out));
  let i = 0;
  return {
    nodes: [out, ...pool], out,
    trigger: (m, d, t, v) => { pool[i++ % pool.length].triggerAttackRelease(freq(m), d, t, v); }
  };
}

const brass = (cutoff, attack) => [Tone.MonoSynth, {
  oscillator: { type: 'sawtooth' },
  envelope: { attack, decay: 0.2, sustain: 0.75, release: 0.15 },
  filter: { Q: 1.5, type: 'lowpass', rolloff: -24 },
  filterEnvelope: { attack: attack * 1.5, decay: 0.3, sustain: 0.6, release: 0.2, baseFrequency: cutoff * 0.35, octaves: 2.2 }
}];

const reed = (type, cutoff, q = 1) => [Tone.MonoSynth, {
  oscillator: { type },
  envelope: { attack: 0.04, decay: 0.1, sustain: 0.85, release: 0.1 },
  filter: { Q: q, type: 'lowpass', rolloff: -12 },
  filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.9, release: 0.1, baseFrequency: cutoff, octaves: 1 }
}];

const bowed = (cutoff) => [Tone.MonoSynth, {
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.09, decay: 0.2, sustain: 0.85, release: 0.25 },
  filter: { Q: 1, type: 'lowpass', rolloff: -24 },
  filterEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.8, release: 0.3, baseFrequency: cutoff, octaves: 1.2 }
}];

const mallet = (harmonicity, modIndex, decay) => [Tone.FMSynth, {
  harmonicity, modulationIndex: modIndex,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay, sustain: 0, release: decay * 0.6 },
  modulation: { type: 'sine' },
  modulationEnvelope: { attack: 0.001, decay: decay * 0.3, sustain: 0, release: 0.05 }
}];

// ---- Instrument catalog ----

export const INSTRUMENTS = [
  // Classroom percussion (unpitched)
  U('hand_drum', 'Hand Drum', CLASSROOM, () => combine(
    membrane('D3', { pitchDecay: 0.03, octaves: 2.5, envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.1 } }),
    noise({ decay: 0.03, filter: 'bandpass', cutoff: 1800, q: 0.8 })
  )),
  U('bongos', 'Bongos', CLASSROOM, () => membrane('A4', { pitchDecay: 0.015, octaves: 1.6, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } })),
  U('conga', 'Conga', CLASSROOM, () => membrane('E3', { pitchDecay: 0.02, octaves: 1.8, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 } })),
  U('bass_drum', 'Bass Drum', CLASSROOM, () => membrane('C2', { pitchDecay: 0.06, octaves: 5, envelope: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.2 } })),
  U('snare_drum', 'Snare Drum', CLASSROOM, () => combine(
    membrane('G3', { pitchDecay: 0.01, octaves: 1.5, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 } }),
    noise({ decay: 0.18, filter: 'highpass', cutoff: 2200 })
  )),
  U('triangle', 'Triangle', CLASSROOM, () => partials([[2350, 0.5, 2.2], [4410, 0.3, 1.6], [6630, 0.18, 1.1], [8900, 0.08, 0.7]])),
  U('maracas', 'Maracas / Shaker', CLASSROOM, () => noise({ decay: 0.07, filter: 'highpass', cutoff: 5500, attack: 0.006 })),
  U('tambourine', 'Tambourine', CLASSROOM, () => combine(
    noise({ decay: 0.18, filter: 'highpass', cutoff: 7000 }),
    partials([[5200, 0.12, 0.25], [6900, 0.1, 0.2], [8100, 0.08, 0.18]])
  )),
  U('woodblock', 'Wood Block', CLASSROOM, () => membrane('E5', { pitchDecay: 0.006, octaves: 1.2, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.02 } })),
  U('temple_blocks', 'Temple Block', CLASSROOM, () => membrane('G4', { pitchDecay: 0.008, octaves: 1, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.03 } })),
  U('claves', 'Claves', CLASSROOM, () => partials([[2500, 0.8, 0.06], [3600, 0.2, 0.04]])),
  U('cowbell', 'Cowbell', CLASSROOM, () => {
    const b = partials([[545, 0.45, 0.35], [815, 0.4, 0.3]], 'square');
    const f = new Tone.Filter({ type: 'bandpass', frequency: 900, Q: 1.5 });
    b.out.connect(f);
    return { nodes: [...b.nodes, f], out: f, trigger: b.trigger };
  }),
  U('guiro', 'Guiro', CLASSROOM, () => {
    const n = noise({ decay: 0.018, filter: 'bandpass', cutoff: 3000, q: 1.2 });
    return { ...n, trigger: (m, d, t, v) => { for (let k = 0; k < 7; k++) n.trigger(m, d, t + k * 0.028, v * 0.9); } };
  }),
  U('finger_cymbals', 'Finger Cymbals', CLASSROOM, () => partials([[3720, 0.45, 2.5], [5150, 0.3, 2.0], [7090, 0.15, 1.4]])),
  U('jingle_bells', 'Jingle Bells', CLASSROOM, () => combine(
    noise({ decay: 0.22, filter: 'highpass', cutoff: 6500 }),
    partials([[4600, 0.1, 0.3], [6100, 0.08, 0.25]])
  )),
  U('cymbal', 'Suspended Cymbal', CLASSROOM, () => {
    const s = new Tone.MetalSynth({ envelope: { attack: 0.002, decay: 1.6, release: 0.3 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5 });
    return { nodes: [s], out: s, trigger: (m, d, t, v) => s.triggerAttackRelease(300, 1.6, t, v) };
  }),

  // Classroom pitched
  P('xylophone', 'Xylophone', MALLETS, () => poly(...mallet(3.99, 1.4, 0.45), { maxDur: 0.5 })),
  P('marimba', 'Marimba', MALLETS, () => poly(...mallet(3.99, 0.8, 0.9), { maxDur: 1 })),
  P('glockenspiel', 'Glockenspiel', MALLETS, () => poly(...mallet(3.52, 2.5, 1.8))),
  P('metallophone', 'Metallophone', MALLETS, () => poly(...mallet(2.0, 0.6, 2.5))),
  P('handbells', 'Handbells', MALLETS, () => poly(...mallet(2.76, 1.8, 2.8))),
  P('boomwhacker', 'Boomwhacker', MALLETS, () => poly(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.22, sustain: 0, release: 0.08 }
  }, { filter: { type: 'lowpass', frequency: 2200 }, maxDur: 0.3 })),
  P('timpani', 'Timpani', MALLETS, () => pitchedMembrane({ pitchDecay: 0.08, octaves: 0.6, envelope: { attack: 0.002, decay: 1.2, sustain: 0, release: 0.4 } })),
  P('recorder', 'Recorder', MALLETS, () => poly(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.03, decay: 0.05, sustain: 0.9, release: 0.08 }
  }, { filter: { type: 'lowpass', frequency: 3000 }, vibrato: { frequency: 4.5, depth: 0.04 } })),
  P('piano', 'Piano', MALLETS, () => poly(Tone.Synth, {
    oscillator: { type: 'fattriangle', spread: 12, count: 3 }, envelope: { attack: 0.003, decay: 1.2, sustain: 0.15, release: 0.6 }
  }, { filter: { type: 'lowpass', frequency: 3500 } })),
  P('ukulele', 'Ukulele', MALLETS, () => plucked({ attackNoise: 1.2, dampening: 3800, resonance: 0.92 })),
  P('guitar', 'Guitar', MALLETS, () => plucked({ attackNoise: 1, dampening: 3000, resonance: 0.96 })),

  // Woodwinds
  P('flute', 'Flute', WINDS, () => poly(Tone.Synth, {
    oscillator: { type: 'sine' }, envelope: { attack: 0.06, decay: 0.1, sustain: 0.9, release: 0.12 }
  }, { vibrato: { frequency: 5, depth: 0.06 } })),
  P('piccolo', 'Piccolo', WINDS, () => poly(Tone.Synth, {
    oscillator: { type: 'sine' }, envelope: { attack: 0.04, decay: 0.1, sustain: 0.9, release: 0.1 }
  }, { vibrato: { frequency: 5.5, depth: 0.05 } })),
  P('oboe', 'Oboe', WINDS, () => poly(...reed('pulse', 1400, 3), { vibrato: { frequency: 5, depth: 0.04 } })),
  P('clarinet', 'Clarinet', WINDS, () => poly(...reed('square', 1100, 1))),
  P('bassoon', 'Bassoon', WINDS, () => poly(...reed('pulse', 500, 2))),
  P('alto_sax', 'Saxophone', WINDS, () => poly(...reed('sawtooth', 900, 2), { vibrato: { frequency: 5, depth: 0.05 } })),

  // Brass
  P('trumpet', 'Trumpet', BRASS, () => poly(...brass(2600, 0.03))),
  P('french_horn', 'French Horn', BRASS, () => poly(...brass(900, 0.07))),
  P('trombone', 'Trombone', BRASS, () => poly(...brass(1300, 0.06))),
  P('euphonium', 'Baritone / Euphonium', BRASS, () => poly(...brass(800, 0.06))),
  P('tuba', 'Tuba', BRASS, () => poly(...brass(450, 0.07))),

  // Strings
  P('violin', 'Violin', STRINGS, () => poly(...bowed(1400), { vibrato: { frequency: 5.5, depth: 0.08 } })),
  P('viola', 'Viola', STRINGS, () => poly(...bowed(1000), { vibrato: { frequency: 5.2, depth: 0.08 } })),
  P('cello', 'Cello', STRINGS, () => poly(...bowed(700), { vibrato: { frequency: 5, depth: 0.08 } })),
  P('string_bass', 'String Bass', STRINGS, () => poly(Tone.MonoSynth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.6, sustain: 0.3, release: 0.3 },
    filter: { type: 'lowpass', Q: 1 }, filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3, baseFrequency: 300, octaves: 1.5 }
  })),

  // Other
  P('voice', 'Voice (oo)', OTHER, () => poly(Tone.AMSynth, {
    harmonicity: 2, oscillator: { type: 'sine' }, envelope: { attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.3 },
    modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.3 }
  }, { vibrato: { frequency: 5, depth: 0.07 } })),
  P('synth_lead', 'Synth (square)', OTHER, () => poly(Tone.Synth, {
    oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 }
  }, { filter: { type: 'lowpass', frequency: 2500 } }))
];

// Loudness balance between presets (dB)
const TRIM = {
  hand_drum: 0, bongos: -4, conga: -2, bass_drum: 0, snare_drum: -6, triangle: -10, maracas: -10,
  tambourine: -10, woodblock: -6, temple_blocks: -6, claves: -10, cowbell: -12, guiro: -8,
  finger_cymbals: -12, jingle_bells: -10, cymbal: -18,
  xylophone: -4, marimba: -3, glockenspiel: -10, metallophone: -8, handbells: -9, boomwhacker: -6,
  timpani: -2, recorder: -10, piano: -10, ukulele: -2, guitar: -2,
  flute: -10, piccolo: -14, oboe: -14, clarinet: -14, bassoon: -12, alto_sax: -15,
  trumpet: -16, french_horn: -12, trombone: -14, euphonium: -12, tuba: -10,
  violin: -15, viola: -14, cello: -12, string_bass: -6, voice: -10, synth_lead: -18
};

export function getInstrument(id) {
  return INSTRUMENTS.find(i => i.id === id) || INSTRUMENTS.find(i => i.id === 'piano');
}

export function instrumentGroups() {
  const groups = new Map();
  for (const inst of INSTRUMENTS) {
    if (!groups.has(inst.group)) groups.set(inst.group, []);
    groups.get(inst.group).push(inst);
  }
  return groups;
}

/** Build a playable instrument. Returns { trigger(midi, dur, time, vel), output, dispose() } */
export function createInstrument(id) {
  const def = getInstrument(id);
  const block = def.make();
  const output = new Tone.Volume(TRIM[def.id] ?? -8);
  block.out.connect(output);
  return {
    id: def.id,
    pitched: def.pitched,
    output,
    trigger: (midi, dur, time, vel = 0.8) => {
      try { block.trigger(midi, Math.max(dur, 0.03), time, vel); } catch (e) { /* overlapping trigger */ }
    },
    dispose: () => {
      block.nodes.forEach(n => { try { n.dispose(); } catch (e) { /* already disposed */ } });
      output.dispose();
    }
  };
}

const NAME_HINTS = [
  [/bongo/i, 'bongos'], [/conga/i, 'conga'], [/bass\s*drum/i, 'bass_drum'], [/snare/i, 'snare_drum'],
  [/triangle/i, 'triangle'], [/maraca|shaker|egg/i, 'maracas'], [/tambourine/i, 'tambourine'],
  [/wood\s*block/i, 'woodblock'], [/temple/i, 'temple_blocks'], [/clave/i, 'claves'],
  [/cowbell/i, 'cowbell'], [/guiro/i, 'guiro'], [/finger\s*cym/i, 'finger_cymbals'],
  [/jingle|sleigh/i, 'jingle_bells'], [/cymbal/i, 'cymbal'],
  [/bass\s*xyl|xylo/i, 'xylophone'], [/marimba/i, 'marimba'], [/glock/i, 'glockenspiel'],
  [/metallo/i, 'metallophone'], [/handbell|bell/i, 'handbells'], [/boomwhack/i, 'boomwhacker'],
  [/timpani/i, 'timpani'], [/recorder/i, 'recorder'], [/piano|keyboard/i, 'piano'],
  [/ukulele|uke/i, 'ukulele'], [/guitar/i, 'guitar'],
  [/piccolo/i, 'piccolo'], [/flute/i, 'flute'], [/oboe/i, 'oboe'], [/clarinet/i, 'clarinet'],
  [/bassoon/i, 'bassoon'], [/sax/i, 'alto_sax'], [/trumpet|cornet/i, 'trumpet'],
  [/horn/i, 'french_horn'], [/trombone/i, 'trombone'], [/euphonium|baritone/i, 'euphonium'],
  [/tuba/i, 'tuba'], [/violin|fiddle/i, 'violin'], [/viola/i, 'viola'], [/cello/i, 'cello'],
  [/string\s*bass|contrabass|double\s*bass/i, 'string_bass'],
  [/voice|vocal|sing/i, 'voice'],
  [/hand\s*drum|frame\s*drum|rhythm|drum|beat/i, 'hand_drum']
];

/** Guess a preset from a MIDI track's name, GM program and channel */
export function guessInstrument(name, program, channel) {
  for (const [re, id] of NAME_HINTS) if (re.test(name || '')) return id;
  if (channel === 9) return 'hand_drum';
  const p = program ?? 0;
  if (p <= 7) return 'piano';
  if (p === 8 || p === 9 || p === 10) return 'glockenspiel';
  if (p === 11) return 'metallophone';
  if (p === 12) return 'marimba';
  if (p === 13) return 'xylophone';
  if (p === 14) return 'handbells';
  if (p >= 24 && p <= 31) return 'guitar';
  if (p >= 32 && p <= 39) return 'string_bass';
  if (p === 40) return 'violin';
  if (p === 41) return 'viola';
  if (p === 42) return 'cello';
  if (p === 43) return 'string_bass';
  if (p === 47) return 'timpani';
  if (p >= 52 && p <= 54) return 'voice';
  if (p === 56 || p === 59) return 'trumpet';
  if (p === 57) return 'trombone';
  if (p === 58) return 'tuba';
  if (p === 60) return 'french_horn';
  if (p >= 64 && p <= 67) return 'alto_sax';
  if (p === 68 || p === 69) return 'oboe';
  if (p === 70) return 'bassoon';
  if (p === 71) return 'clarinet';
  if (p === 72) return 'piccolo';
  if (p === 73 || p === 75) return 'flute';
  if (p === 74) return 'recorder';
  return 'piano';
}
