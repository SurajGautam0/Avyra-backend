const ChatApp = {
  socket: null, userId: null, displayName: null, role: null,
  conversations: [], messages: [], currentConvId: null, activeCall: false, jitsiContainer: null,

  init(user) {
    this.userId = user.id; this.displayName = user.displayName || 'User'; this.role = user.role || 'student';
    this.connect(); this.renderChatUI(); this.bindEvents();
  },

  connect() {
    const token = localStorage.getItem('eduz_token');
    this.socket = io('https://avyra-api.onrender.com', { transports: ['websocket'], extraHeaders: { Authorization: `Bearer ${token}` } });
    this.socket.on('connect', () => { this.socket.emit('chat:join', { userId: this.userId }); this.loadConversations(); });
    this.socket.on('chat:message', d => { if (d.conversationId === this.currentConvId) { this.appendMessage(d, false); this.scrollDown(); this.socket.emit('chat:mark-read', { conversationId: this.currentConvId, userId: this.userId }); } this.loadConversations(); });
    this.socket.on('chat:history', d => { this.messages = d.messages || []; this.renderMessages(); this.scrollDown(); });
    this.socket.on('chat:conversations', d => { this.conversations = d.conversations || []; this.renderConversations(); });
    this.socket.on('chat:read', () => {});
    this.socket.on('chat:error', d => console.error('Chat err:', d.error));

    this.socket.on('video:incoming-call', d => this.showIncomingCall(d));
    this.socket.on('video:call-accepted', d => { this.startJitsi(d.roomId); this.hideModal('callModal'); });
    this.socket.on('video:call-rejected', d => { alert(`${d.callerName} declined`); this.hideModal('callModal'); this.hideJitsi(); });
    this.socket.on('video:call-ended', () => { this.hideJitsi(); alert('Call ended'); });
    this.socket.on('video:call-other-joined', d => { if (this._pendingCallCb) this._pendingCallCb(); });
  },

  renderChatUI() {
    const el = document.getElementById('section-chat');
    if (!el) return;
    el.innerHTML = `
      <div class="chat-container">
        <div class="chat-sidebar">
          <div class="chat-sidebar-header"><h3>💬 Conversations</h3></div>
          <div class="chat-search-wrap"><input class="chat-search" id="chatSearch" placeholder="Search conversations..." /></div>
          <div class="chat-conv-list" id="chatConvList"><div class="chat-loading">Loading...</div></div>
        </div>
        <div class="chat-main">
          <div class="chat-main-header" id="chatMainHeader">
            <span class="chat-conv-name">Select a conversation</span>
            <div class="chat-header-actions">
              <button class="btn btn-sm btn-outline" id="videoCallBtn" style="display:none" title="Video Call">📹 Video Call</button>
            </div>
          </div>
          <div class="chat-msgs" id="chatMsgs">
            <div class="chat-empty">Select a conversation to start chatting</div>
          </div>
          <div class="chat-input-wrap" id="chatInputWrap" style="display:none">
            <input class="chat-input" id="chatInput" placeholder="Type a message..." />
            <button class="btn btn-primary btn-sm" id="chatSendBtn">Send</button>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="incomingCallModal" style="display:none">
        <div class="modal-content"><h3>📹 Incoming Video Call</h3><p id="incomingCallerName">Someone</p>
          <div class="modal-actions"><button class="btn btn-success" id="acceptCallBtn">Accept</button><button class="btn btn-danger" id="rejectCallBtn">Reject</button></div>
        </div>
      </div>
      <div class="modal-overlay" id="callModal" style="display:none">
        <div class="modal-content call-modal-content">
          <div class="call-modal-header"><h3>📹 Video Call</h3><button class="btn btn-danger btn-sm" id="endCallBtn">End Call</button></div>
          <div id="jitsiContainer" class="jitsi-container"></div>
        </div>
      </div>`;
  },

  bindEvents() {
    document.addEventListener('click', e => {
      const convItem = e.target.closest('.chat-conv-item');
      if (convItem) this.openConversation(convItem.dataset.convId);
    });
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') this.sendMessage(); });
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    const search = document.getElementById('chatSearch');
    if (search) search.addEventListener('input', () => this.filterConversations(search.value));
    const vBtn = document.getElementById('videoCallBtn');
    if (vBtn) vBtn.addEventListener('click', () => this.initiateCall());

    const acceptBtn = document.getElementById('acceptCallBtn');
    const rejectBtn = document.getElementById('rejectCallBtn');
    if (acceptBtn) acceptBtn.addEventListener('click', () => this.acceptCall());
    if (rejectBtn) rejectBtn.addEventListener('click', () => this.rejectCall());
    const endBtn = document.getElementById('endCallBtn');
    if (endBtn) endBtn.addEventListener('click', () => this.endCall());
  },

  loadConversations() { this.socket.emit('chat:conversations', { userId: this.userId }); },

  renderConversations() {
    const list = document.getElementById('chatConvList');
    if (!list) return;
    if (!this.conversations.length) { list.innerHTML = '<div class="chat-empty-small">No conversations yet</div>'; return; }
    list.innerHTML = this.conversations.map(c => {
      const other = c.otherUser || {};
      const name = other.displayName || other.email || 'Unknown';
      const initial = name.charAt(0).toUpperCase();
      const active = c.id === this.currentConvId ? 'active' : '';
      return `<div class="chat-conv-item ${active}" data-conv-id="${c.id}">
        <div class="chat-conv-avatar">${initial}</div>
        <div class="chat-conv-info">
          <div class="chat-conv-name">${name}</div>
          <div class="chat-conv-preview">${c.lastMessage || 'No messages yet'}</div>
        </div>
        ${c.unreadCount > 0 ? `<span class="chat-badge">${c.unreadCount}</span>` : ''}
      </div>`;
    }).join('');
  },

  filterConversations(query) {
    document.querySelectorAll('.chat-conv-item').forEach(el => {
      const name = el.querySelector('.chat-conv-name')?.textContent?.toLowerCase() || '';
      el.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
  },

  async openConversation(convId) {
    this.currentConvId = convId;
    this.socket.emit('chat:join', { userId: this.userId, conversationId: convId });
    this.socket.emit('chat:history', { conversationId: convId });
    this.socket.emit('chat:mark-read', { conversationId: convId, userId: this.userId });
    document.querySelectorAll('.chat-conv-item').forEach(el => el.classList.toggle('active', el.dataset.convId === convId));
    document.getElementById('chatInputWrap').style.display = 'flex';
    const conv = this.conversations.find(c => c.id === convId);
    const other = conv?.otherUser || {};
    const name = other.displayName || other.email || 'Chat';
    document.querySelector('#chatMainHeader .chat-conv-name').textContent = name;
    const vBtn = document.getElementById('videoCallBtn');
    if (vBtn) vBtn.style.display = 'inline-flex';
    this._currentReceiverId = other.id;
    this._currentConv = conv;
  },

  renderMessages() {
    const container = document.getElementById('chatMsgs');
    if (!container) return;
    if (!this.messages.length) { container.innerHTML = '<div class="chat-empty">No messages yet. Say hello!</div>'; return; }
    container.innerHTML = this.messages.map(m => {
      const isMe = m.senderId === this.userId;
      const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="chat-msg ${isMe ? 'msg-me' : 'msg-other'}">
        <div class="msg-bubble">${this.escapeHtml(m.text)}</div>
        <div class="msg-time">${time}</div>
      </div>`;
    }).join('');
  },

  appendMessage(msg, prepend) {
    const container = document.getElementById('chatMsgs');
    if (!container) return;
    const isMe = msg.senderId === this.userId;
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const html = `<div class="chat-msg ${isMe ? 'msg-me' : 'msg-other'}">
      <div class="msg-bubble">${this.escapeHtml(msg.text)}</div>
      <div class="msg-time">${time}</div>
    </div>`;
    if (prepend) container.insertAdjacentHTML('afterbegin', html);
    else container.insertAdjacentHTML('beforeend', html);
  },

  sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim() || !this.currentConvId || !this._currentReceiverId) return;
    const text = input.value.trim();
    this.socket.emit('chat:send', { conversationId: this.currentConvId, text, senderId: this.userId, senderName: this.displayName, receiverId: this._currentReceiverId });
    input.value = '';
  },

  scrollDown() {
    const container = document.getElementById('chatMsgs');
    if (container) container.scrollTop = container.scrollHeight;
  },

  // ── Video Calls ──
  initiateCall() {
    if (!this.currentConvId || !this._currentReceiverId) return;
    const roomId = `avyra-${this.currentConvId}-${Date.now()}`;
    const other = this._currentConv?.otherUser || {};
    this.socket.emit('video:call-initiate', { roomId, receiverId: this._currentReceiverId, callerName: this.displayName, callerId: this.userId, conversationId: this.currentConvId });
    this._currentRoomId = roomId;
    this.showModal('callModal');
    document.querySelector('#callModal h3').textContent = '📹 Calling...';
    this._pendingCallCb = () => {
      this.startJitsi(roomId);
      document.querySelector('#callModal h3').textContent = '📹 Video Call';
    };
    // fallback timeout
    setTimeout(() => { if (this._pendingCallCb) { this._pendingCallCb = null; document.querySelector('#callModal h3').textContent = '📹 Call ended (no answer)'; } }, 30000);
  },

  showIncomingCall(data) {
    this._incomingCallData = data;
    document.getElementById('incomingCallerName').textContent = `${data.callerName} is calling...`;
    this.showModal('incomingCallModal');
  },

  acceptCall() {
    const data = this._incomingCallData;
    if (!data) return;
    this._currentRoomId = data.roomId;
    this._currentReceiverId = data.callerId;
    this.socket.emit('video:call-accept', { roomId: data.roomId, callerId: data.callerId });
    this.hideModal('incomingCallModal');
    this.startJitsi(data.roomId);
    this.showModal('callModal');
    document.querySelector('#callModal h3').textContent = '📹 Video Call';
  },

  rejectCall() {
    const data = this._incomingCallData;
    if (data) this.socket.emit('video:call-reject', { callerId: data.callerId, callerName: this.displayName });
    this.hideModal('incomingCallModal');
  },

  endCall() {
    if (this._currentReceiverId) this.socket.emit('video:call-end', { receiverId: this._currentReceiverId });
    this.hideJitsi();
    this.hideModal('callModal');
    this._pendingCallCb = null;
  },

  startJitsi(roomId) {
    this.hideJitsi();
    const container = document.getElementById('jitsiContainer');
    if (!container) return;
    const domain = 'meet.jit.si';
    container.innerHTML = `<iframe src="https://${domain}/${roomId}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName=${encodeURIComponent(this.displayName)}" allow="camera; microphone; display-capture; autoplay" style="width:100%;height:100%;border:0;border-radius:12px;"></iframe>`;
    this.activeCall = true;
  },

  hideJitsi() {
    const container = document.getElementById('jitsiContainer');
    if (container) container.innerHTML = '';
    this.activeCall = false;
    this._pendingCallCb = null;
  },

  showModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; },
  hideModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; },

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },
};
