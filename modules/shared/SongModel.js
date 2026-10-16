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
 *     lyrics: 'Rock- y moun- tain ...', // one token per note, '_' skips a note
 *     notes: [[t, d, midi], ...]
 *   }]
 * }
 */

export const PACKAGE_TYPE = 'song-package';
export const PACKAGE_VERSION = 1;

const EPS = 1e-6;

// Diatonic degree (do = 0) and syllable for each semitone above do
const CHROMATIC = [
  { deg: 0, syl: 'do' }, { deg: 0, syl: 'di', acc: '♯' },
  { deg: 1, syl: 're' }, { deg: 1, syl: 'ri', acc: '♯' },
  { deg: 2, syl: 'mi' }, { deg: 3, syl: 'fa' },
  { deg: 3, syl: 'fi', acc: '♯' }, { deg: 4, syl: 'so' },
  { deg: 4, syl: 'si', acc: '♯' }, { deg: 5, syl: 'la' },
  { deg: 6, syl: 'ta', acc: '♭' }, { deg: 6, syl: 'ti' }
];

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

export function solfegeOf(midi, doMidi) {
  const diff = midi - doMidi;
  const oct = Math.floor(diff / 12);
  const c = CHROMATIC[((diff % 12) + 12) % 12];
  return { degree: oct * 7 + c.deg, syl: c.syl, acc: c.acc || null };
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

function rhythmSyllable(len, offsetInBeat) {
  const r = (x) => Math.abs(len - x) < EPS;
  if (r(4)) return 'to-e-e-e';
  if (r(3)) return 'to-e-e';
  if (r(2)) return 'to-e';
  if (r(1.5)) return 'tai';
  if (r(1)) return 'ta';
  if (r(0.75)) return 'tim';
  if (r(0.5)) return 'ti';
  if (r(0.25)) return isMultiple(offsetInBeat, 0.5) ? 'ti' : 'ka';
  if (len > 1) return 'to' + '-e'.repeat(Math.round(len) - 1);
  return 'ti';
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
 * Returns { measures: [{...measure, events: [...]}], events, lines, minDeg, maxDeg }
 *
 * event: { t, d, base, dots, rest, measureRest, pitches: [{midi, degree, syl, acc}],
 *          tieFromPrev, tieToNext, soundT, soundD, lyric, hyphen, rhythm, beam, measure, id }
 */
export function buildPartNotation(pkg, part) {
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

  const pitchInfo = (midi) => {
    if (!pitched) return { midi, degree: 0, syl: '', acc: null };
    return { midi, ...solfegeOf(midi, part.doMidi) };
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
        m.events.push({ t: m.start, d: m.length, base: 4, dots: 0, rest: true, measureRest: true, pitches: [] });
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
      const offsetInBeat = (e.t - m.start) % beatLen;
      if (e.rest) e.rhythm = 'sh';
      else if (!e.tieFromPrev) e.rhythm = rhythmSyllable(e.soundD, offsetInBeat);
      out.push(e);
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

  let minDeg = Infinity, maxDeg = -Infinity;
  for (const e of out) for (const p of e.pitches) {
    minDeg = Math.min(minDeg, p.degree);
    maxDeg = Math.max(maxDeg, p.degree);
  }
  const staff = STAFF_LINES[lines];
  minDeg = Math.min(minDeg, staff[0]);
  maxDeg = Math.max(maxDeg, staff[staff.length - 1]);

  return { measures, events: out, lines, staff, minDeg, maxDeg, beatLen };
}

let beamCounter = 0;
function finishBeam(group) {
  if (group.items.length < 2) return;
  const id = ++beamCounter;
  group.items.forEach(e => { e.beam = id; });
}

/** Lyrics need a note count to line up; this lists the notes a lyric token will land on */
export function lyricSlots(pkg, part) {
  return buildPartNotation(pkg, { ...part, lyrics: '' }).events
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
