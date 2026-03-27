// PeerManager - WebRTC host for classroom multi-device sessions
// Manages connections from student client devices (client.html)
// Integrates with app.js via callbacks — no direct coupling

const PEER_ROOM_ID = 'mr-dangerous-music-mvp';

class PeerManager {
  constructor() {
    this.peer        = null;
    this.peers       = new Map();  // peerId → { conn, students: [] }
    this.isOpen      = false;
    this.currentTask = null;       // Last task broadcast (resent on new connection)

    this._onResponse    = null;
    this._onCountChange = null;
    this._onError       = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Open the room. Resolves when room is registered, rejects on error.
   * @param {Array} roster - [{student_id, name, displayName, grade}, ...]
   */
  open(roster) {
    if (this.isOpen) return Promise.resolve();
    this.roster = roster;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(PEER_ROOM_ID);

      this.peer.on('open', id => {
        this.isOpen = true;
        this._notifyCount();
        resolve(id);
      });

      this.peer.on('connection', conn => this._handleConnection(conn));

      this.peer.on('error', err => {
        if (!this.isOpen) reject(err);         // Propagate open-time errors
        this._onError?.(err.type === 'unavailable-id'
          ? 'Room ID busy — wait a moment and try again'
          : 'Connection error: ' + err.type);
      });

      this.peer.on('disconnected', () => {
        this.isOpen = false;
        this._notifyCount();
      });
    });
  }

  /** Close room and all connections */
  close() {
    this.peers.forEach(({ conn }) => {
      try { conn.close(); } catch (_) {}
    });
    this.peers.clear();
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.isOpen      = false;
    this.currentTask = null;
    this._notifyCount();
  }

  /**
   * Broadcast the current task to all identified peers.
   * Also caches it so late-joining/re-identifying devices receive it.
   * @param {Object} taskData - { task_id, question, module_path }
   * @param {Object|null} savedSettings - module settings from app.getModuleSettings()
   */
  broadcastTask(taskData, savedSettings = null) {
    this.currentTask = {
      type:          'task',
      taskId:        taskData.task_id,
      taskQuestion:  taskData.question,
      modulePath:    taskData.module_path,
      savedSettings: savedSettings,
    };
    this.peers.forEach(pd => {
      if (pd.students.length > 0) pd.conn.send(this.currentTask);
    });
  }

  /** Clear current task on all client devices */
  clearTask() {
    this.currentTask = null;
    this.peers.forEach(pd => {
      if (pd.students.length > 0) pd.conn.send({ type: 'task-clear' });
    });
  }

  getConnectedCount()  { return this.peers.size; }
  getIdentifiedCount() {
    let n = 0;
    this.peers.forEach(pd => { if (pd.students.length > 0) n++; });
    return n;
  }

  /** @param {function(data)} cb - called with {student_id, taskId, value, isComplete} */
  onResponse(cb)    { this._onResponse    = cb; }
  /** @param {function(connected, identified)} cb */
  onCountChange(cb) { this._onCountChange = cb; }
  /** @param {function(message)} cb */
  onError(cb)       { this._onError       = cb; }

  // ── Private ────────────────────────────────────────────────────────────────

  _handleConnection(conn) {
    const peerId = conn.peer;
    this.peers.set(peerId, { conn, students: [] });

    conn.on('open', () => {
      // Send full roster so device can render name picker
      conn.send({ type: 'roster', students: this.roster });
      this._notifyCount();
    });

    conn.on('data',  data => this._handleMessage(peerId, data));
    conn.on('close', ()   => { this.peers.delete(peerId); this._notifyCount(); });
    conn.on('error', ()   => { this.peers.delete(peerId); this._notifyCount(); });
  }

  _handleMessage(peerId, data) {
    const pd = this.peers.get(peerId);
    if (!pd) return;

    if (data.type === 'identify') {
      // data.students = [{student_id, name, displayName, grade}, ...]
      pd.students = data.students;
      this._notifyCount();

      // Push the active task if one is running
      if (this.currentTask) pd.conn.send(this.currentTask);
    }

    else if (data.type === 'response' && data.isComplete) {
      this._onResponse?.({
        student_id: data.student_id,
        taskId:     data.taskId,
        value:      data.value,
        isComplete: true,
      });
    }
  }

  _notifyCount() {
    this._onCountChange?.(this.getConnectedCount(), this.getIdentifiedCount());
  }
}
