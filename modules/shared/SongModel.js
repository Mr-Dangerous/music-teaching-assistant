/**
 * SongModel.js - Song package format + notation model
 *
 * A "song package" is the JSON file produced by song-builder.html and read
 * by modules/song_player.html. All times are in quarter-note beats.
 *
 * {
 *   type: 'song-package', version: 1,
 *   title, tempo,                       // tempo = quarter-note BPM
 *   timeSig: { num, den },
 *   pickupBeats,                        // length of pickup measure (0 = none)
 *   totalBeats,
 *   phraseStarts: [0, 4, 8, 12],        // measure indices where phrases begin
 *   textDefaults: { solfege, lyrics, rhythm },
 *   defaultPart: 'p1',
 *   parts: [{
 *     id, name, kind: 'pitched'|'unpitched', instrument, volume (dB),
 *     lines: 1-5, doMidi,               // staff + solfege reference ("do" pitch)
 *     spelling: 'sharp'|'flat',         // optional; chromatic notes as di/ri/fi/si or ra/me/se/le (auto if omitted)
 *     lyrics: 'Rock- y moun- tain ...', // one token per note, '_' skips a note
 *     notes: [[t, d, midi], ...]
 *   }]
 * }
 */

export const PACKAGE_TYPE = 'song-package';
export const PACKAGE_VERSION = 1;

const EPS = 1e-6;

// Diatonic degree (do = 0) and syllable for each semitone above do.
// Sharp songs spell the in-between notes upward (di ri fi si); flat songs spell them
// downward (ra me se le). "ta" (lowered ti) is the same in both.
const CHROMATIC_SHARP = [
  { deg: 0, syl: 'do' }, { deg: 0, syl: 'di', acc: '♯' },
  { deg: 1, syl: 're' }, { deg: 1, syl: 'ri', acc: '♯' },
  { deg: 2, syl: 'mi' }, { deg: 3, syl: 'fa' },
  { deg: 3, syl: 'fi', acc: '♯' }, { deg: 4, syl: 'so' },
  { deg: 4, syl: 'si', acc: '♯' }, { deg: 5, syl: 'la' },
  { deg: 6, syl: 'ta', acc: '♭' }, { deg: 6, syl: 'ti' }
];
const CHROMATIC_FLAT = [
  { deg: 0, syl: 'do' }, { deg: 1, syl: 'ra', acc: '♭' },
  { deg: 1, syl: 're' }, { deg: 2, syl: 'me', acc: '♭' },
  { deg: 2, syl: 'mi' }, { deg: 3, syl: 'fa' },
  { deg: 4, syl: 'se', acc: '♭' }, { deg: 4, syl: 'so' },
  { deg: 5, syl: 'le', acc: '♭' }, { deg: 5, syl: 'la' },
  { deg: 6, syl: 'ta', acc: '♭' }, { deg: 6, syl: 'ti' }
];
const CHROMATIC_SEMITONES = new Set([1, 3, 6, 8]);   // the ones that differ between spellings

const DEGREE_NAMES = ['do', 're', 'mi', 'fa', 'so', 'la', 'ti'];

/** Staff line positions (diatonic degrees relative to do) for each staff size */
export const STAFF_LINES = {
  1: [0],                 // unpitched rhythm line
  2: [2, 4],              // mi, so
  3: [0, 2, 4],           // + do
  4: [0, 2, 4, 6],        // + ti
  5: [-2, 0, 2, 4, 6]     // + low la
};

export function lineName(degree) {
  const name = DEGREE_NAMES[((degree % 7) + 7) % 7];
  if (degree < 0) return 'low ' + name;
  if (degree > 6) return 'high ' + name;
  return name;
}

export const PITCH_NAMES = ['C', 'C♯/D♭', 'D', 'E♭', 'E', 'F', 'F♯/G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export function midiName(m) {
  const n = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12];
  return n + (Math.floor(m / 12) - 1);
}

export function solfegeOf(midi, doMidi, spelling = 'sharp') {
  const diff = midi - doMidi;
  const oct = Math.floor(diff / 12);
  const table = spelling === 'flat' ? CHROMATIC_FLAT : CHROMATIC_SHARP;
  const c = table[((diff % 12) + 12) % 12];
  return { degree: oct * 7 + c.deg, syl: c.syl, acc: c.acc || null };
}

/**
 * Should this part's in-between notes be spelled with sharps or flats?
 * A song package can say so with `spelling: 'sharp' | 'flat'` (on the package, or on a part).
 * Otherwise it is guessed the usual way: chromatic notes approached upward are sharps, downward are flats.
 */
export function detectSpelling(pkg, part) {
  const set = (part && part.spelling) || (pkg && pkg.spelling);
  if (set === 'sharp' || set === 'flat') return set;
  if (!part || part.kind === 'unpitched') return 'sharp';
  const notes = [...part.notes].sort((a, b) => a[0] - b[0]);
  let up = 0, down = 0;
  notes.forEach((n, i) => {
    if (!CHROMATIC_SEMITONES.has((((n[2] - part.doMidi) % 12) + 12) % 12)) return;
    const prev = notes.slice(0, i).reverse().find(x => x[2] !== n[2]);
    const next = notes.slice(i + 1).find(x => x[2] !== n[2]);
    const from = prev ? prev[2] : null;
    const ref = from !== null ? n[2] - from : next ? next[2] - n[2] : 0;   // moving up into it, or (at the start) away from it
    if (ref > 0) up++; else if (ref < 0) down++;
  });
  return down > up ? 'flat' : 'sharp';
}

// Concert-pitch letter names. The letter follows the note's staff position (so ra is D♭, not C♯) and the
// song's "do" (taken as the usual key name for its pitch class), and the accidental makes up the difference.
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];                       // C D E F G A B
const DO_LETTER = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];          // key letter for each pitch class of do (D♭ E♭ F♯ A♭ B♭ keys)
const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export function letterOf(midi, doMidi, degree) {
  const idx = (((DO_LETTER[((doMidi % 12) + 12) % 12] + degree) % 7) + 7) % 7;
  const diff = ((((midi % 12) - NATURAL_PC[idx]) % 12) + 18) % 12 - 6;   // -6..5 semitones from the natural letter
  const acc = { 0: '', 1: '♯', '-1': '♭', 2: '𝄪', '-2': '𝄫' }[diff] ?? '';
  return LETTER_NAMES[idx] + acc;
}

export function measureBeats(pkg) {
  return pkg.timeSig.num * 4 / pkg.timeSig.den;
}

/** Length of one counted beat in quarter notes (dotted quarter in compound meters) */
export function beatLength(pkg) {
  const { num, den } = pkg.timeSig;
  if (den === 8 && num % 3 === 0 && num > 3) return 1.5;
  return 4 / den;
}

export function getMeasures(pkg) {
  const mb = measureBeats(pkg);
  const list = [];
  let t = 0;
  let number = 1;
  if (pkg.pickupBeats > EPS) {
    list.push({ index: 0, start: 0, length: pkg.pickupBeats, number: 0, pickup: true });
    t = pkg.pickupBeats;
  }
  while (t < pkg.totalBeats - EPS) {
    list.push({ index: list.length, start: t, length: mb, number: number++ });
    t += mb;
  }
  return list;
}

export function getPhrases(pkg) {
  const measures = getMeasures(pkg);
  const starts = [...new Set([0, ...(pkg.phraseStarts || [])])]
    .filter(i => i >= 0 && i < measures.length)
    .sort((a, b) => a - b);
  return starts.map((first, i) => {
    const last = (i + 1 < starts.length ? starts[i + 1] : measures.length) - 1;
    return {
      index: i,
      firstMeasure: first,
      lastMeasure: last,
      start: measures[first].start,
      end: measures[last].start + measures[last].length
    };
  });
}

/** Pick the "do" octave that centers a part's notes on the staff */
export function autoDoMidi(notes, pitchClass) {
  if (!notes.length) return 60 + pitchClass;
  const sorted = notes.map(n => n[2]).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let best = 60 + pitchClass, bestScore = Infinity;
  for (let k = 0; k <= 9; k++) {
    const doMidi = pitchClass + 12 * k;
    const deg = solfegeOf(median, doMidi).degree;
    const score = Math.abs(deg - 2.5);
    if (score < bestScore) { bestScore = score; best = doMidi; }
  }
  return best;
}

// Written note values: total length, undotted base value, dots
const VALUES = [
  { v: 4, base: 4, dots: 0 },
  { v: 3, base: 2, dots: 1 },
  { v: 2, base: 2, dots: 0 },
  { v: 1.5, base: 1, dots: 1 },
  { v: 1, base: 1, dots: 0 },
  { v: 0.75, base: 0.5, dots: 1 },
  { v: 0.5, base: 0.5, dots: 0 },
  { v: 0.375, base: 0.25, dots: 1 },
  { v: 0.25, base: 0.25, dots: 0 },
  { v: 0.125, base: 0.125, dots: 0 }
];

const isMultiple = (x, step) => Math.abs(x / step - Math.round(x / step)) < EPS;

function noteAllowed(offset, v) {
  if (v === 4) return Math.abs(offset) < EPS;
  if (v >= 2) return isMultiple(offset, 1);
  if (v >= 1) return isMultiple(offset, 0.5);
  if (v >= 0.5) return isMultiple(offset, 0.25);
  return true;
}

function restAllowed(offset, v, beatLen) {
  if (v >= beatLen - EPS) {
    if (!isMultiple(offset, beatLen) || !isMultiple(v, beatLen)) return false;
    if (v === 2 && beatLen === 1) return isMultiple(offset, 2);
    return v !== 3 || beatLen === 1.5;
  }
  return Math.floor((offset + EPS) / beatLen) === Math.floor((offset + v - EPS) / beatLen);
}

/** Split a duration into written note/rest values starting at an offset in the measure */
function splitDuration(offset, len, isRest, beatLen) {
  const pieces = [];
  let guard = 0;
  while (len > EPS && guard++ < 64) {
    let pick = VALUES.find(x => x.v <= len + EPS &&
      (isRest ? restAllowed(offset, x.v, beatLen) : noteAllowed(offset, x.v)));
    if (!pick) pick = VALUES.find(x => x.v <= len + EPS) || { v: len, base: 0.125, dots: 0 };
    pieces.push({ offset, ...pick });
    offset += pick.v;
    len -= pick.v;
  }
  return pieces;
}

/** Parse lyric text into per-note tokens. '_' skips a note; trailing '-' joins to next syllable. */
export function parseLyrics(text) {
  if (!text) return [];
  return text
    .replace(/\s+-\s+/g, '- ')     // "Rock - y" -> "Rock- y"
    .split(/\s+/)
    .filter(Boolean)
    .map(tok => {
      if (tok === '_') return null;
      const hyphen = tok.endsWith('-') && tok.length > 1;
      return { text: hyphen ? tok.slice(0, -1) : tok, hyphen };
    });
}

/**
 * Build notation events for one part.
 * Returns { measures: [{...measure, events: [...]}], events, lines, minDeg, maxDeg, borrowedLyrics }
 *
 * event: { t, d, base, dots, rest, measureRest, pitches: [{midi, degree, syl, acc}],
 *          tieFromPrev, tieToNext, soundT, soundD, lyric, hyphen, rhythm (start count), beam, measure, id }
 */
export function buildPartNotation(pkg, part, buildOpts = {}) {
  const measures = getMeasures(pkg);
  const beatLen = beatLength(pkg);
  const pitched = part.kind !== 'unpitched';
  const lines = pitched ? (part.lines || 3) : 1;

  // Group simultaneous notes into chords and clip to keep the part monophonic
  const sorted = [...part.notes].sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const chords = [];
  for (const [t, d, midi] of sorted) {
    const last = chords[chords.length - 1];
    if (last && Math.abs(last.t - t) < EPS) {
      if (!last.midis.includes(midi)) last.midis.push(midi);
      last.end = Math.max(last.end, t + d);
    } else {
      chords.push({ t, end: t + d, midis: [midi] });
    }
  }
  for (let i = 0; i < chords.length - 1; i++) {
    chords[i].end = Math.min(chords[i].end, chords[i + 1].t);
  }

  const spelling = detectSpelling(pkg, part);
  const pitchInfo = (midi) => {
    if (!pitched) return { midi, degree: 0, syl: '', acc: null, letter: '' };
    const s = solfegeOf(midi, part.doMidi, spelling);
    return { midi, ...s, letter: letterOf(midi, part.doMidi, s.degree) };
  };

  const out = [];
  let ci = 0;
  for (const m of measures) {
    m.events = [];
    const mEnd = m.start + m.length;
    let cursor = m.start;

    const addRest = (from, to) => {
      for (const p of splitDuration(from - m.start, to - from, true, beatLen)) {
        m.events.push({ t: m.start + p.offset, d: p.v, base: p.base, dots: p.dots, rest: true, pitches: [] });
      }
    };

    while (ci < chords.length && chords[ci].end <= m.start + EPS) ci++;
    for (let j = ci; j < chords.length && chords[j].t < mEnd - EPS; j++) {
      const c = chords[j];
      const segStart = Math.max(c.t, m.start);
      const segEnd = Math.min(c.end, mEnd);
      if (segEnd - segStart < EPS) continue;
      if (segStart > cursor + EPS) addRest(cursor, segStart);
      const pieces = splitDuration(segStart - m.start, segEnd - segStart, false, beatLen);
      pieces.forEach((p, k) => {
        const t = m.start + p.offset;
        m.events.push({
          t, d: p.v, base: p.base, dots: p.dots, rest: false,
          pitches: [...c.midis].sort((a, b) => a - b).map(pitchInfo),
          tieFromPrev: Math.abs(t - c.t) > EPS,
          tieToNext: !(k === pieces.length - 1 && Math.abs(segEnd - c.end) < EPS),
          soundT: c.t, soundD: c.end - c.t
        });
      });
      cursor = segEnd;
    }
    if (cursor < mEnd - EPS) {
      if (Math.abs(cursor - m.start) < EPS) {
        // A whole rest fills any full measure by convention, except a measure shorter than 4 beats that is
        // exactly one undotted value (e.g. 2/4 = half rest). 3/4 keeps the whole rest.
        const exact = VALUES.find(x => x.dots === 0 && Math.abs(x.v - m.length) < EPS);
        const restBase = exact && m.length < 4 ? exact.base : 4;
        m.events.push({ t: m.start, d: m.length, base: restBase, dots: 0, rest: true, measureRest: true, pitches: [] });
      } else {
        addRest(cursor, mEnd);
      }
    }

    // Beam eighths/sixteenths that share a beat
    let group = null;
    for (const e of m.events) {
      const beatIdx = Math.floor((e.t - m.start + EPS) / beatLen);
      if (!e.rest && e.base < 1) {
        if (group && group.beat === beatIdx) group.items.push(e);
        else { if (group) finishBeam(group); group = { beat: beatIdx, items: [e] }; }
      } else {
        if (group) finishBeam(group);
        group = null;
      }
    }
    if (group) finishBeam(group);

    for (const e of m.events) {
      e.measure = m.index;
      e.id = out.length;
      out.push(e);
    }
  }

  // Band-style counting: every note gets the count it starts on (1 e + a 2 ...). A note that keeps sounding
  // past that count also gets its later counts in (parentheses). Rests get gray (parenthesized) counts.
  // e.rhythm = the start label (notes); notation.rhythmMarks = [{t, label, rest}] for every other label.
  const rhythmMarks = [];
  const compound = Math.abs(beatLen - 1.5) < EPS;
  const grids = compound ? [1, 1 / 3] : [1, 0.5, 0.25];
  const countAt = (t) => {
    const m = measures.find(mm => t >= mm.start - EPS && t < mm.start + mm.length - EPS) || measures[measures.length - 1];
    const off = (m.pickup ? measureBeats(pkg) - m.length : 0) + (t - m.start);
    const beat = Math.floor(off / beatLen + EPS);
    let frac = off / beatLen - beat;
    if (frac < EPS) frac = 0;
    const near = (x) => Math.abs(frac - x) < 1e-3;
    if (frac === 0) return String(beat + 1);
    if (compound) return near(1 / 3) ? 'la' : near(2 / 3) ? 'li' : null;
    return near(0.25) ? 'e' : near(0.5) ? '+' : near(0.75) ? 'a' : null;
  };
  const whole = (x, g) => Math.abs(x / g - Math.round(x / g)) < 1e-3;
  for (const e of out) {
    if (e.tieFromPrev) continue;
    const start = e.rest ? e.t : e.soundT;
    const dur = (e.rest ? e.d : e.soundD) / beatLen;                 // in beats
    const startFrac = ((start - measures[e.measure].start + (measures[e.measure].pickup ? measureBeats(pkg) - measures[e.measure].length : 0)) / beatLen) % 1;
    // finest step this note's start and length both land on, so a dotted quarter counts 1 (+) (2)
    const g = grids.find(x => whole(startFrac, x) && whole(dur, x)) || dur;
    for (let p = 0, k = 0; p < dur - 1e-3; p += g, k++) {
      const label = countAt(start + p * beatLen);
      if (!label) continue;
      if (k === 0 && !e.rest) e.rhythm = label;
      else rhythmMarks.push({ t: start + p * beatLen, label: e.rest || k > 0 ? '(' + label + ')' : label, rest: !!e.rest });
    }
  }

  // Lyrics: one token per sounding note (tie continuations don't take syllables)
  const tokens = parseLyrics(part.lyrics);
  let li = 0;
  for (const e of out) {
    if (e.rest || e.tieFromPrev) continue;
    if (li >= tokens.length) break;
    const tok = tokens[li++];
    if (tok) { e.lyric = tok.text; e.hyphen = tok.hyphen; }
  }

  // A part with no lyrics of its own borrows the syllables of the first part that has some, placed by beat
  // time (so a drum shows the words under whatever it plays at that moment). `borrowedLyrics` = [{t, text, hyphen}]
  let borrowedLyrics = [];
  if (!tokens.length && buildOpts.borrow !== false) {
    const src = pkg.parts.find(p => p.id !== part.id && parseLyrics(p.lyrics).length);
    if (src) {
      borrowedLyrics = buildPartNotation(pkg, src, { borrow: false }).events
        .filter(e => e.lyric)
        .map(e => ({ t: e.soundT, text: e.lyric, hyphen: !!e.hyphen }));
    }
  }

  let minDeg = Infinity, maxDeg = -Infinity;
  for (const e of out) for (const p of e.pitches) {
    minDeg = Math.min(minDeg, p.degree);
    maxDeg = Math.max(maxDeg, p.degree);
  }
  const staff = STAFF_LINES[lines];
  minDeg = Math.min(minDeg, staff[0]);
  maxDeg = Math.max(maxDeg, staff[staff.length - 1]);

  return { measures, events: out, lines, staff, minDeg, maxDeg, beatLen, spelling, borrowedLyrics, rhythmMarks };
}

let beamCounter = 0;
function finishBeam(group) {
  if (group.items.length < 2) return;
  const id = ++beamCounter;
  group.items.forEach(e => { e.beam = id; });
}

/** Lyrics need a note count to line up; this lists the notes a lyric token will land on */
export function lyricSlots(pkg, part) {
  return buildPartNotation(pkg, { ...part, lyrics: '' }, { borrow: false }).events
    .filter(e => !e.rest && !e.tieFromPrev);
}

export function slugify(s) {
  return (s || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'song';
}

export function validatePackage(pkg) {
  if (!pkg || pkg.type !== PACKAGE_TYPE) throw new Error('Not a song package file');
  if (!Array.isArray(pkg.parts) || !pkg.parts.length) throw new Error('Song package has no parts');
  return pkg;
}
