/**
 * SolfegeQuiz.js - choose the "mystery" spots for the Song Player's solfege quiz mode.
 *
 * A "run" is a stretch of consecutive notes on the same pitch (do do do). Every run after the
 * first one begins where the pitch changes, so each is a possible quiz spot. Playback freezes on
 * the first note of a chosen run and the whole run's solfege is hidden until playback resumes.
 *
 * Rules:
 *   - the first run of the song is never a spot
 *   - two spots are never back to back (adjacent runs), EXCEPT when the teacher's focus
 *     syllables make them so
 *   - every run on a focus syllable is always a spot (the teacher wants that pitch each time)
 *   - the rest of the spots are picked at random, up to `count`
 */

const EPS = 1e-6;

/** Split a part's notation events into runs of repeated pitch. */
export function buildRuns(events) {
  const runs = [];
  for (const e of events) {
    if (e.rest || e.tieFromPrev || !e.pitches.length) continue;
    const key = e.pitches.map(p => p.midi).join(',');
    const last = runs[runs.length - 1];
    if (last && last.key === key) {
      last.events.push(e);
    } else {
      runs.push({
        index: runs.length,
        key,
        syl: e.pitches.map(p => p.syl).reverse().join('/'),
        pitchSyls: e.pitches.map(p => p.syl),
        t: e.soundT,
        events: [e]
      });
    }
  }
  return runs;
}

/** Distinct solfege syllables in the part, in pitch order (for the teacher's focus picker). */
export function syllablesIn(events) {
  const seen = new Map();
  for (const e of events) {
    if (e.rest) continue;
    for (const p of e.pitches) if (!seen.has(p.syl)) seen.set(p.syl, p.midi);
  }
  return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([syl]) => syl);
}

/**
 * Pick the quiz spots.
 * opts: { count (2-6), focus: [syllables], fromBeat (only spots at or after this beat), random: () => [0,1) }
 * Returns the chosen runs, in song order.
 */
export function pickQuizSpots(runs, opts = {}) {
  const count = Math.max(1, opts.count || 3);
  const focus = new Set(opts.focus || []);
  const fromBeat = opts.fromBeat || 0;
  const random = opts.random || Math.random;

  const eligible = runs.filter(r => r.index > 0 && r.t >= fromBeat - EPS);
  const chosen = new Set();

  // Focus syllables: always
  for (const r of eligible) if (r.pitchSyls.some(s => focus.has(s))) chosen.add(r.index);

  // Fill the rest at random, never next to a spot we already have
  const free = () => eligible.filter(r =>
    !chosen.has(r.index) && !chosen.has(r.index - 1) && !chosen.has(r.index + 1));
  let pool = free();
  while (chosen.size < count && pool.length) {
    const r = pool[Math.floor(random() * pool.length)];
    chosen.add(r.index);
    pool = free();
  }

  return runs.filter(r => chosen.has(r.index));
}
