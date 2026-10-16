/**
 * MidiFile.js - Minimal Standard MIDI File parser
 *
 * Parses format 0/1 MIDI files into tracks with notes measured in
 * quarter-note beats. Used by the Song Builder to import songs.
 *
 * Usage:
 *   import { parseMidi } from './MidiFile.js';
 *   const midi = parseMidi(arrayBuffer);
 *   // midi.tracks[i].notes = [{ t, d, midi, vel, ch }]  (t, d in beats)
 */

export function parseMidi(buffer) {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let pos = 0;

  const readStr = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(data[pos + i]);
    pos += n;
    return s;
  };

  if (readStr(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd header)');
  const headerLen = view.getUint32(pos); pos += 4;
  const format = view.getUint16(pos);
  const trackCount = view.getUint16(pos + 2);
  const division = view.getUint16(pos + 4);
  pos += headerLen;
  if (division & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported');

  const result = {
    format,
    division,
    tempo: null,          // quarter-note BPM (first tempo event)
    timeSig: null,        // { num, den }
    keySig: null,         // { sharps, minor }
    title: null,
    tracks: []
  };

  for (let tr = 0; tr < trackCount && pos < data.length; tr++) {
    const id = readStr(4);
    const len = view.getUint32(pos); pos += 4;
    const end = pos + len;
    if (id !== 'MTrk') { pos = end; continue; }

    const track = { index: tr, name: '', program: null, channel: null, notes: [] };
    const open = new Map();   // key ch*128+note -> {tick, vel}
    let tick = 0;
    let status = 0;

    const readVLQ = () => {
      let v = 0, b;
      do { b = data[pos++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80);
      return v;
    };

    const closeNote = (ch, note, atTick) => {
      const key = ch * 128 + note;
      const on = open.get(key);
      if (!on) return;
      open.delete(key);
      track.notes.push({
        t: on.tick / division,
        d: Math.max(atTick - on.tick, 1) / division,
        midi: note,
        vel: on.vel,
        ch
      });
    };

    while (pos < end) {
      tick += readVLQ();
      let b = data[pos];

      if (b === 0xff) {
        const type = data[pos + 1];
        pos += 2;
        const l = readVLQ();
        const bytes = data.subarray(pos, pos + l);
        pos += l;
        if (type === 0x03) {
          const text = String.fromCharCode(...bytes).trim();
          if (!track.name) track.name = text;
        } else if (type === 0x04 && !track.name) {
          track.name = String.fromCharCode(...bytes).trim();
        } else if (type === 0x51 && result.tempo === null) {
          const us = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
          result.tempo = Math.round(60000000 / us * 100) / 100;
        } else if (type === 0x58 && result.timeSig === null) {
          result.timeSig = { num: bytes[0], den: Math.pow(2, bytes[1]) };
        } else if (type === 0x59 && result.keySig === null) {
          const sf = bytes[0] > 127 ? bytes[0] - 256 : bytes[0];
          result.keySig = { sharps: sf, minor: bytes[1] === 1 };
        }
        continue;
      }

      if (b === 0xf0 || b === 0xf7) {
        pos++;
        pos += readVLQ();
        continue;
      }

      if (b & 0x80) { status = b; pos++; }
      const type = status >> 4;
      const ch = status & 0x0f;

      if (type === 0xc || type === 0xd) {
        if (type === 0xc && track.program === null) track.program = data[pos];
        pos += 1;
        continue;
      }

      const a = data[pos], v = data[pos + 1];
      pos += 2;
      if (type === 0x9 && v > 0) {
        closeNote(ch, a, tick);  // retrigger closes any held copy
        open.set(ch * 128 + a, { tick, vel: v });
        if (track.channel === null) track.channel = ch;
      } else if (type === 0x8 || (type === 0x9 && v === 0)) {
        closeNote(ch, a, tick);
      }
    }

    for (const key of [...open.keys()]) closeNote(Math.floor(key / 128), key % 128, tick);
    track.notes.sort((x, y) => x.t - y.t || x.midi - y.midi);
    pos = end;
    result.tracks.push(track);
  }

  // Song title: first track's name in a format-1 file is conventionally the title
  if (format === 1 && result.tracks[0] && result.tracks[0].notes.length === 0) {
    result.title = result.tracks[0].name || null;
  }
  if (!result.tempo) result.tempo = 120;
  if (!result.timeSig) result.timeSig = { num: 4, den: 4 };
  return result;
}
