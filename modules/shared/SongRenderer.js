/**
 * SongRenderer.js - Draws one phrase (row) of a song part as SVG markup
 *
 * Staff spacing, note spacing and text lines are computed once per song with
 * layoutSong() so every row lines up the same way. renderRow() returns an SVG
 * string plus geometry (beat positions) used by the player's moving beat bar.
 *
 * Usage:
 *   const layout = layoutSong(notation, phrases, { width, height, text });
 *   const row = renderRow(notation, layout, phrase, { showTimeSig, timeSig, isSongEnd });
 *   container.innerHTML = row.svg;
 *   row.beatX(t) -> x position of beat time t within that row
 */

import { lineName } from './SongModel.js';

const EPS = 1e-6;
const INK = '#1d1d35';
const BG = '#ffffff';

const fmt = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function eventWeight(e) {
  return 0.35 + Math.pow(e.measureRest ? 1.2 : e.d, 0.7);
}

function textLinesFor(notation, text) {
  const lines = [];
  if (text.lyrics && notation.events.some(e => e.lyric)) lines.push('lyrics');
  if (text.solfege && notation.lines > 1) lines.push('solfege');
  if (text.rhythm) lines.push('rhythm');
  return lines;
}

/**
 * Compute shared sizing for all rows of a part.
 * opts: { width, height (per row, px), text: { solfege, lyrics, rhythm } }
 */
export function layoutSong(notation, phrases, opts) {
  const { width, height } = opts;
  const textLines = textLinesFor(notation, opts.text || {});
  const staff = notation.staff;
  const topLine = staff[staff.length - 1];
  const bottomLine = staff[0];
  const unpitched = notation.lines === 1;

  const staffSpan = (topLine - bottomLine) / 2;
  const topExt = 1.4 + Math.max(unpitched ? 3.4 : 3.0, (notation.maxDeg - topLine) / 2 + 1.4);
  const bottomExt = unpitched ? 1.6 : Math.max(2.8, (bottomLine - notation.minDeg) / 2 + 1.6);
  const textH = 1.75;
  const units = topExt + staffSpan + bottomExt + textLines.length * textH + 0.4;

  let S = Math.min(height / units, width / 36);

  const rows = phrases.map(ph => {
    let w = 0, n = 0;
    for (let mi = ph.firstMeasure; mi <= ph.lastMeasure; mi++) {
      n++;
      for (const e of notation.measures[mi].events) w += eventWeight(e);
    }
    return { w, n };
  });

  const HEADER = 5.0, PAD = 1.9, MIN_UNIT = 2.5;
  for (const r of rows) {
    S = Math.min(S, width / (HEADER + PAD * r.n + MIN_UNIT * r.w));
  }
  let unitPx = Infinity;
  for (const r of rows) unitPx = Math.min(unitPx, (width - S * (HEADER + PAD * r.n)) / r.w);
  unitPx = Math.min(unitPx, S * 7);

  const staffTop = topExt * S;
  return {
    S, unitPx, width, height, textLines,
    headerW: HEADER * S, labelW: 2.5 * S, padL: 1.1 * S, padR: 0.8 * S,
    staffTop,
    staffBottom: staffTop + staffSpan * S,
    textTop: staffTop + (staffSpan + bottomExt) * S,
    textH: textH * S,
    topLine, bottomLine
  };
}

/**
 * Render one phrase row.
 * opts: { showTimeSig, timeSig, isSongEnd, colors }
 */
export function renderRow(notation, layout, phrase, opts = {}) {
  const { S, unitPx, staffTop, topLine, bottomLine } = layout;
  const staff = notation.staff;
  const unpitched = notation.lines === 1;
  const midDeg = (topLine + bottomLine) / 2;
  const yOf = (deg) => staffTop + (topLine - deg) * S / 2;
  const yMid = yOf(midDeg);
  const rx = 0.66 * S, ry = 0.46 * S;
  const stemLen = 3.3 * S;
  const parts = [];        // svg fragments
  const anchors = [];      // [t, x] for beat interpolation
  const eventX = new Map();

  // ---- Horizontal positions ----
  let x = layout.headerW;
  const measureX = [];
  for (let mi = phrase.firstMeasure; mi <= phrase.lastMeasure; mi++) {
    const m = notation.measures[mi];
    const mx = { index: mi, start: x };
    x += layout.padL;
    for (const e of m.events) {
      eventX.set(e.id, x + rx);
      if (e.measureRest) {
        const w = eventWeight(e) * unitPx;
        eventX.set(e.id, x + w / 2 - layout.padL / 2 + rx / 2);
        anchors.push([e.t, x + rx]);
        x += w;
      } else {
        anchors.push([e.t, x + rx]);
        x += eventWeight(e) * unitPx;
      }
    }
    x += layout.padR;
    mx.end = x;
    measureX.push(mx);
  }
  const rowEnd = x;
  anchors.push([phrase.end, rowEnd - layout.padR]);

  const staffLeft = layout.labelW;
  const lineYs = staff.map(yOf);
  const staffTopY = unpitched ? yMid - S : Math.min(...lineYs);
  const staffBotY = unpitched ? yMid + S : Math.max(...lineYs);

  // ---- Staff lines + labels ----
  for (const deg of staff) {
    const y = yOf(deg);
    parts.push(`<line x1="${fmt(staffLeft)}" y1="${fmt(y)}" x2="${fmt(rowEnd)}" y2="${fmt(y)}" stroke="${INK}" stroke-width="${fmt(0.11 * S)}"/>`);
    if (!unpitched) {
      parts.push(`<text x="${fmt(staffLeft - 0.35 * S)}" y="${fmt(y + 0.32 * S)}" font-size="${fmt(0.95 * S)}" text-anchor="end" fill="#7a7aa0" font-family="Segoe UI, Arial, sans-serif" font-style="italic">${lineName(deg).replace('low ', '')}</text>`);
    }
  }

  // ---- Time signature ----
  if (opts.showTimeSig && opts.timeSig) {
    const tx = staffLeft + 1.4 * S;
    const fs = 2.0 * S;
    parts.push(`<g font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${fmt(fs)}" text-anchor="middle" fill="${INK}">` +
      `<text x="${fmt(tx)}" y="${fmt(yMid - 0.12 * S)}">${opts.timeSig.num}</text>` +
      `<text x="${fmt(tx)}" y="${fmt(yMid + 1.42 * S)}">${opts.timeSig.den}</text></g>`);
  }

  // ---- Measure number ----
  const firstM = notation.measures[phrase.firstMeasure];
  if (firstM.number > 0) {
    parts.push(`<text x="${fmt(measureX[0].start + 0.2 * S)}" y="${fmt(staffTop - layout.staffTop + 1.0 * S)}" font-size="${fmt(0.9 * S)}" fill="#8888aa" font-family="Segoe UI, Arial, sans-serif">${firstM.number}</text>`);
  }

  // ---- Barlines ----
  const barW = 0.14 * S;
  measureX.forEach((mx, i) => {
    const isLast = i === measureX.length - 1;
    const bx = mx.end;
    if (isLast && opts.isSongEnd) {
      parts.push(`<line x1="${fmt(bx - 0.7 * S)}" y1="${fmt(staffTopY)}" x2="${fmt(bx - 0.7 * S)}" y2="${fmt(staffBotY)}" stroke="${INK}" stroke-width="${fmt(barW)}"/>`);
      parts.push(`<rect x="${fmt(bx - 0.45 * S)}" y="${fmt(staffTopY)}" width="${fmt(0.45 * S)}" height="${fmt(staffBotY - staffTopY)}" fill="${INK}"/>`);
    } else {
      parts.push(`<line x1="${fmt(bx)}" y1="${fmt(staffTopY)}" x2="${fmt(bx)}" y2="${fmt(staffBotY)}" stroke="${INK}" stroke-width="${fmt(barW)}"/>`);
    }
  });

  // ---- Beat bar (positioned by the player) ----
  const barTop = staffTopY - 2.6 * S;
  const barBottom = layout.textTop + layout.textLines.length * layout.textH;
  parts.push(`<rect class="beat-bar" x="0" y="${fmt(barTop)}" width="${fmt(1.7 * S)}" height="${fmt(barBottom - barTop)}" rx="${fmt(0.5 * S)}" fill="rgba(255,152,0,0.28)" stroke="rgba(255,120,0,0.75)" stroke-width="${fmt(0.12 * S)}" visibility="hidden"/>`);

  // ---- Events ----
  const rowEvents = [];
  for (let mi = phrase.firstMeasure; mi <= phrase.lastMeasure; mi++) {
    rowEvents.push(...notation.measures[mi].events);
  }

  // Stem direction per event (beamed groups share direction)
  const stemUp = new Map();
  const beamGroups = new Map();
  for (const e of rowEvents) {
    if (e.rest) continue;
    if (e.beam) {
      if (!beamGroups.has(e.beam)) beamGroups.set(e.beam, []);
      beamGroups.get(e.beam).push(e);
    }
  }
  for (const e of rowEvents) {
    if (e.rest || e.base >= 4) continue;
    if (unpitched) { stemUp.set(e.id, true); continue; }
    const degs = e.pitches.map(p => p.degree);
    const far = degs.reduce((a, d) => Math.abs(d - midDeg) > Math.abs(a - midDeg) ? d : a, degs[0]);
    stemUp.set(e.id, far < midDeg);
  }
  for (const group of beamGroups.values()) {
    const all = group.flatMap(e => e.pitches.map(p => p.degree));
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    const up = unpitched || avg < midDeg;
    group.forEach(e => stemUp.set(e.id, up));
  }

  // Stem geometry
  const stems = new Map(); // id -> {x, yNote(end at notehead), yTip}
  for (const e of rowEvents) {
    if (!stemUp.has(e.id)) continue;
    const ex = eventX.get(e.id);
    const ys = e.pitches.map(p => yOf(p.degree));
    const up = stemUp.get(e.id);
    const sx = up ? ex + rx - 0.06 * S : ex - rx + 0.06 * S;
    const yNote = up ? Math.max(...ys) : Math.min(...ys);
    const yFar = up ? Math.min(...ys) : Math.max(...ys);
    let yTip = up ? yFar - stemLen : yFar + stemLen;
    // Long stems reach at least the middle of the staff
    if (!unpitched) yTip = up ? Math.min(yTip, yMid) : Math.max(yTip, yMid);
    stems.set(e.id, { x: sx, yNote, yTip, up, yFar });
  }

  // Beams adjust stem tips
  const beamShapes = [];
  for (const group of beamGroups.values()) {
    if (group.length < 2) continue;
    const up = stemUp.get(group[0].id);
    const first = stems.get(group[0].id), last = stems.get(group[group.length - 1].id);
    let slope = (last.yTip - first.yTip) / Math.max(last.x - first.x, 1);
    slope = Math.max(-0.12, Math.min(0.12, slope)) * 0.6;
    let base = first.yTip;
    const minStem = 2.6 * S;
    for (const e of group) {
      const st = stems.get(e.id);
      const by = base + slope * (st.x - first.x);
      if (up && by > st.yFar - minStem) base -= by - (st.yFar - minStem);
      if (!up && by < st.yFar + minStem) base += (st.yFar + minStem) - by;
    }
    for (const e of group) {
      const st = stems.get(e.id);
      st.yTip = base + slope * (st.x - first.x);
    }
    const th = 0.5 * S;
    const dir = up ? 1 : -1;
    const poly = (x1, x2, off) => {
      const y1 = base + slope * (x1 - first.x) + dir * off;
      const y2 = base + slope * (x2 - first.x) + dir * off;
      return `<polygon points="${fmt(x1)},${fmt(y1)} ${fmt(x2)},${fmt(y2)} ${fmt(x2)},${fmt(y2 + dir * th)} ${fmt(x1)},${fmt(y1 + dir * th)}" fill="${INK}"/>`;
    };
    beamShapes.push(poly(first.x, last.x, 0));
    // Secondary (sixteenth) beams
    for (let i = 0; i < group.length; i++) {
      const e = group[i];
      if (e.base > 0.25 + EPS) continue;
      const st = stems.get(e.id);
      const next = group[i + 1];
      const prev = group[i - 1];
      if (next && next.base <= 0.25 + EPS) {
        beamShapes.push(poly(st.x, stems.get(next.id).x, 0.8 * S));
      } else if (!(prev && prev.base <= 0.25 + EPS)) {
        const stub = 1.1 * S;
        beamShapes.push(next ? poly(st.x, st.x + stub, 0.8 * S) : poly(st.x - stub, st.x, 0.8 * S));
      }
    }
  }

  const evParts = [];
  for (const e of rowEvents) {
    const ex = eventX.get(e.id);
    const g = [];
    // Tap/hit area
    g.push(`<rect class="hit" x="${fmt(ex - 1.1 * S)}" y="${fmt(staffTopY - 2.5 * S)}" width="${fmt(2.2 * S)}" height="${fmt(staffBotY - staffTopY + 5 * S)}" fill="transparent"/>`);

    if (e.rest) {
      g.push(drawRest(e, ex, yMid, S, staff.includes(midDeg)));
    } else {
      const hollow = e.base >= 2;
      for (const p of e.pitches) {
        const y = yOf(p.degree);
        // Ledger lines
        if (!unpitched) {
          for (let d = topLine + 2; d <= p.degree; d += 2) g.push(ledger(ex, yOf(d), S));
          for (let d = bottomLine - 2; d >= p.degree; d -= 2) g.push(ledger(ex, yOf(d), S));
        }
        g.push(notehead(ex, y, S, e.base, hollow));
        if (p.acc) {
          g.push(`<text x="${fmt(ex - rx - 0.9 * S)}" y="${fmt(y + 0.5 * S)}" font-size="${fmt(1.5 * S)}" text-anchor="middle" fill="${INK}">${p.acc}</text>`);
        }
        for (let k = 0; k < e.dots; k++) {
          const onLine = ((p.degree % 2) + 2) % 2 === 0;
          const dy = onLine ? y - S / 2 : y;
          g.push(`<circle cx="${fmt(ex + rx + 0.5 * S + k * 0.5 * S)}" cy="${fmt(dy)}" r="${fmt(0.17 * S)}" fill="${INK}"/>`);
        }
      }
      const st = stems.get(e.id);
      if (st) {
        g.push(`<line class="stem" x1="${fmt(st.x)}" y1="${fmt(st.yNote)}" x2="${fmt(st.x)}" y2="${fmt(st.yTip)}" stroke="${INK}" stroke-width="${fmt(0.13 * S)}"/>`);
        if (!e.beam || !beamGroups.get(e.beam) || beamGroups.get(e.beam).length < 2) {
          const flags = e.base <= 0.125 + EPS ? 3 : e.base <= 0.25 + EPS ? 2 : e.base <= 0.5 + EPS ? 1 : 0;
          for (let k = 0; k < flags; k++) g.push(flag(st.x, st.yTip + (st.up ? 1 : -1) * k * 0.85 * S, S, st.up));
        }
      }
    }

    // Ties to the next event
    if (e.tieToNext) {
      const nextX = eventX.get(e.id + 1);
      const up = stemUp.has(e.id) ? stemUp.get(e.id) : true;
      for (const p of e.pitches) {
        const y = yOf(p.degree) + (up ? 0.75 : -0.75) * S;
        const x1 = ex + 0.4 * S;
        const x2 = nextX !== undefined ? nextX - 0.4 * S : rowEnd - 0.3 * S;
        g.push(tie(x1, x2, y, S, up));
      }
    }

    // Text lines
    layout.textLines.forEach((kind, li) => {
      const ty = layout.textTop + li * layout.textH + layout.textH * 0.72;
      let txt = '', color = INK, fs = 1.05 * S, weight = 'normal';
      if (kind === 'lyrics' && e.lyric) {
        txt = e.lyric;
        fs = 1.15 * S;
        if (e.hyphen) {
          const nx = nextLyricX(rowEvents, e, eventX);
          const hx = nx !== null ? (ex + nx) / 2 : ex + 1.6 * S;
          g.push(`<text x="${fmt(hx)}" y="${fmt(ty)}" font-size="${fmt(fs)}" text-anchor="middle" fill="${INK}" font-family="Segoe UI, Arial, sans-serif">-</text>`);
        }
      } else if (kind === 'solfege' && !e.rest && !e.tieFromPrev) {
        txt = e.pitches.map(p => p.syl).reverse().join('/');
        color = '#2a5bd7';
        weight = 'bold';
      } else if (kind === 'rhythm' && e.rhythm) {
        txt = e.rhythm;
        color = e.rest ? '#b8b8c8' : '#c2410c';
        fs = 0.95 * S;
      }
      if (txt) {
        g.push(`<text class="txt-${kind}" x="${fmt(ex)}" y="${fmt(ty)}" font-size="${fmt(fs)}" font-weight="${weight}" text-anchor="middle" fill="${color}" font-family="Segoe UI, Arial, sans-serif">${esc(txt)}</text>`);
      }
    });

    evParts.push(`<g class="ev${e.rest ? ' rest' : ''}" data-ev="${e.id}">${g.join('')}</g>`);
  }

  const totalW = layout.width;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(totalW)} ${fmt(layout.height)}" width="${fmt(totalW)}" height="${fmt(layout.height)}">` +
    parts.join('') + beamShapes.join('') + evParts.join('') + '</svg>';

  anchors.sort((a, b) => a[0] - b[0]);
  const beatX = (t) => {
    if (t <= anchors[0][0]) return anchors[0][1];
    for (let i = 1; i < anchors.length; i++) {
      const [t1, x1] = anchors[i];
      const [t0, x0] = anchors[i - 1];
      if (t <= t1 + EPS) return t1 - t0 < EPS ? x1 : x0 + (x1 - x0) * (t - t0) / (t1 - t0);
    }
    return anchors[anchors.length - 1][1];
  };

  return { svg, beatX, eventX, barWidth: 1.7 * S, rowEnd, S };
}

function nextLyricX(rowEvents, e, eventX) {
  const i = rowEvents.indexOf(e);
  for (let j = i + 1; j < rowEvents.length; j++) {
    if (rowEvents[j].lyric) return eventX.get(rowEvents[j].id);
  }
  return null;
}

function ledger(x, y, S) {
  return `<line x1="${fmt(x - 1.15 * S)}" y1="${fmt(y)}" x2="${fmt(x + 1.15 * S)}" y2="${fmt(y)}" stroke="${INK}" stroke-width="${fmt(0.13 * S)}"/>`;
}

/** Rotated ellipse as a path (no transforms, so it renders identically everywhere) */
function ellipsePath(x, y, rx, ry, deg) {
  const r = deg * Math.PI / 180;
  const dx = rx * Math.cos(r), dy = rx * Math.sin(r);
  return `M ${fmt(x - dx)} ${fmt(y - dy)} A ${fmt(rx)} ${fmt(ry)} ${deg} 1 0 ${fmt(x + dx)} ${fmt(y + dy)} ` +
    `A ${fmt(rx)} ${fmt(ry)} ${deg} 1 0 ${fmt(x - dx)} ${fmt(y - dy)} Z`;
}

function notehead(x, y, S, base, hollow) {
  if (base >= 4) {
    return `<path class="head" fill-rule="evenodd" fill="${INK}" d="${ellipsePath(x, y, 0.78 * S, 0.5 * S, 0)} ${ellipsePath(x, y, 0.36 * S, 0.27 * S, 55)}"/>`;
  }
  const outer = ellipsePath(x, y, 0.66 * S, 0.46 * S, -20);
  const inner = hollow ? ' ' + ellipsePath(x, y, 0.5 * S, 0.2 * S, -32) : '';
  return `<path class="head" fill-rule="evenodd" fill="${INK}" d="${outer}${inner}"/>`;
}

function flag(sx, ty, S, up) {
  const d = up ? 1 : -1;
  const p = (a, b) => `${fmt(a * S)} ${fmt(b * S * d)}`;
  return `<path d="M ${fmt(sx)} ${fmt(ty)} c ${p(0, 0.9)} ${p(1.35, 1.15)} ${p(1.05, 2.7)} c ${p(0.15, -1.05)} ${p(-0.5, -1.45)} ${p(-1.05, -1.95)} z" fill="${INK}"/>`;
}

function tie(x1, x2, y, S, below) {
  const d = below ? 1 : -1;
  const h = Math.min(1.1 * S, 0.25 * (x2 - x1) + 0.3 * S);
  const mx = (x1 + x2) / 2;
  return `<path d="M ${fmt(x1)} ${fmt(y)} Q ${fmt(mx)} ${fmt(y + d * h)} ${fmt(x2)} ${fmt(y)} Q ${fmt(mx)} ${fmt(y + d * (h - 0.28 * S))} ${fmt(x1)} ${fmt(y)} z" fill="${INK}"/>`;
}

function drawRest(e, x, yMid, S, hasMidLine) {
  const s = (v) => fmt(v * S);
  const out = [];
  const base = e.measureRest ? 4 : e.base;
  if (base >= 2) {
    const w = 1.25 * S, h = 0.55 * S;
    const yLine = yMid;
    const y = base >= 4 ? yLine : yLine - h;
    out.push(`<rect x="${fmt(x - w / 2)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${INK}"/>`);
    if (!hasMidLine) out.push(`<line x1="${fmt(x - w)}" y1="${fmt(yLine)}" x2="${fmt(x + w)}" y2="${fmt(yLine)}" stroke="${INK}" stroke-width="${fmt(0.12 * S)}"/>`);
  } else if (base >= 1) {
    out.push(`<path d="M ${fmt(x - 0.25 * S)} ${fmt(yMid - 1.5 * S)} l ${s(0.7)} ${s(0.85)} l ${s(-0.65)} ${s(0.7)} l ${s(0.65)} ${s(0.75)} q ${s(-0.95)} ${s(-0.35)} ${s(-0.45)} ${s(0.7)}" fill="none" stroke="${INK}" stroke-width="${s(0.3)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  } else {
    const hooks = base <= 0.25 + EPS ? 2 : 1;
    const top = yMid - 0.7 * S;
    out.push(`<path d="M ${fmt(x + 0.45 * S)} ${fmt(top)} L ${fmt(x - 0.15 * S)} ${fmt(top + (hooks === 2 ? 2.4 : 1.7) * S)}" stroke="${INK}" stroke-width="${s(0.2)}" stroke-linecap="round"/>`);
    for (let k = 0; k < hooks; k++) {
      const hy = top + k * 0.85 * S;
      const hx = x + 0.45 * S - k * 0.22 * S;
      out.push(`<circle cx="${fmt(hx - 0.75 * S)}" cy="${fmt(hy + 0.12 * S)}" r="${s(0.27)}" fill="${INK}"/>`);
      out.push(`<path d="M ${fmt(hx - 0.75 * S)} ${fmt(hy + 0.2 * S)} Q ${fmt(hx - 0.3 * S)} ${fmt(hy + 0.45 * S)} ${fmt(hx)} ${fmt(hy)}" fill="none" stroke="${INK}" stroke-width="${s(0.18)}"/>`);
    }
  }
  return out.join('');
}
