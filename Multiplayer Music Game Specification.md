# Multiplayer Music Game Specification
## "Music Marathon" (working title)

**Inspired by:** Mario Party Jamboree Koopalathon
**Target Platform:** Browser-based (Chrome/Edge recommended)
**Hosting:** Static site (GitHub Pages, Netlify, Cloudflare Pages)
**Architecture:** Client-side only, no backend server

---

## Executive Summary

A multiplayer racing game where students compete on a shared gameboard by completing music mini-games. Students race around a track, with movement speed determined by accuracy and response time. All game data (student names, progress, results) stored locally on microSD cards - no data transmitted over network.

**Key Safety Feature:** Because everything is client-side with local storage, there's NO network communication between devices, NO server you control, and NO data leaves student devices without explicit export.

---

## 1. Architecture Overview

### 1.1 Hosting Platform Recommendation

**Recommended: GitHub Pages**

**Why GitHub Pages:**
```
Advantages:
✅ Completely free (unlimited bandwidth)
✅ Automatic HTTPS (secure)
✅ Fast CDN (global edge network)
✅ Version control built-in (git history)
✅ Easy deployment (push to main branch)
✅ Custom domain support (optional)
✅ 100% static - no server-side code
✅ GitHub's security/uptime (very reliable)
✅ Open source transparency (IT can audit code)

Disadvantages:
⚠️ Public by default (anyone can access URL)
⚠️ 1GB repository size limit (plenty for your needs)
⚠️ Not intended for commercial use (fine for education)
```

**Setup Process:**
```bash
# 1. Create repository
# Go to github.com → New Repository → music-marathon

# 2. Enable GitHub Pages
# Settings → Pages → Source: main branch → Save

# 3. Your game will be live at:
# https://yourusername.github.io/music-marathon/

# 4. Deploy new versions:
git add .
git commit -m "Update game"
git push origin main
# Live in ~30 seconds
```

**Alternative Options:**

| Platform | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Netlify** | Easier deployment, better build tools | Requires account signup | Good if you want deployment previews |
| **Cloudflare Pages** | Fastest CDN, unlimited bandwidth | More complex setup | Good for high traffic |
| **Vercel** | Great developer experience | Overkill for static site | Not needed |
| **School server** | Local control | Requires IT approval, security review | Avoid - defeats purpose |

**Winner: GitHub Pages** (free, reliable, IT-friendly)

---

### 1.2 Data Storage Architecture

**Storage Model: Local-Only with File System Access API**

```
Flow:
1. Game loads from GitHub Pages (static HTML/CSS/JS)
2. Student clicks "Load Data Folder"
3. Browser prompts: "Select folder containing student data"
4. Student selects folder on microSD card (e.g., /Volumes/STUDENT_1/)
5. Game reads CSVs using File System Access API
6. All data stays in browser memory (never sent over network)
7. When game ends, results written back to microSD folder
8. Student can safely eject microSD card
```

**Why This Is Secure:**
- ✅ Data never leaves student's device
- ✅ No network transmission (air-gapped gameplay)
- ✅ No server to compromise
- ✅ No cookies, no tracking
- ✅ IT can verify with network inspector (0 bytes transmitted)
- ✅ Students control their own data (physical possession)

---

### 1.3 CSV Data Structure

**File 1: `students.csv`** (on each microSD card)
```csv
student_id,name,grade,class,avatar
s001,Alex Rivera,5,Music 5A,avatar_guitar.png
s002,Jordan Lee,5,Music 5A,avatar_piano.png
s003,Sam Taylor,5,Music 5A,avatar_drums.png
```

**Purpose:** Student identity and profile
**Who creates it:** Teacher (exports from main roster)
**Where it lives:** Each student's microSD card
**Why multiple students per card:** If students share devices
**Default behavior:** If card has multiple students, show selection screen

---

**File 2: `game_progress.csv`** (on each microSD card)
```csv
student_id,game_session_id,timestamp,position,score,status
s001,2026-01-30_14-30,2026-01-30T14:32:15Z,25,450,in_progress
s001,2026-01-30_14-30,2026-01-30T14:35:42Z,58,680,in_progress
s001,2026-01-30_14-30,2026-01-30T14:38:20Z,100,890,completed
```

**Purpose:** Track student's position on board over time
**Updates:** After each mini-game completion
**Fields:**
- `position`: 0-100 (percentage of track completed)
- `score`: Cumulative points earned
- `status`: `in_progress`, `completed`, `abandoned`

---

**File 3: `minigame_results.csv`** (on each microSD card)
```csv
student_id,game_session_id,minigame_id,timestamp,accuracy,response_time_ms,points_earned,minigame_data
s001,2026-01-30_14-30,interval_training,2026-01-30T14:32:15Z,0.85,3200,15,"{""correct"":17,""incorrect"":3,""streak"":5}"
s001,2026-01-30_14-30,rhythm_dictation,2026-01-30T14:35:42Z,0.92,2800,18,"{""perfect_rhythms"":11,""mistakes"":1}"
```

**Purpose:** Detailed analytics for each mini-game attempt
**Fields:**
- `accuracy`: 0.0-1.0 (percentage correct)
- `response_time_ms`: Average milliseconds per response
- `points_earned`: 0-20 points (used to calculate movement speed)
- `minigame_data`: JSON blob with game-specific stats

---

### 1.4 The Multiplayer Problem & Solution

**The Challenge:**
> "Students move around the gameboard at different speeds"
> → How do students see each other if no network connection?

**Three Possible Solutions:**

---

#### **Solution A: Smartboard as Display Hub** (RECOMMENDED)

**How it works:**
```
Architecture:
┌─────────────────────────────────────────┐
│         Teacher Smartboard              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   GAMEBOARD DISPLAY               │ │
│  │                                   │ │
│  │   [Alex: 45%]  [Jordan: 62%]     │ │
│  │   [Sam: 38%]   [Casey: 51%]      │ │
│  │                                   │ │
│  │   [Race track with all avatars]   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ↑           ↑           ↑
    (WebRTC P2P connections)
         │           │           │
    ┌────┴───┐  ┌───┴────┐  ┌───┴────┐
    │Student │  │Student │  │Student │
    │Laptop  │  │Laptop  │  │Laptop  │
    │        │  │        │  │        │
    │[Playing│  │[Playing│  │[Playing│
    │ mini-  │  │ mini-  │  │ mini-  │
    │ game]  │  │ game]  │  │ game]  │
    └────────┘  └────────┘  └────────┘
```

**How it works:**
1. **Teacher opens "Display Mode"** on smartboard
   - URL: `https://yourusername.github.io/music-marathon/?mode=display`
   - Shows QR code + room code (e.g., `ROOM-4782`)

2. **Students join room** on their laptops
   - URL: `https://yourusername.github.io/music-marathon/`
   - Click "Join Game"
   - Enter room code: `ROOM-4782`
   - Select their name from loaded data folder
   - Click "Ready"

3. **WebRTC establishes peer-to-peer connection**
   - Student laptops connect directly to smartboard (no server)
   - Uses STUN servers for NAT traversal (standard WebRTC)
   - Falls back to TURN relay if necessary (free services available)

4. **Game loop:**
   - Student completes mini-game on their laptop
   - Result sent to smartboard via WebRTC: `{studentId: 's001', position: 45, score: 680}`
   - Smartboard updates race track display
   - All students see updated positions on smartboard
   - Students continue playing mini-games on their devices

5. **No data persistence on smartboard:**
   - Smartboard only displays current race state (RAM only)
   - Student laptops handle all data storage to microSD
   - When game ends, students' laptops save final results locally

**Technical Implementation:**
```javascript
// Use PeerJS (WebRTC wrapper) for simplicity
// https://peerjs.com/

// --- SMARTBOARD (Display Mode) ---
const peer = new Peer(); // Generates random room ID

peer.on('open', (id) => {
  console.log('Room Code:', id);
  displayQRCode(`https://game.com/?room=${id}`);
});

peer.on('connection', (conn) => {
  conn.on('data', (data) => {
    // Receive: {studentId: 's001', position: 45, score: 680}
    updateGameboard(data.studentId, data.position, data.score);
  });
});

// --- STUDENT LAPTOP ---
const peer = new Peer();
const roomCode = prompt('Enter room code:');
const conn = peer.connect(roomCode);

function onMiniGameComplete(accuracy, responseTime) {
  // Calculate new position based on performance
  const points = calculatePoints(accuracy, responseTime);
  position += points;

  // Send update to smartboard
  conn.send({
    studentId: currentStudent.id,
    position: position,
    score: totalScore
  });

  // Save to local microSD
  saveToCSV({
    student_id: currentStudent.id,
    position: position,
    timestamp: new Date().toISOString()
  });
}
```

**Advantages:**
- ✅ True multiplayer experience (everyone sees race)
- ✅ No server needed (peer-to-peer)
- ✅ No data stored on network (smartboard just displays)
- ✅ Students control their own data (saved to microSD)
- ✅ Works on local network (school WiFi)
- ✅ Visually engaging (big screen for spectating)

**Disadvantages:**
- ⚠️ Requires WebRTC (blocked on some school networks)
- ⚠️ Requires smartboard to be "host" (single point of failure)
- ⚠️ If smartboard crashes, game state lost (students keep their data though)

**IT Concerns Mitigated:**
- WebRTC is peer-to-peer (no teacher-controlled server)
- Only game state transmitted (position, score) - no PII
- All PII stays on microSD cards (never sent over network)
- Can demonstrate with Wireshark: only ~100 bytes/student every 30 seconds
- Standard protocol (Zoom, Google Meet use WebRTC)

---

#### **Solution B: Asynchronous "Ghost Racing"** (SAFEST)

**How it works:**
```
Architecture:
┌─────────────────────────────────────────┐
│         Teacher Smartboard              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   LEADERBOARD (Read-Only)         │ │
│  │                                   │ │
│  │   1st: Jordan    (62% complete)   │ │
│  │   2nd: Casey     (51% complete)   │ │
│  │   3rd: Alex      (45% complete)   │ │
│  │   4th: Sam       (38% complete)   │ │
│  │                                   │ │
│  │   [Teacher manually refreshes]    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ↑
    (Teacher uses Glob to read students' shared folders)
         │
    ┌────┴─────────────────────────────────┐
    │  Shared Network Folder (Read-Only)   │
    │  \\school-server\music-class\        │
    │                                      │
    │  /student_001_progress.json          │
    │  /student_002_progress.json          │
    │  /student_003_progress.json          │
    └──────────────────────────────────────┘
         ↑           ↑           ↑
   (Students write progress files)
         │           │           │
    ┌────┴───┐  ┌───┴────┐  ┌───┴────┐
    │Student │  │Student │  │Student │
    │Laptop  │  │Laptop  │  │Laptop  │
    │        │  │        │  │        │
    │[Playing│  │[Playing│  │[Playing│
    │ solo]  │  │ solo]  │  │ solo]  │
    │        │  │        │  │        │
    │Sees own│  │Sees own│  │Sees own│
    │progress│  │progress│  │progress│
    └────────┘  └────────┘  └────────┘
```

**How it works:**
1. **Each student plays independently**
   - Loads game from GitHub Pages
   - Loads their name from microSD card
   - Plays mini-games at their own pace
   - Sees only their own avatar on track

2. **Progress synced via file system**
   - After each mini-game, student's laptop writes: `student_001_progress.json`
   - File saved to shared network folder (school file server)
   - File is tiny: `{studentId: 's001', position: 45, score: 680, timestamp: '...'}`

3. **Teacher smartboard displays leaderboard**
   - Teacher opens "Leaderboard Mode"
   - Clicks "Refresh" button
   - Game reads all `student_*_progress.json` files from shared folder
   - Displays current standings (sorted by position)
   - Updates every 10 seconds (or manual refresh)

4. **"Ghost" feature (optional):**
   - Student can see other students' avatars on their track
   - Positions loaded from shared folder
   - Avatars are "ghosts" (semi-transparent, no collision)
   - Updated every 10 seconds when student loads fresh data

**Technical Implementation:**
```javascript
// --- STUDENT LAPTOP ---
async function onMiniGameComplete(accuracy, responseTime) {
  // Update local state
  position += calculatePoints(accuracy, responseTime);

  // Save to microSD (detailed data)
  await saveToMicroSD({
    student_id: currentStudent.id,
    position: position,
    timestamp: new Date().toISOString(),
    accuracy: accuracy,
    response_time: responseTime
  });

  // Save to shared folder (lightweight sync file)
  await saveToSharedFolder(`student_${currentStudent.id}_progress.json`, {
    studentId: currentStudent.id,
    position: position,
    score: totalScore,
    timestamp: Date.now()
  });
}

// --- TEACHER SMARTBOARD (Leaderboard Mode) ---
async function refreshLeaderboard() {
  const progressFiles = await readSharedFolder('student_*_progress.json');

  const standings = progressFiles
    .map(file => JSON.parse(file.content))
    .sort((a, b) => b.position - a.position); // Highest position first

  displayLeaderboard(standings);
}

// Refresh every 10 seconds
setInterval(refreshLeaderboard, 10000);
```

**Advantages:**
- ✅ No network communication between students (100% safe)
- ✅ No WebRTC needed (works on any network)
- ✅ If one student's device crashes, others unaffected
- ✅ Students can play at different times (asynchronous)
- ✅ Simplest IT approval (just file system access)

**Disadvantages:**
- ⚠️ Not real-time (10-second lag on leaderboard)
- ⚠️ Less exciting (no live racing visual)
- ⚠️ Requires school file server access (may not be available)

**IT Concerns Mitigated:**
- Zero network traffic (only file system)
- Students can only write their own file (permissions)
- Teacher can only read (no write access to student data)
- Shared folder is temporary (deleted after class)

---

#### **Solution C: Fully Offline (No Multiplayer)**

**How it works:**
```
Each student plays solo:
- Load game from GitHub Pages (or offline copy on each laptop)
- Load name from microSD card
- Play mini-games and race against own previous times
- No interaction with other students
- All data saved to microSD only
- Teacher collects microSD cards at end to review results
```

**Advantages:**
- ✅ Zero network interaction (easiest IT approval)
- ✅ Works offline (no internet needed after initial load)
- ✅ Maximum privacy (no data sharing at all)
- ✅ No setup required (just load and play)

**Disadvantages:**
- ⚠️ Not multiplayer (loses competitive element)
- ⚠️ Less engaging (no social interaction)
- ⚠️ Manual data collection (teacher collects microSD cards)

---

### **Recommendation: Solution A (WebRTC Display Hub)**

**Reasoning:**
- Best game experience (true multiplayer racing)
- Still secure (peer-to-peer, no teacher server)
- Data stays local (microSD cards)
- Manageable IT concerns (WebRTC is standard)

**Fallback to Solution B if:**
- School blocks WebRTC (test first)
- IT is uncomfortable with any network traffic
- Students play at different times

---

## 2. Game Design Specification

### 2.1 Core Game Loop

```
GAME START
    ↓
[All students on START line]
    ↓
[First mini-game appears]
    ↓
MINI-GAME PHASE (30-60 seconds)
│  - Student completes music task
│  - Accuracy + speed measured
│  - Points calculated (0-20)
│  → Movement: points = squares moved
    ↓
[Avatar moves forward on track]
    ↓
[Next mini-game appears]
    ↓
REPEAT 10-15 TIMES
    ↓
[First student crosses FINISH line]
    ↓
GAME OVER
    ↓
[Leaderboard + celebration]
    ↓
[Results saved to microSD]
```

---

### 2.2 Gameboard Design

**Track Layout: Circular path (like Koopalathon)**

```
                    FINISH
                    🏁
                     │
        ┌────────────┼────────────┐
        │                         │
    [Mini-game 8]            [Mini-game 2]
        │                         │
        │                         │
[Mini-game 7]                [Mini-game 3]
        │                         │
        │                         │
    [Mini-game 6]            [Mini-game 4]
        │                         │
        └────────────┬────────────┘
                     │
                [Mini-game 5]
                     │
                   START
                   🎵
```

**Track Properties:**
- **Total spaces:** 100 squares
- **Visual style:** Musical theme (notes, clefs, instruments as decorations)
- **Space types:**
  - Regular spaces (gray, 85% of track)
  - Boost spaces (gold star, 10% - mini-game gives 2x points)
  - Hazard spaces (red X, 5% - mini-game gives 0.5x points)
- **Camera:** Top-down view, zooms out to show all racers

**Avatar Movement:**
```javascript
// After mini-game completion
const basePoints = calculateAccuracyPoints(accuracy); // 0-15
const speedBonus = calculateSpeedBonus(responseTime); // 0-5
const spaceMultiplier = currentSpace.multiplier; // 1.0, 2.0, or 0.5

const totalPoints = (basePoints + speedBonus) * spaceMultiplier;
const squaresMoved = Math.floor(totalPoints);

moveAvatar(squaresMoved);
```

**Example scoring:**
```
Scenario 1: Perfect performance
- Accuracy: 100% → 15 points
- Response time: 1500ms (fast) → 5 bonus points
- Space: Regular (1x multiplier)
- Total: 20 squares moved → Big jump!

Scenario 2: Average performance
- Accuracy: 70% → 10 points
- Response time: 4000ms (slow) → 2 bonus points
- Space: Regular (1x multiplier)
- Total: 12 squares moved → Moderate progress

Scenario 3: Poor performance
- Accuracy: 40% → 6 points
- Response time: 6000ms (very slow) → 0 bonus
- Space: Hazard (0.5x multiplier)
- Total: 3 squares moved → Barely moves
```

---

### 2.3 Mini-Game Catalog

**Goal: 10-15 different mini-games**
**Duration: 30-60 seconds each**
**Rotation: Random selection (no repeats until all played)**

---

#### Mini-Game 1: **Interval Dash**
```
Objective: Identify musical intervals as fast as possible

UI:
┌─────────────────────────────────────┐
│  Listen to the interval:            │
│  [🔊 Play Sound]                    │
│                                     │
│  What interval is this?             │
│                                     │
│  [m2] [M2] [m3] [M3]               │
│  [P4] [P5] [m6] [M6]               │
│  [m7] [M7] [P8]                    │
└─────────────────────────────────────┘

Scoring:
- 20 intervals in 60 seconds
- +1 point per correct answer
- -0.5 points per wrong answer
- Accuracy: correct / total * 100%
- Speed: average response time
```

---

#### Mini-Game 2: **Rhythm Racer**
```
Objective: Clap back the rhythm you hear

UI:
┌─────────────────────────────────────┐
│  Listen:                            │
│  [🔊 Play Rhythm]                   │
│                                     │
│  Now clap it back!                  │
│  [Spacebar or tap screen]           │
│                                     │
│  Your rhythm: ♩ ♩ 𝅘𝅥𝅮 𝅘𝅥𝅮            │
│  Expected:    ♩ ♩ 𝅘𝅥𝅮 𝅘𝅥𝅮            │
│                                     │
│  [Submit]                           │
└─────────────────────────────────────┘

Scoring:
- 10 rhythms in 60 seconds
- Timing accuracy: within ±100ms = perfect
- ±200ms = good, ±300ms = okay
- Accuracy: average timing precision
```

---

#### Mini-Game 3: **Note Name Sprint**
```
Objective: Name notes on the staff quickly

UI:
┌─────────────────────────────────────┐
│  Name this note:                    │
│                                     │
│      ───────────────                │
│      ─────●─────────  ← What note? │
│      ───────────────                │
│      ───────────────                │
│      ───────────────                │
│                                     │
│  [C] [D] [E] [F] [G] [A] [B]       │
└─────────────────────────────────────┘

Scoring:
- 30 notes in 60 seconds
- Includes ledger lines
- Treble and bass clef
- Random sharps/flats
```

---

#### Mini-Game 4: **Scale Builder**
```
Objective: Build correct scale from scattered notes

UI:
┌─────────────────────────────────────┐
│  Build a C Major scale:             │
│                                     │
│  [Drag notes here]                  │
│  │ │ │ │ │ │ │ │                   │
│  ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼                   │
│  ─ ─ ─ ─ ─ ─ ─ ─                    │
│                                     │
│  Available notes:                   │
│  [E] [G] [C] [B] [D] [F] [A]       │
│  (Drag to build scale)              │
└─────────────────────────────────────┘

Scoring:
- 5 scales in 60 seconds
- Points for correct order
- Bonus for speed
```

---

#### Mini-Game 5: **Chord Matcher**
```
Objective: Match chord sound to chord name

UI:
┌─────────────────────────────────────┐
│  Listen to the chord:               │
│  [🔊 Play Chord]                    │
│                                     │
│  What type of chord is it?          │
│                                     │
│  [Major]  [Minor]                   │
│  [Diminished]  [Augmented]          │
└─────────────────────────────────────┘

Scoring:
- 15 chords in 60 seconds
- Root note changes randomly
- Chord type must be identified
```

---

#### Mini-Game 6: **Tempo Tapper**
```
Objective: Match the tempo of a metronome

UI:
┌─────────────────────────────────────┐
│  Listen to the tempo:               │
│  [🔊] ♩ ♩ ♩ ♩ (120 BPM)            │
│                                     │
│  Now tap the same tempo:            │
│  [Tap here or press spacebar]       │
│                                     │
│  Your tempo: 118 BPM ↓              │
│  Target: 120 BPM                    │
└─────────────────────────────────────┘

Scoring:
- 5 different tempos
- Must maintain tempo for 8 beats
- Within ±5 BPM = perfect
- ±10 BPM = good
```

---

#### Mini-Game 7: **Dynamic Detective**
```
Objective: Identify dynamic markings by ear

UI:
┌─────────────────────────────────────┐
│  Listen to this note:               │
│  [🔊 Play Note at mystery volume]   │
│                                     │
│  How loud was it?                   │
│                                     │
│  [pp] [p] [mp] [mf] [f] [ff]       │
└─────────────────────────────────────┘

Scoring:
- 12 examples in 60 seconds
- Various instruments
- Exact match = 2 points
- One step off = 1 point
```

---

#### Mini-Game 8: **Symbol Scramble**
```
Objective: Match musical symbols to their names

UI:
┌─────────────────────────────────────┐
│  Match the symbols:                 │
│                                     │
│  [♯] → ___________                  │
│  [♭] → ___________                  │
│  [♮] → ___________                  │
│  [𝄞] → ___________                  │
│  [𝄢] → ___________                  │
│                                     │
│  Options: Sharp, Flat, Natural,     │
│           Treble Clef, Bass Clef    │
└─────────────────────────────────────┘

Scoring:
- 10 rounds of 5 symbols
- Drag-and-drop matching
- All correct = bonus points
```

---

#### Mini-Game 9: **Melody Mimic**
```
Objective: Play back a short melody on virtual keyboard

UI:
┌─────────────────────────────────────┐
│  Listen to the melody:              │
│  [🔊 Play Melody]                   │
│                                     │
│  Now play it back:                  │
│  [Virtual piano keyboard]           │
│  C D E F G A B C                    │
│  [■][■][■][■][■][■][■][■]          │
│                                     │
│  [Submit]                           │
└─────────────────────────────────────┘

Scoring:
- 8 melodies, 3-5 notes each
- Correct notes + correct order
- Accuracy: exact matches / total
```

---

#### Mini-Game 10: **Rest Detective**
```
Objective: Identify types of rests

UI:
┌─────────────────────────────────────┐
│  What type of rest is this?         │
│                                     │
│        𝄽                            │
│                                     │
│  [Whole] [Half] [Quarter]           │
│  [Eighth] [Sixteenth]               │
└─────────────────────────────────────┘

Scoring:
- 20 rests in 60 seconds
- Mix of all rest types
- Fast identification rewarded
```

---

### 2.4 Point Calculation System

```javascript
function calculatePoints(miniGameResult) {
  // Base points from accuracy (0-15)
  const accuracyPoints = miniGameResult.accuracy * 15;

  // Speed bonus (0-5)
  // Faster response = more bonus
  const avgResponseTime = miniGameResult.responseTime; // milliseconds
  let speedBonus = 0;

  if (avgResponseTime < 1500) {
    speedBonus = 5; // Lightning fast
  } else if (avgResponseTime < 2500) {
    speedBonus = 4; // Fast
  } else if (avgResponseTime < 3500) {
    speedBonus = 3; // Good
  } else if (avgResponseTime < 4500) {
    speedBonus = 2; // Okay
  } else if (avgResponseTime < 6000) {
    speedBonus = 1; // Slow
  } else {
    speedBonus = 0; // Very slow
  }

  // Space multiplier
  const spaceMultiplier = currentSpace.type === 'boost' ? 2.0
                        : currentSpace.type === 'hazard' ? 0.5
                        : 1.0;

  // Total calculation
  const totalPoints = (accuracyPoints + speedBonus) * spaceMultiplier;

  return {
    accuracy: accuracyPoints,
    speed: speedBonus,
    multiplier: spaceMultiplier,
    total: Math.floor(totalPoints),
    squaresMoved: Math.floor(totalPoints)
  };
}
```

**Example scenarios:**

| Accuracy | Time (ms) | Space Type | Accuracy Pts | Speed Bonus | Multiplier | Total | Squares Moved |
|----------|-----------|------------|--------------|-------------|------------|-------|---------------|
| 100%     | 1200      | Regular    | 15           | 5           | 1.0        | 20    | 20            |
| 100%     | 1200      | Boost      | 15           | 5           | 2.0        | 40    | 40            |
| 100%     | 1200      | Hazard     | 15           | 5           | 0.5        | 10    | 10            |
| 75%      | 3000      | Regular    | 11.25        | 3           | 1.0        | 14    | 14            |
| 50%      | 5000      | Regular    | 7.5          | 1           | 1.0        | 8     | 8             |
| 30%      | 7000      | Hazard     | 4.5          | 0           | 0.5        | 2     | 2             |

**Balance:** A perfect performance moves 20 squares, poor performance moves 2-5 squares. Race typically 8-12 mini-games (perfect player reaches 100 in 5 games, average player in 10-12 games).

---

### 2.5 Win Condition & End Game

**Primary Win Condition:**
- First student to reach space 100 (or beyond) wins
- Game continues until all students finish (or 20 minutes elapsed)

**Final Ranking:**
```
Place | Student | Time to Finish | Total Score | Avg Accuracy
------|---------|----------------|-------------|-------------
1st   | Jordan  | 8m 23s        | 1,450       | 92%
2nd   | Alex    | 9m 41s        | 1,320       | 87%
3rd   | Sam     | 11m 15s       | 1,180       | 81%
4th   | Casey   | 12m 02s       | 1,095       | 78%
```

**Celebration Screen:**
```
┌─────────────────────────────────────────┐
│          🏆 GAME OVER! 🏆               │
│                                         │
│        Winner: Jordan Lee!              │
│        Time: 8 minutes 23 seconds       │
│        Accuracy: 92%                    │
│                                         │
│      [Confetti animation]               │
│                                         │
│  Final Standings:                       │
│  🥇 1st - Jordan (1,450 pts)           │
│  🥈 2nd - Alex (1,320 pts)             │
│  🥉 3rd - Sam (1,180 pts)              │
│  4th - Casey (1,095 pts)                │
│                                         │
│  [View Details] [Play Again] [Exit]    │
└─────────────────────────────────────────┘
```

**Post-Game Data:**
- Full results saved to each student's microSD card
- Teacher can collect microSD cards to analyze performance
- Optional: Export class summary CSV to teacher's device

---

## 3. Technical Implementation

### 3.1 Technology Stack

```
Frontend:
- HTML5 (structure)
- CSS3 (styling, animations)
- Vanilla JavaScript (game logic, no frameworks)
- Canvas API (gameboard rendering)
- Web Audio API (sound playback, pitch detection)

File I/O:
- File System Access API (read/write microSD folders)
- Fallback: download links for unsupported browsers

Multiplayer (Option A):
- PeerJS (WebRTC wrapper) https://peerjs.com/
- Or simple-peer: https://github.com/feross/simple-peer

Asset Loading:
- Fetch API (load audio, images from /assets/)
- Pre-load all assets on game start (progress bar)

Data Format:
- CSV parsing (Papa Parse library)
- JSON for real-time sync (game state)

Browser Support:
- Chrome/Edge 86+ (recommended)
- Firefox 111+ (File System Access requires flag)
- Safari 15.2+ (limited support)
```

---

### 3.2 File Structure

```
music-marathon/
├── index.html                  # Main game page
├── display.html                # Smartboard display mode
├── leaderboard.html            # Standalone leaderboard view
│
├── css/
│   ├── game.css               # Main game styles
│   ├── display.css            # Smartboard-specific styles
│   └── minigames.css          # Mini-game UI styles
│
├── js/
│   ├── main.js                # App initialization
│   ├── file-handler.js        # microSD read/write
│   ├── game-engine.js         # Core game loop
│   ├── gameboard.js           # Track rendering (Canvas)
│   ├── multiplayer.js         # WebRTC/sync logic
│   ├── minigame-loader.js     # Mini-game module system
│   └── scoring.js             # Point calculation
│
├── minigames/
│   ├── interval-dash.js
│   ├── rhythm-racer.js
│   ├── note-name-sprint.js
│   ├── scale-builder.js
│   ├── chord-matcher.js
│   ├── tempo-tapper.js
│   ├── dynamic-detective.js
│   ├── symbol-scramble.js
│   ├── melody-mimic.js
│   └── rest-detective.js
│
├── assets/
│   ├── audio/
│   │   ├── intervals/         # Pre-recorded intervals
│   │   ├── rhythms/           # Rhythm examples
│   │   ├── scales/            # Scale audio
│   │   ├── chords/            # Chord progressions
│   │   └── sfx/               # Sound effects (celebrate, boop, etc.)
│   │
│   ├── images/
│   │   ├── avatars/           # Player avatar sprites
│   │   ├── track/             # Gameboard tiles
│   │   ├── symbols/           # Musical symbols (reuse from current project)
│   │   └── ui/                # Buttons, backgrounds
│   │
│   └── fonts/
│       └── musicsymbols.ttf   # Musical notation font
│
├── lib/
│   ├── papaparse.min.js       # CSV parsing
│   ├── peerjs.min.js          # WebRTC (if using)
│   └── tone.min.js            # Audio synthesis (optional)
│
├── data/
│   └── example_data/          # Example CSV files for teachers
│       ├── students.csv
│       ├── game_progress.csv
│       └── minigame_results.csv
│
└── README.md                   # Setup instructions
```

---

### 3.3 Core Code Architecture

#### **main.js** - Application Entry Point
```javascript
// Main application controller
class MusicMarathon {
  constructor() {
    this.students = [];
    this.currentStudent = null;
    this.gameState = {
      position: 0,
      score: 0,
      completedGames: [],
      startTime: null
    };
    this.dataFolder = null;
  }

  async init() {
    // 1. Show welcome screen
    this.showWelcomeScreen();

    // 2. Prompt for data folder
    await this.loadDataFolder();

    // 3. Student selection
    this.showStudentSelection();

    // 4. Join multiplayer (if enabled)
    if (MULTIPLAYER_ENABLED) {
      await this.joinGame();
    }

    // 5. Start game
    this.startGame();
  }

  async loadDataFolder() {
    // File System Access API
    this.dataFolder = await window.showDirectoryPicker();

    // Read students.csv
    const studentsFile = await this.dataFolder.getFileHandle('students.csv');
    const studentsContent = await studentsFile.getFile();
    const studentsText = await studentsContent.text();
    this.students = Papa.parse(studentsText, { header: true }).data;

    // Read game_progress.csv (if exists)
    // ... load previous progress ...
  }

  startGame() {
    // Initialize game engine
    this.gameEngine = new GameEngine(this.currentStudent, this.gameState);

    // Start first mini-game
    this.gameEngine.loadNextMinigame();
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new MusicMarathon();
  app.init();
});
```

---

#### **game-engine.js** - Core Game Loop
```javascript
class GameEngine {
  constructor(student, initialState) {
    this.student = student;
    this.state = initialState;
    this.minigames = this.shuffleMinigames();
    this.currentMiniGame = null;
    this.gameboard = new Gameboard('#canvas');
  }

  shuffleMinigames() {
    const allGames = [
      'interval-dash',
      'rhythm-racer',
      'note-name-sprint',
      'scale-builder',
      'chord-matcher',
      'tempo-tapper',
      'dynamic-detective',
      'symbol-scramble',
      'melody-mimic',
      'rest-detective'
    ];
    return this.shuffle(allGames);
  }

  loadNextMinigame() {
    // Check win condition
    if (this.state.position >= 100) {
      this.endGame('win');
      return;
    }

    // Get next mini-game
    const gameId = this.minigames.shift();
    if (!this.minigames.length) {
      this.minigames = this.shuffleMinigames(); // Refill
    }

    // Load mini-game module
    this.currentMiniGame = new MiniGameLoader(gameId);
    this.currentMiniGame.onComplete = (result) => {
      this.onMiniGameComplete(result);
    };
    this.currentMiniGame.start();
  }

  async onMiniGameComplete(result) {
    // Calculate points
    const points = calculatePoints(result);

    // Update state
    this.state.position += points.squaresMoved;
    this.state.score += points.total;
    this.state.completedGames.push({
      gameId: this.currentMiniGame.id,
      accuracy: result.accuracy,
      responseTime: result.responseTime,
      points: points.total
    });

    // Animate avatar movement
    await this.gameboard.moveAvatar(
      this.student.id,
      this.state.position,
      points.squaresMoved
    );

    // Save progress to microSD
    await this.saveProgress();

    // Sync with smartboard (if multiplayer)
    if (MULTIPLAYER_ENABLED) {
      this.syncWithDisplay();
    }

    // Load next mini-game
    this.loadNextMinigame();
  }

  async saveProgress() {
    // Append to game_progress.csv
    const progressRow = {
      student_id: this.student.id,
      game_session_id: this.state.sessionId,
      timestamp: new Date().toISOString(),
      position: this.state.position,
      score: this.state.score,
      status: 'in_progress'
    };

    await appendToCSV(dataFolder, 'game_progress.csv', progressRow);

    // Append to minigame_results.csv
    const lastGame = this.state.completedGames[this.state.completedGames.length - 1];
    const resultRow = {
      student_id: this.student.id,
      game_session_id: this.state.sessionId,
      minigame_id: lastGame.gameId,
      timestamp: new Date().toISOString(),
      accuracy: lastGame.accuracy,
      response_time_ms: lastGame.responseTime,
      points_earned: lastGame.points,
      minigame_data: JSON.stringify(lastGame)
    };

    await appendToCSV(dataFolder, 'minigame_results.csv', resultRow);
  }
}
```

---

#### **gameboard.js** - Track Rendering
```javascript
class Gameboard {
  constructor(canvasSelector) {
    this.canvas = document.querySelector(canvasSelector);
    this.ctx = this.canvas.getContext('2d');
    this.players = new Map();
    this.track = this.generateTrack();
    this.render();
  }

  generateTrack() {
    // Create 100 spaces in circular path
    const track = [];
    const numSpaces = 100;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 300;

    for (let i = 0; i < numSpaces; i++) {
      const angle = (i / numSpaces) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Determine space type
      let type = 'regular';
      if (Math.random() < 0.10) type = 'boost';
      if (Math.random() < 0.05) type = 'hazard';

      track.push({ x, y, type, index: i });
    }

    return track;
  }

  addPlayer(studentId, name, avatarUrl) {
    this.players.set(studentId, {
      name,
      avatarUrl,
      position: 0,
      avatar: new Image()
    });
    this.players.get(studentId).avatar.src = avatarUrl;
  }

  async moveAvatar(studentId, newPosition, squaresMoved) {
    const player = this.players.get(studentId);
    if (!player) return;

    // Animate movement
    const startPos = player.position;
    const endPos = newPosition;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        player.position = startPos + (endPos - startPos) * eased;

        this.render();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw track
    this.track.forEach((space, i) => {
      const color = space.type === 'boost' ? 'gold'
                  : space.type === 'hazard' ? 'red'
                  : '#ddd';

      this.ctx.fillStyle = color;
      this.ctx.fillRect(space.x - 10, space.y - 10, 20, 20);

      // Draw space number every 10 spaces
      if (i % 10 === 0) {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(i, space.x - 5, space.y - 15);
      }
    });

    // Draw players
    this.players.forEach((player, studentId) => {
      const spaceIndex = Math.min(Math.floor(player.position), 99);
      const space = this.track[spaceIndex];

      // Draw avatar
      if (player.avatar.complete) {
        this.ctx.drawImage(player.avatar, space.x - 20, space.y - 20, 40, 40);
      }

      // Draw name label
      this.ctx.fillStyle = 'white';
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.font = '14px Arial';
      this.ctx.strokeText(player.name, space.x - 20, space.y - 25);
      this.ctx.fillText(player.name, space.x - 20, space.y - 25);
    });
  }
}
```

---

#### **multiplayer.js** - WebRTC Sync (Option A)
```javascript
class MultiplayerSync {
  constructor(studentId, displayMode = false) {
    this.studentId = studentId;
    this.displayMode = displayMode;
    this.peer = new Peer();
    this.connections = new Map();
  }

  async init() {
    return new Promise((resolve) => {
      this.peer.on('open', (id) => {
        this.peerId = id;
        console.log('Peer ID:', id);
        resolve(id);
      });

      if (this.displayMode) {
        // Smartboard: listen for student connections
        this.peer.on('connection', (conn) => {
          this.onStudentConnect(conn);
        });
      }
    });
  }

  // STUDENT: Connect to smartboard
  async connectToDisplay(roomCode) {
    const conn = this.peer.connect(roomCode);

    conn.on('open', () => {
      console.log('Connected to display');
      this.displayConnection = conn;

      // Send initial state
      this.sendUpdate({
        type: 'join',
        studentId: this.studentId,
        name: currentStudent.name,
        avatar: currentStudent.avatar
      });
    });
  }

  // STUDENT: Send position update
  sendUpdate(data) {
    if (this.displayConnection && this.displayConnection.open) {
      this.displayConnection.send({
        studentId: this.studentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }

  // DISPLAY: Handle student connection
  onStudentConnect(conn) {
    console.log('Student connected:', conn.peer);

    conn.on('data', (data) => {
      // Update gameboard
      if (data.type === 'join') {
        gameboard.addPlayer(data.studentId, data.name, data.avatar);
      } else if (data.type === 'move') {
        gameboard.moveAvatar(data.studentId, data.position, data.squaresMoved);
      } else if (data.type === 'finish') {
        gameboard.markFinished(data.studentId, data.time, data.rank);
      }
    });

    this.connections.set(conn.peer, conn);
  }
}
```

---

### 3.4 Mini-Game Module Interface

**Standard interface that all mini-games must implement:**

```javascript
// Example: minigames/interval-dash.js

class IntervalDash {
  constructor(container) {
    this.container = container;
    this.state = {
      correct: 0,
      incorrect: 0,
      totalAttempts: 0,
      responseTimes: [],
      startTime: null
    };
    this.onComplete = null; // Callback
  }

  // Initialize and render UI
  async init() {
    this.state.startTime = Date.now();
    this.renderUI();
    await this.preloadAudio();
    this.startRound();
  }

  // Render game-specific UI
  renderUI() {
    this.container.innerHTML = `
      <div class="minigame-header">
        <h2>Interval Dash</h2>
        <div class="timer">60</div>
        <div class="score">0 correct</div>
      </div>

      <div class="minigame-content">
        <div class="audio-player">
          <button id="play-interval">🔊 Play Interval</button>
        </div>

        <div class="answer-buttons">
          <button data-answer="m2">Minor 2nd</button>
          <button data-answer="M2">Major 2nd</button>
          <button data-answer="m3">Minor 3rd</button>
          <button data-answer="M3">Major 3rd</button>
          <button data-answer="P4">Perfect 4th</button>
          <button data-answer="P5">Perfect 5th</button>
          <button data-answer="m6">Minor 6th</button>
          <button data-answer="M6">Major 6th</button>
          <button data-answer="m7">Minor 7th</button>
          <button data-answer="M7">Major 7th</button>
          <button data-answer="P8">Perfect 8ve</button>
        </div>
      </div>
    `;

    // Attach event listeners
    this.container.querySelectorAll('[data-answer]').forEach(btn => {
      btn.addEventListener('click', (e) => this.onAnswer(e.target.dataset.answer));
    });

    document.getElementById('play-interval').addEventListener('click', () => {
      this.playCurrentInterval();
    });

    // Start 60-second timer
    this.startTimer(60);
  }

  // Start a new round
  startRound() {
    this.currentInterval = this.getRandomInterval();
    this.roundStartTime = Date.now();
    this.playCurrentInterval();
  }

  // Handle answer
  onAnswer(selectedInterval) {
    const responseTime = Date.now() - this.roundStartTime;
    this.state.responseTimes.push(responseTime);
    this.state.totalAttempts++;

    if (selectedInterval === this.currentInterval) {
      this.state.correct++;
      this.showFeedback('correct');
    } else {
      this.state.incorrect++;
      this.showFeedback('incorrect');
    }

    this.updateScore();

    // Next round
    setTimeout(() => this.startRound(), 1000);
  }

  // Calculate final result
  getResult() {
    const endTime = Date.now();
    const duration = endTime - this.state.startTime;

    const accuracy = this.state.correct / this.state.totalAttempts;
    const avgResponseTime = this.state.responseTimes.reduce((a, b) => a + b, 0) / this.state.responseTimes.length;

    return {
      gameId: 'interval-dash',
      accuracy: accuracy,
      responseTime: avgResponseTime,
      duration: duration,
      details: {
        correct: this.state.correct,
        incorrect: this.state.incorrect,
        totalAttempts: this.state.totalAttempts
      }
    };
  }

  // Called when timer expires
  onTimerComplete() {
    const result = this.getResult();

    if (this.onComplete) {
      this.onComplete(result);
    }
  }

  // Helper methods
  getRandomInterval() {
    const intervals = ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
    return intervals[Math.floor(Math.random() * intervals.length)];
  }

  async playCurrentInterval() {
    const audio = new Audio(`/assets/audio/intervals/${this.currentInterval}.mp3`);
    await audio.play();
  }

  startTimer(seconds) {
    const timerEl = this.container.querySelector('.timer');
    let remaining = seconds;

    const interval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;

      if (remaining <= 0) {
        clearInterval(interval);
        this.onTimerComplete();
      }
    }, 1000);
  }

  updateScore() {
    const scoreEl = this.container.querySelector('.score');
    scoreEl.textContent = `${this.state.correct} correct`;
  }

  showFeedback(type) {
    const feedback = document.createElement('div');
    feedback.className = `feedback ${type}`;
    feedback.textContent = type === 'correct' ? '✓ Correct!' : '✗ Incorrect';
    this.container.appendChild(feedback);

    setTimeout(() => feedback.remove(), 1000);
  }
}

// Export for module loader
window.MiniGames = window.MiniGames || {};
window.MiniGames['interval-dash'] = IntervalDash;
```

---

## 4. Security & Privacy Analysis

### 4.1 Threat Model: Static Site + Local Storage

**Attack Surface:**

| Component | Exposure | Risk Level | Mitigation |
|-----------|----------|----------|------------|
| **Game code** | Public (GitHub repo) | LOW | Open source = transparent, no secrets in code |
| **Student data** | Local only (microSD) | VERY LOW | Never transmitted over network |
| **Network traffic** | WebRTC sync only (opt-in) | LOW | Only position/score, no PII |
| **Teacher access** | None (no server) | NONE | Teacher can't access student data remotely |
| **Cross-student data** | Isolated | VERY LOW | Each student's data on separate microSD |

---

### 4.2 Comparison to Server-Based Approach

| Aspect | Server Approach (Previous) | Static Site Approach (New) |
|--------|---------------------------|---------------------------|
| **Teacher control** | Full (MITM possible) | None (just displays HTML) |
| **Data location** | Server + student devices | Student devices only |
| **Network traffic** | All gameplay data | Optional WebRTC only |
| **IT approval** | Difficult (security review) | Easy (standard static site) |
| **Privacy** | Teacher can log everything | Students control their data |
| **Malicious potential** | HIGH (backdoors, spying) | MINIMAL (public code) |
| **Single point of failure** | Server crash = all down | Students independent |

**Winner: Static site is FAR safer**

---

### 4.3 IT Security Analysis

**What IT will ask:**

**Q:** "Can you access student data?"
**A:** "No. Data stored on students' microSD cards. I never see it unless they physically hand me the card."

**Q:** "What data is transmitted over the network?"
**A:** "Only if multiplayer enabled: student position (0-100) and score (integer). No names, no responses, no PII. About 100 bytes every 30 seconds."

**Q:** "Can students cheat?"
**A:** "Yes, they could modify their microSD data. But this is a teaching tool, not high-stakes testing. Cheating defeats the learning purpose."

**Q:** "What if your website is hacked?"
**A:** "It's static HTML/JS hosted on GitHub. No database, no backend. Attacker could deface the site, but can't access student data (doesn't exist on server)."

**Q:** "Could you add malicious code?"
**A:** "Technically yes, but the code is open source (IT can audit). I can't update students' local copies without them manually refreshing. And I have no incentive - I'm trying to teach music, not steal data."

**Q:** "Do students need to install anything?"
**A:** "No. Just open a web browser and navigate to URL. No downloads, no extensions, no permissions (except file access to microSD)."

**Q:** "What permissions do you need from IT?"
**A:** "None. GitHub Pages is public internet. Students use standard browsers. If multiplayer enabled, just verify WebRTC isn't blocked on school firewall."

**Verdict: This should be VERY easy to approve.**

---

## 5. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- ✅ Set up GitHub repository
- ✅ Create basic HTML structure
- ✅ Implement File System Access API for microSD
- ✅ Build CSV parser (students, progress, results)
- ✅ Create student selection screen
- ✅ Test on Chrome, Edge, Firefox

### Phase 2: Gameboard (Week 2-3)
- ✅ Build Canvas-based track renderer
- ✅ Implement avatar movement animation
- ✅ Add space types (boost, hazard)
- ✅ Create camera zoom/pan
- ✅ Test with multiple avatars

### Phase 3: Mini-Games (Week 3-6)
- ✅ Create mini-game interface standard
- ✅ Build 3-4 mini-games (interval, rhythm, note names)
- ✅ Implement scoring system
- ✅ Add timer/countdown
- ✅ Test accuracy/response time tracking

### Phase 4: Multiplayer (Week 6-7)
- ✅ Implement WebRTC with PeerJS
- ✅ Build smartboard display mode
- ✅ Add QR code generation for room joining
- ✅ Test with 4-5 students
- ✅ Fallback: Implement ghost racing (Solution B)

### Phase 5: Remaining Mini-Games (Week 7-10)
- ✅ Build remaining 6-7 mini-games
- ✅ Balance difficulty/timing
- ✅ Create audio assets
- ✅ Test full game loop

### Phase 6: Polish & Testing (Week 10-12)
- ✅ Add visual effects (confetti, animations)
- ✅ Sound effects (correct/incorrect)
- ✅ Celebration screen
- ✅ Leaderboard display
- ✅ Export data functionality
- ✅ Full playtesting with real students

### Phase 7: Deployment (Week 12)
- ✅ Deploy to GitHub Pages
- ✅ Create teacher documentation
- ✅ Create example microSD data sets
- ✅ IT approval process
- ✅ Launch with pilot class

---

## 6. Teacher Setup Guide

### 6.1 Preparing Student microSD Cards

**Step 1: Create student roster CSV**

Use Excel/Google Sheets to create `students.csv`:
```csv
student_id,name,grade,class,avatar
s001,Alex Rivera,5,Music 5A,avatar_guitar.png
s002,Jordan Lee,5,Music 5A,avatar_piano.png
s003,Sam Taylor,5,Music 5A,avatar_drums.png
```

Export as CSV.

---

**Step 2: Create empty progress files**

Create blank `game_progress.csv`:
```csv
student_id,game_session_id,timestamp,position,score,status
```

Create blank `minigame_results.csv`:
```csv
student_id,game_session_id,minigame_id,timestamp,accuracy,response_time_ms,points_earned,minigame_data
```

---

**Step 3: Copy to microSD cards**

For each student:
1. Insert microSD card into computer
2. Create folder: `MusicMarathon/`
3. Copy all 3 CSV files into folder
4. Eject microSD card
5. Label card with student name

---

**Step 4: Distribute to students**

- Give each student their microSD card
- Show them how to insert into laptop (SD card slot or USB adapter)
- Have them bookmark game URL

---

### 6.2 Running a Game Session

**Teacher checklist:**

1. ✅ Open smartboard browser
2. ✅ Navigate to: `https://yourusername.github.io/music-marathon/?mode=display`
3. ✅ Room code appears + QR code
4. ✅ Write room code on board: `ROOM-4782`

**Student checklist:**

1. ✅ Insert microSD card into laptop
2. ✅ Open browser (Chrome recommended)
3. ✅ Navigate to: `https://yourusername.github.io/music-marathon/`
4. ✅ Click "Load Data Folder"
5. ✅ Select folder on microSD card
6. ✅ Select your name from list
7. ✅ Enter room code: `ROOM-4782`
8. ✅ Click "Join Game"
9. ✅ Wait for teacher to start

**Teacher starts game:**
1. ✅ Wait for all students to join (see list on smartboard)
2. ✅ Click "Start Game"
3. ✅ Students begin first mini-game
4. ✅ Watch race on smartboard!

---

### 6.3 Post-Game Data Collection

**Option 1: Students eject microSD, hand to teacher**
- Teacher inserts each card, copies CSVs to master folder
- Analyze results with existing results-viewer.html

**Option 2: Export to network folder** (if available)
- Students click "Export Results"
- Save to shared folder: `\\school-server\music-class\results\`
- Teacher collects all results from one location

**Option 3: Email export**
- Students click "Email Results"
- Results.csv attached to email
- Sent to teacher@school.edu
- Teacher aggregates manually

---

## 7. Future Enhancements

### 7.1 Power-Ups & Items (Mario Kart style)
```
Special spaces on track:
- Mystery Box: Random effect (speed boost, steal points, freeze opponent)
- Shield: Protect from hazards for 3 turns
- Turbo: Move 2x spaces next mini-game
- Banana Peel: Place on track to slow opponents
```

### 7.2 Team Mode
```
Students divided into 2-4 teams:
- Team avatar moves based on average performance
- Encourage collaboration
- Team leaderboard
```

### 7.3 Custom Mini-Game Creator
```
Teacher tool to create new mini-games:
- Upload audio files
- Define question/answer pairs
- Set difficulty/timing
- Add to rotation
```

### 7.4 Achievement System
```
Unlock badges for:
- Perfect mini-game (100% accuracy)
- Speed demon (fastest avg response)
- Comeback kid (win from behind)
- Consistency (3 games in a row >90%)
```

### 7.5 Practice Mode
```
Play mini-games solo without racing:
- Focus on specific skills
- No time pressure
- Detailed feedback
- Track improvement over time
```

---

## 8. Success Metrics

### 8.1 Educational Outcomes
- ✅ Student engagement (completion rate)
- ✅ Accuracy improvement over time
- ✅ Response time decrease (automaticity)
- ✅ Skill retention (periodic reassessment)

### 8.2 Technical Performance
- ✅ Game loads in <3 seconds
- ✅ Multiplayer latency <500ms
- ✅ Zero data loss (all results saved)
- ✅ Works on 90%+ of school devices

### 8.3 Teacher Satisfaction
- ✅ Setup time <10 minutes
- ✅ Student onboarding <5 minutes
- ✅ IT approval achieved
- ✅ Reusable for multiple classes

---

## Conclusion

This multiplayer music game combines:
- ✅ **Engaging gameplay** (Mario Party Koopalathon style)
- ✅ **Educational rigor** (music theory mini-games)
- ✅ **Technical safety** (local data, minimal network)
- ✅ **IT-friendly** (static site, transparent code)
- ✅ **Teacher-friendly** (easy setup, reusable)

**Next Steps:**
1. Review this spec with IT department
2. Get approval for GitHub Pages hosting
3. Test WebRTC on school network (multiplayer feasibility)
4. Start Phase 1 implementation
5. Pilot with one class before scaling

**Questions to Resolve:**
1. Should we use WebRTC (Solution A) or file-based sync (Solution B)?
2. How many students per game session? (affects balance)
3. Should avatars be customizable? (add complexity)
4. Do we need offline mode? (save game for later continuation)

---

**Ready to start building?** 🎵🏁

Let me know which solution (A, B, or C) you prefer for multiplayer, and we can begin implementation!
