# Security Considerations for Multiplayer Music Teaching Assistant

## Table of Contents
1. [Critical Security Risks](#critical-security-risks)
2. [Student Data Privacy (FERPA/COPPA)](#student-data-privacy-ferpacoppa)
3. [Network Security](#network-security)
4. [Authentication & Authorization](#authentication--authorization)
5. [Input Validation & Injection Attacks](#input-validation--injection-attacks)
6. [Session Security](#session-security)
7. [Third-Party Services (Firebase) Risks](#third-party-services-firebase-risks)
8. [Denial of Service (DoS) Prevention](#denial-of-service-dos-prevention)
9. [School Network Constraints](#school-network-constraints)
10. [Physical Security](#physical-security)
11. [Recommended Security Architecture](#recommended-security-architecture)
12. [Security Checklist](#security-checklist)

---

## Critical Security Risks

### 🔴 HIGH RISK - Must Address

#### 1. **Unauthenticated Game Access**
**Risk:** Anyone with the room code can join your game
```
Scenario:
- Teacher creates room: Code 4729
- Student shares code with friend in another class
- Friend joins game, sees questions, submits fake responses
- Teacher can't tell who is legitimate student
```

**Impact:**
- Contaminated assessment data
- Disrupted classroom activity
- Student privacy violation (names visible to unauthorized users)

**Mitigation:**
- Require student roster verification (match name against CSV)
- IP address whitelist (only school network)
- Teacher approval for each joining student
- Maximum students per room (based on class size)

---

#### 2. **Man-in-the-Middle (MITM) Attacks**
**Risk:** Unencrypted traffic can be intercepted on school WiFi
```
Attacker on same network:
1. Intercepts WebSocket traffic
2. Sees room codes, student names, responses
3. Could inject fake responses
4. Could steal student data
```

**Impact:**
- Student privacy breach
- Academic integrity compromised
- Potential legal liability (FERPA violation)

**Mitigation:**
- **ALWAYS use HTTPS/WSS (WebSocket Secure)**
- TLS encryption for all traffic
- Certificate pinning on client apps
- Avoid public WiFi networks

---

#### 3. **Session Hijacking**
**Risk:** Attacker steals session token and impersonates student
```
Attack:
1. Student connects to game (gets session token)
2. Attacker intercepts token via network sniffing
3. Attacker connects with stolen token
4. Appears as legitimate student
```

**Impact:**
- False responses recorded
- Student appears to cheat
- Grading integrity compromised

**Mitigation:**
- Short-lived session tokens (expire after game)
- Bind sessions to IP address
- Re-authenticate on suspicious activity
- Use secure, random token generation

---

#### 4. **Data Storage in Third-Party Cloud**
**Risk:** Student data sent to Google/Firebase servers
```
Data potentially exposed:
- Student names
- Performance data (scores, response times)
- Class rosters
- Usage patterns
```

**Impact:**
- FERPA/COPPA violations
- Privacy policy violations
- District data governance breach
- Parental consent issues

**Mitigation:**
- **Self-host if possible** (local server, no cloud)
- Use Firebase with **anonymous IDs** only (no real names)
- Review Firebase data processing agreement
- Get district IT approval
- Parental consent forms if using cloud

---

### 🟡 MEDIUM RISK - Should Address

#### 5. **Cross-Site Scripting (XSS)**
**Risk:** If students can enter custom text (names, etc.), malicious scripts could execute
```html
Student enters name: <script>alert('hacked')</script>
If not sanitized, this runs in teacher's browser
Could steal session data, disrupt game
```

**Impact:**
- Teacher device compromised
- Session data stolen
- Game disruption

**Mitigation:**
- **Sanitize ALL user input**
- Use Content Security Policy (CSP) headers
- Never use `innerHTML` with user data
- Use `.textContent` instead
- Validate input server-side

---

#### 6. **Cheating via Network Inspection**
**Risk:** Tech-savvy students inspect network traffic to see correct answers
```
Student opens browser DevTools:
1. Monitors WebSocket messages
2. Sees "correct_answer": "Perfect 5th" in JSON
3. Always submits correct answer
4. Gets perfect score unfairly
```

**Impact:**
- Unfair advantage
- Grading integrity compromised
- Other students demoralized

**Mitigation:**
- Don't send correct answer to clients until after response
- Server validates responses (don't trust client)
- Detect suspiciously fast responses
- Obfuscate network traffic (encrypt payloads)
- Monitor for perfect scores + instant responses

---

#### 7. **Replay Attacks**
**Risk:** Student captures and resends successful responses
```
Student:
1. Submits correct answer to Question 1
2. Captures the network request
3. Replays same request for Question 2
4. Gets credit for questions they didn't answer
```

**Impact:**
- False assessment results
- Academic integrity breach

**Mitigation:**
- One-time nonce per question
- Timestamp validation (reject old requests)
- Question ID must match current question
- Server tracks which questions answered

---

#### 8. **Denial of Service (DoS)**
**Risk:** Student floods server with requests, crashing the game
```
Malicious student script:
setInterval(() => {
  submitAnswer("random");
}, 10); // 100 requests/second
Server overloaded, game crashes
```

**Impact:**
- Game disrupted
- Other students can't participate
- Teacher loses class time

**Mitigation:**
- Rate limiting (max 1 response per question)
- IP-based request throttling
- WebSocket connection limits
- Captcha for suspicious activity (probably overkill for classroom)

---

### 🟢 LOW RISK - Nice to Have

#### 9. **Physical Device Theft**
**Risk:** Student device stolen, game session active
**Mitigation:** Auto-logout on inactivity, device lock screens

#### 10. **Screen Observation**
**Risk:** Students looking at each other's screens
**Mitigation:** Physical privacy screens (not technical solution)

---

## Student Data Privacy (FERPA/COPPA)

### FERPA (Family Educational Rights and Privacy Act)
**Applies to:** All educational institutions receiving federal funding

**Protected Data:**
- Student names
- Student grades/scores
- Attendance records
- Personally identifiable information (PII)

**Your Multiplayer System Collects:**
- ✅ Student names (if using real names)
- ✅ Performance data (scores, response times)
- ✅ Participation records (who played when)

**Requirements:**
1. **Parental Consent:** If storing data externally (cloud)
2. **Data Minimization:** Only collect what's necessary
3. **Access Controls:** Only authorized users can view data
4. **Data Retention:** Delete data when no longer needed
5. **Third-Party Agreements:** Vendors must sign FERPA compliance

**Recommendations:**
- Use **student IDs** instead of real names
- Store data **locally** (not in cloud) if possible
- Clear session data after each game (or export to CSV first)
- Get **district approval** before deploying
- Review your district's data governance policy

---

### COPPA (Children's Online Privacy Protection Act)
**Applies to:** Online services for children under 13

**Your System:**
- Elementary/middle school students likely under 13
- If collecting data, COPPA applies

**Requirements:**
1. **Parental Consent:** Before collecting any personal info
2. **Privacy Policy:** Clear, easy-to-understand
3. **Data Security:** Reasonable measures to protect data
4. **No Marketing:** Can't use student data for ads/marketing
5. **Parental Access:** Parents can view/delete child's data

**Recommendations:**
- **Anonymous Mode:** Use device IDs, not student names
- **Opt-In:** Parents must explicitly consent
- **No Tracking:** Don't track students across sessions
- **Local Storage:** Keep data on school devices, not cloud

---

## Network Security

### School Network Firewall Issues
**Problem:** Many schools block WebSocket connections (security policy)

**Symptoms:**
- Games work at home, fail at school
- "Connection refused" errors
- Intermittent disconnections

**Solutions:**
1. **HTTP/HTTPS Fallback:** Use long-polling if WebSockets blocked
2. **Port 443 (HTTPS):** Most schools allow this
3. **IT Coordination:** Get WebSocket whitelist approval
4. **Local Server:** Run server on school network (bypasses firewall)

---

### WiFi Security
**Issue:** School WiFi may be open or weakly secured

**Risks:**
- Anyone can connect and snoop traffic
- No device authentication
- Shared network with visitors/guests

**Mitigations:**
- **WPA2/WPA3 Encryption:** Ensure WiFi is encrypted
- **Separate VLAN:** Student devices on isolated network
- **TLS/SSL:** Encrypt all traffic regardless of WiFi security

---

## Authentication & Authorization

### Current System (Insecure)
```javascript
// BAD: Anyone can join with room code
socket.emit('join', { roomCode: '4729', name: 'Hacker' });
// No verification!
```

### Recommended System

#### Option 1: Pre-Registered Students
```javascript
// Teacher uploads student roster before game
// Students must match roster to join

const studentRoster = [
  { id: 's123', name: 'Alex Smith', grade: 5 },
  { id: 's124', name: 'Jordan Lee', grade: 5 }
];

// Student joins
socket.emit('join', {
  roomCode: '4729',
  studentId: 's123',
  name: 'Alex Smith'
});

// Server validates
if (!roster.find(s => s.id === studentId && s.name === name)) {
  socket.emit('error', 'Not in class roster');
  socket.disconnect();
}
```

#### Option 2: Teacher Approval
```javascript
// Student requests to join
socket.emit('requestJoin', { roomCode: '4729', name: 'Alex Smith' });

// Teacher sees pending request on smartboard
// Teacher clicks "Approve" or "Deny"
// Only approved students can play
```

#### Option 3: Device Whitelist
```javascript
// Teacher pre-approves devices (iPads)
// Each device has unique ID
const approvedDevices = ['ipad-cart-01', 'ipad-cart-02', ...];

if (!approvedDevices.includes(deviceId)) {
  socket.emit('error', 'Unauthorized device');
  socket.disconnect();
}
```

---

## Input Validation & Injection Attacks

### XSS Prevention
```javascript
// BAD: Direct insertion of user input
element.innerHTML = studentName; // ❌ DANGEROUS

// GOOD: Use textContent
element.textContent = studentName; // ✅ SAFE

// GOOD: Sanitize HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(studentName); // ✅ SAFE
```

### Input Validation
```javascript
// Validate all inputs server-side
function validateStudentName(name) {
  // Only letters, spaces, hyphens
  if (!/^[a-zA-Z\s\-]{1,50}$/.test(name)) {
    throw new Error('Invalid name format');
  }
  return name.trim();
}

function validateRoomCode(code) {
  // Exactly 4-6 digits
  if (!/^\d{4,6}$/.test(code)) {
    throw new Error('Invalid room code');
  }
  return code;
}

function validateResponse(response, questionType) {
  // Validate response matches expected format
  switch(questionType) {
    case 'interval':
      const validIntervals = ['M2', 'M3', 'P4', 'P5', 'M6', 'M7', 'P8'];
      if (!validIntervals.includes(response)) {
        throw new Error('Invalid interval');
      }
      break;
    // ... other types
  }
  return response;
}
```

### SQL Injection Prevention
**Note:** Your current system uses CSV files (no SQL database), but if you move to a database:

```javascript
// BAD: String concatenation
const query = `SELECT * FROM students WHERE name = '${name}'`; // ❌ DANGEROUS

// GOOD: Parameterized queries
const query = 'SELECT * FROM students WHERE name = ?';
db.query(query, [name]); // ✅ SAFE
```

---

## Session Security

### Secure Session Tokens
```javascript
// Generate cryptographically random tokens
const crypto = require('crypto');

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
  // Example: "a7f3c9d2e8b4f1a6c3d7e9f2b8a4c1d3..."
}

// Session object
const session = {
  token: generateSessionToken(),
  studentId: 's123',
  roomCode: '4729',
  createdAt: Date.now(),
  expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
  ipAddress: req.connection.remoteAddress
};

// Validate session
function validateSession(token, ipAddress) {
  const session = sessions.get(token);

  if (!session) {
    throw new Error('Invalid session');
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    throw new Error('Session expired');
  }

  // Optional: Bind to IP address
  if (session.ipAddress !== ipAddress) {
    throw new Error('Session hijacked (IP mismatch)');
  }

  return session;
}
```

### Session Lifecycle
```javascript
// 1. Create session on join
socket.on('join', (data) => {
  const session = createSession(data.studentId, data.roomCode);
  socket.sessionToken = session.token;
  socket.emit('sessionCreated', { token: session.token });
});

// 2. Validate on each request
socket.on('submitResponse', (data) => {
  const session = validateSession(data.token, socket.handshake.address);
  // Process response...
});

// 3. Destroy session on disconnect or game end
socket.on('disconnect', () => {
  sessions.delete(socket.sessionToken);
});

socket.on('gameEnd', () => {
  // Clear all sessions for this room
  sessions.forEach((session, token) => {
    if (session.roomCode === roomCode) {
      sessions.delete(token);
    }
  });
});
```

---

## Third-Party Services (Firebase) Risks

### Data Sent to Firebase
If using Firebase Realtime Database, this data lives on Google servers:

```javascript
// Example Firebase data structure
{
  "sessions": {
    "4729": {
      "roomCode": "4729",
      "teacherId": "t_jones",
      "students": {
        "s123": {
          "name": "Alex Smith",      // ⚠️ PII
          "responses": [...],         // ⚠️ Performance data
          "score": 85                 // ⚠️ Educational record
        }
      }
    }
  }
}
```

**FERPA Risk:** This is student educational records stored with third party

### Mitigation Strategies

#### Strategy 1: Anonymize Data
```javascript
// Use anonymous IDs instead of names
{
  "sessions": {
    "4729": {
      "students": {
        "anon_a7f3c9": {              // ✅ Anonymous ID
          "deviceId": "ipad-12",      // ✅ Generic
          "responses": [...],
          "score": 85
        }
      }
    }
  }
}

// Teacher's local CSV maps anonymous ID to real student
// This mapping NEVER sent to Firebase
anon_a7f3c9 → Alex Smith (stored locally only)
```

#### Strategy 2: Firebase Security Rules
```javascript
// Only authenticated teachers can read/write
{
  "rules": {
    "sessions": {
      "$roomCode": {
        ".read": "auth.uid === data.child('teacherId').val()",
        ".write": "auth.uid === data.child('teacherId').val()"
      }
    }
  }
}
```

#### Strategy 3: Auto-Delete Data
```javascript
// Cloud function to delete old game sessions
exports.cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    const snapshot = await admin.database().ref('sessions').once('value');
    const sessions = snapshot.val();

    Object.keys(sessions).forEach(roomCode => {
      if (sessions[roomCode].createdAt < cutoff) {
        admin.database().ref(`sessions/${roomCode}`).remove();
      }
    });
  });
```

#### Strategy 4: Self-Host Instead
**Best for Privacy:**
- Run your own WebSocket server (Node.js)
- All data stays on school network
- No third-party data processing
- Full control over security

```javascript
// Local server (no Firebase)
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// All data in server memory (RAM)
const sessions = new Map();

// When server restarts, data is wiped (good for privacy)
// If you need persistence, save to local file/database
```

---

## Denial of Service (DoS) Prevention

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// Limit connections per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per 15 min
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// Per-student rate limit
const studentRateLimits = new Map();

socket.on('submitResponse', (data) => {
  const studentId = data.studentId;
  const lastSubmit = studentRateLimits.get(studentId) || 0;
  const now = Date.now();

  if (now - lastSubmit < 1000) { // Min 1 second between responses
    socket.emit('error', 'Too fast! Wait before submitting.');
    return;
  }

  studentRateLimits.set(studentId, now);
  // Process response...
});
```

### Connection Limits
```javascript
const MAX_STUDENTS_PER_ROOM = 30;
const MAX_ROOMS = 50;

io.on('connection', (socket) => {
  const roomCode = socket.handshake.query.roomCode;
  const room = rooms.get(roomCode);

  if (!room) {
    socket.emit('error', 'Invalid room code');
    socket.disconnect();
    return;
  }

  if (room.students.size >= MAX_STUDENTS_PER_ROOM) {
    socket.emit('error', 'Room is full');
    socket.disconnect();
    return;
  }

  if (rooms.size >= MAX_ROOMS) {
    socket.emit('error', 'Server is full');
    socket.disconnect();
    return;
  }

  // Allow connection
});
```

### Resource Monitoring
```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);

  if (usedMB > 500) { // More than 500 MB used
    console.warn('High memory usage:', usedMB, 'MB');
    // Maybe clear old sessions, kick inactive users
  }
}, 60000); // Check every minute

// Monitor CPU usage
const os = require('os');
setInterval(() => {
  const cpus = os.cpus();
  const avgLoad = cpus.reduce((sum, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    return sum + ((total - idle) / total);
  }, 0) / cpus.length;

  if (avgLoad > 0.8) { // More than 80% CPU
    console.warn('High CPU usage:', Math.round(avgLoad * 100), '%');
  }
}, 60000);
```

---

## School Network Constraints

### Common Issues

#### Issue 1: WebSocket Blocked
**Solution:** HTTP long-polling fallback
```javascript
// Socket.IO has this built in
const io = require('socket.io')(server, {
  transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
  cors: {
    origin: '*', // Configure based on your domain
    methods: ['GET', 'POST']
  }
});
```

#### Issue 2: Proxy/Content Filter
**Problem:** School content filter blocks game server

**Solutions:**
- Get IT to whitelist your server domain
- Run server on port 443 (HTTPS) - rarely blocked
- Use school-approved hosting (district servers)

#### Issue 3: Bandwidth Limitations
**Problem:** 30 students streaming audio = network congestion

**Solutions:**
- Pre-cache audio files on student devices
- Use low-bitrate audio (mono, 16kHz, 64kbps)
- Send audio URL, not audio data
- Limit concurrent games per school

---

## Physical Security

### Device Loss/Theft
**Scenario:** Student's iPad stolen with game session active

**Mitigations:**
- Auto-logout after 5 minutes inactivity
- Require re-authentication on resume
- Device lock screens (not your responsibility, but recommend)
- Session expires when game ends

### Screen Observation (Cheating)
**Scenario:** Students looking at each other's screens

**Mitigations:**
- Classroom arrangement (spread out devices)
- Privacy screen protectors (hardware)
- Randomize answer order on multiple choice
- Time pressure reduces copying effectiveness

**Note:** Some collaboration is okay in educational settings!

---

## Recommended Security Architecture

### Secure Multiplayer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TEACHER DEVICE                        │
│                    (Smartboard)                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  HTTPS/WSS Connection                          │    │
│  │  - TLS 1.3 Encrypted                           │    │
│  │  - Teacher Auth Token                          │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SECURE SERVER (School Network)              │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Security Layers:                              │    │
│  │  1. TLS Encryption (HTTPS/WSS)                 │    │
│  │  2. Authentication (Teacher Login)             │    │
│  │  3. Authorization (Room Code + Roster)         │    │
│  │  4. Input Validation (All Data)                │    │
│  │  5. Rate Limiting (DoS Prevention)             │    │
│  │  6. Session Management (Expiring Tokens)       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Data Storage (Memory Only):                   │    │
│  │  - Active sessions in RAM                      │    │
│  │  - No long-term student data                   │    │
│  │  - Export to CSV on request                    │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴───────────┬──────────────┐
        ▼                        ▼              ▼
┌──────────────┐        ┌──────────────┐  ┌──────────────┐
│  STUDENT 1   │        │  STUDENT 2   │  │  STUDENT 3   │
│              │        │              │  │              │
│ HTTPS/WSS    │        │ HTTPS/WSS    │  │ HTTPS/WSS    │
│ Session Token│        │ Session Token│  │ Session Token│
│ Device ID    │        │ Device ID    │  │ Device ID    │
└──────────────┘        └──────────────┘  └──────────────┘
```

### Security Checklist Implementation

```javascript
// 1. HTTPS/WSS Only
const server = https.createServer({
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem')
}, app);

const io = socketIO(server, {
  transports: ['websocket'],
  cors: {
    origin: 'https://yourschool.edu',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 2. Authentication
const authenticateTeacher = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.teacherId = decoded.teacherId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// 3. Input Validation
const { body, validationResult } = require('express-validator');

app.post('/api/session/create',
  authenticateTeacher,
  body('className').trim().isLength({ min: 1, max: 50 }),
  body('moduleType').isIn(['interval', 'rhythm', 'solfege']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Create session...
  }
);

// 4. Rate Limiting
const studentRateLimiter = new Map();

io.on('connection', (socket) => {
  socket.on('submitResponse', (data) => {
    const key = `${socket.id}:submitResponse`;
    const lastCall = studentRateLimiter.get(key) || 0;

    if (Date.now() - lastCall < 1000) {
      socket.emit('error', 'Rate limit exceeded');
      return;
    }

    studentRateLimiter.set(key, Date.now());
    // Process response...
  });
});

// 5. Session Security
const sessions = new Map();

function createSession(roomCode, teacherId) {
  const sessionData = {
    id: crypto.randomBytes(16).toString('hex'),
    roomCode,
    teacherId,
    students: new Map(),
    createdAt: Date.now(),
    expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
  };

  sessions.set(sessionData.id, sessionData);

  // Auto-cleanup on expiry
  setTimeout(() => {
    sessions.delete(sessionData.id);
  }, 2 * 60 * 60 * 1000);

  return sessionData;
}
```

---

## Security Checklist

### Before Deployment

- [ ] **TLS/SSL Certificate** installed and configured
- [ ] **HTTPS enforced** (redirect HTTP → HTTPS)
- [ ] **WebSocket Secure (WSS)** enabled
- [ ] **Input validation** on all user inputs
- [ ] **XSS prevention** (no innerHTML with user data)
- [ ] **Rate limiting** implemented
- [ ] **Session tokens** cryptographically random
- [ ] **Session expiry** configured (< 2 hours)
- [ ] **Authentication** required for teacher access
- [ ] **Authorization** checks for student roster
- [ ] **Data anonymization** (no PII to cloud if using Firebase)
- [ ] **Content Security Policy** headers set
- [ ] **CORS** configured (whitelist school domains only)
- [ ] **Error handling** (no stack traces to client)
- [ ] **Logging** for security events (failed auth, rate limits)

### Compliance

- [ ] **FERPA review** completed
- [ ] **COPPA review** completed (if under 13)
- [ ] **District IT approval** obtained
- [ ] **Privacy policy** written and shared
- [ ] **Parental consent** forms signed (if needed)
- [ ] **Data retention policy** defined
- [ ] **Incident response plan** documented

### Testing

- [ ] **Penetration testing** (try to hack your own system)
- [ ] **Security audit** by third party
- [ ] **Load testing** (simulate DoS attack)
- [ ] **Network testing** on school WiFi
- [ ] **Device testing** (iPads, Chromebooks, etc.)
- [ ] **Browser testing** (Chrome, Safari, Edge, Firefox)

---

## Incident Response Plan

### If Security Breach Occurs

1. **Immediate Actions (< 5 minutes)**
   - Shut down server immediately
   - Disconnect all student sessions
   - Preserve logs for analysis

2. **Investigation (< 1 hour)**
   - Review server logs for intrusion
   - Identify compromised accounts/sessions
   - Determine scope of data exposure

3. **Notification (< 24 hours)**
   - Notify district IT security team
   - Notify affected students/parents (if PII exposed)
   - File incident report per district policy

4. **Remediation (< 1 week)**
   - Patch vulnerability
   - Reset all passwords/tokens
   - Review security architecture
   - Implement additional safeguards

5. **Post-Mortem (< 2 weeks)**
   - Document what happened
   - Update security procedures
   - Train users on new policies
   - Consider third-party security audit

---

## Recommended Security Tools

### For Development
- **Helmet.js** - Secure HTTP headers for Express
- **express-rate-limit** - Rate limiting middleware
- **express-validator** - Input validation
- **DOMPurify** - XSS sanitization
- **jsonwebtoken** - JWT authentication
- **bcrypt** - Password hashing (if needed)

### For Monitoring
- **Winston** - Logging framework
- **PM2** - Process monitoring
- **Sentry** - Error tracking
- **New Relic** - Performance monitoring

### For Testing
- **OWASP ZAP** - Security scanner
- **Burp Suite** - Penetration testing
- **Artillery** - Load testing
- **Lighthouse** - Security audit (Chrome DevTools)

---

## Conclusion

### Top 3 Security Priorities

1. **🔐 Use HTTPS/WSS** - Non-negotiable for student data
2. **🛡️ Validate All Input** - Prevent injection attacks
3. **🔒 Self-Host if Possible** - Avoid third-party data sharing

### If You Only Do One Thing...

**Self-host on school network with HTTPS.**

This eliminates:
- Third-party data sharing (FERPA risk)
- Firewall/proxy issues
- Internet dependency
- Cloud service costs

And provides:
- Full control over security
- Compliance with district policies
- Better performance (local network)
- No ongoing costs

---

### Getting District IT Approval

**Prepare this packet for IT review:**

1. **System Architecture Diagram** (include this document)
2. **Data Flow Diagram** (what data goes where)
3. **Privacy Impact Assessment** (FERPA/COPPA compliance)
4. **Security Controls List** (encryption, authentication, etc.)
5. **Incident Response Plan** (what if something goes wrong)
6. **Third-Party Vendors** (if using Firebase, include DPA)

**Questions They'll Ask:**
- Where is student data stored? *(Answer: Local server, no cloud)*
- Is traffic encrypted? *(Answer: Yes, TLS 1.3)*
- Who has access to data? *(Answer: Only teacher, session-only)*
- What happens on security breach? *(Answer: See incident response plan)*
- How long is data retained? *(Answer: Deleted after game ends)*

---

**Document Prepared by:** Claude Code Security Analysis
**Date:** 2026-01-29
**Version:** 1.0
**Next Review:** Before deployment
