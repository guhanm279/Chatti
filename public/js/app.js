// CHATTi Application Engine: State, Realtime WebSocket, and Core UI

window.currentUserId = 'user_guhan';
window.activeConversationId = 'conv_alpha';
window.allUsers = [];
window.allConversations = [];
window.socket = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await fetchDbStatus();
  await loadUsers();
  await loadConversations();
  await loadMessages(window.activeConversationId);
  await refreshActionsPanel();
  initWebSocket();
  setupEventListeners();
});

// -------------------------------------------------------------
// 1. REALTIME WEBSOCKET SYNC
// -------------------------------------------------------------
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  window.socket = new WebSocket(wsUrl);

  window.socket.onopen = () => {
    console.log('📡 CHATTi Realtime WebSocket Connected');
  };

  window.socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (e) {
      console.error('WS parse error:', e);
    }
  };

  window.socket.onclose = () => {
    console.warn('WS disconnected. Reconnecting in 3s...');
    setTimeout(initWebSocket, 3000);
  };
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'NEW_MESSAGE':
    case 'NEW_WHISPER':
    case 'TASK_CREATED':
      if (data.conversationId === window.activeConversationId) {
        loadMessages(window.activeConversationId);
      }
      refreshActionsPanel();
      break;

    case 'TASK_UPDATED':
      refreshActionsPanel();
      loadMessages(window.activeConversationId);
      break;

    case 'FUSE_STARTED':
      if (data.conversationId === window.activeConversationId) {
        loadMessages(window.activeConversationId);
      }
      refreshActionsPanel();
      break;

    case 'VOTE_CAST':
      updateFuseDom(data.fuse);
      refreshActionsPanel();
      break;

    case 'FUSE_LOCKED':
      loadMessages(window.activeConversationId);
      refreshActionsPanel();
      break;
  }
}

// -------------------------------------------------------------
// 2. DATA LOADERS & REST API
// -------------------------------------------------------------
async function fetchDbStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      const statusText = document.getElementById('db-status-text');
      const dot = document.getElementById('db-indicator-dot');
      const modalStorage = document.getElementById('modal-db-storage-type');

      if (data.status.connected) {
        if (statusText) statusText.innerText = 'Aiven Database ⚡';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
        if (modalStorage) modalStorage.innerText = data.status.storageType || 'Aiven Cloud Database ⚡';
      } else {
        if (statusText) statusText.innerText = 'Database Offline';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400';
        if (modalStorage) modalStorage.innerText = 'Disconnected';
      }
    }
  } catch (e) {
    console.warn('Status fetch error:', e);
  }
}

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      window.allUsers = data.users;
      renderUserSwitcherOptions();
      updateCurrentUserUI();
    }
  } catch (e) {
    console.warn('Users load error:', e);
  }
}

async function loadConversations() {
  try {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    if (data.success) {
      window.allConversations = data.conversations;
      renderConversationsList();
    }
  } catch (e) {
    console.warn('Conversations load error:', e);
  }
}

async function loadMessages(conversationId) {
  const container = document.getElementById('messages-stream');
  if (!container) return;

  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages?userId=${window.currentUserId}`);
    const data = await res.json();
    if (!data.success) return;

    const messages = data.messages;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center text-outline gap-2">
          <span class="material-symbols-outlined text-[32px]">chat_bubble_outline</span>
          <p class="text-xs">No messages yet. Send a message to start the action stream!</p>
        </div>
      `;
      return;
    }

    // Render timeline
    container.innerHTML = `
      <div class="flex items-center justify-center gap-4 my-2">
        <div class="h-[1px] flex-1 bg-surface-container-high"></div>
        <span class="px-3 py-0.5 rounded-full bg-surface-container text-outline text-[11px] uppercase tracking-wider">Today • Live Stream</span>
        <div class="h-[1px] flex-1 bg-surface-container-high"></div>
      </div>
    ` + messages.map(msg => renderMessageRow(msg)).join('');

    // Attach countdown listeners to any active fuses
    messages.forEach(msg => {
      if (msg.fuse && msg.fuse.status === 'active') {
        setupFuseCountdown(msg.fuse);
      }
    });

  } catch (e) {
    console.error('Failed to load messages:', e);
  }
}

// -------------------------------------------------------------
// 3. MESSAGE COMPONENT RENDERING (STITCH VISUAL FIDELITY)
// -------------------------------------------------------------
function renderMessageRow(msg) {
  const isMe = msg.sender_id === window.currentUserId;
  const isWhisper = msg.message_type === 'whisper';
  const isRedactedWhisper = isWhisper && msg.is_redacted;

  // Case A: Stealth Redacted Whisper for unauthorized user
  if (isRedactedWhisper) {
    return `
      <div class="flex items-center justify-center my-1.5 animate-slide-up">
        <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs shadow-sm border border-white/5">
          <span class="material-symbols-outlined text-tertiary text-[15px]">lock</span>
          <span>${msg.content}</span>
          <span class="text-outline text-[10px]">• ${formatTime(msg.created_at)}</span>
        </div>
      </div>
    `;
  }

  // Case B: Authorized Private Whisper
  if (isWhisper && !isRedactedWhisper && msg.whisper) {
    return `
      <div class="flex items-start gap-3 group message-row animate-slide-up my-1">
        <div class="w-9 h-9 rounded-full bg-surface-container-highest text-tertiary font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm border border-tertiary/20">
          ${msg.sender_avatar || 'G'}
        </div>
        <div class="flex flex-col gap-1 max-w-xl flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-on-surface">${msg.sender_name}</span>
              <span class="text-[11px] text-outline">${formatTime(msg.created_at)}</span>
              <span class="px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary text-[10px] font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">visibility_lock</span> P2P Whisper
              </span>
            </div>
          </div>
          <!-- Glowing Whisper Box -->
          <div class="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-surface-container-high to-surface-container shadow-xl relative overflow-hidden border border-amber-500/30 whisper-active-card">
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-1.5 text-tertiary text-[11px] font-bold uppercase tracking-wider">
                <span class="material-symbols-outlined text-[15px]">lock</span>
                <span>Private Whisper • Visible only to you & ${msg.whisper.sender_id === window.currentUserId ? msg.whisper.recipient_name : msg.whisper.sender_name}</span>
              </div>
              <span class="material-symbols-outlined text-outline text-[16px]" title="End-to-end tunnel active">lock_clock</span>
            </div>
            <p class="text-sm text-on-surface font-medium italic">
              “${msg.whisper.content}”
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Case C: Standard Message with optional Magic Task or Fuse
  return `
    <div class="flex items-start gap-3 group message-row animate-slide-up relative">
      <!-- Sender Avatar -->
      <div class="w-9 h-9 rounded-full bg-surface-container-highest text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm border border-white/5">
        ${msg.sender_avatar || msg.sender_name[0]}
      </div>

      <!-- Message Content Column -->
      <div class="flex flex-col gap-1.5 max-w-2xl flex-1 min-w-0">
        
        <!-- Header & Hover Floating Actions -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-on-surface">${msg.sender_name}</span>
            <span class="text-[11px] text-outline">${formatTime(msg.created_at)}</span>
            ${msg.task ? `
              <span class="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[10px] font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">auto_awesome</span> Magic Triggered
              </span>
            ` : ''}
            ${msg.fuse ? `
              <span class="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">bolt</span> Fuse Initialized
              </span>
            ` : ''}
          </div>

          <!-- Message Actions (Hover Dock) -->
          <div class="message-actions flex items-center gap-1 px-2 py-1 rounded-xl bg-surface-container-high/90 backdrop-blur-md shadow-lg border border-white/5">
            <button onclick="openWhisperModal({ id: '${msg.id}', content: '${escapeHtml(msg.content)}' })" class="px-2 py-0.5 rounded-lg text-outline hover:text-tertiary text-[11px] flex items-center gap-1 hover:bg-surface-container transition-all" title="Send Whisper">
              <span class="material-symbols-outlined text-[14px]">lock</span>
              <span>Whisper</span>
            </button>
            <button onclick="openMagicModal({ id: '${msg.id}', content: '${escapeHtml(msg.content)}' })" class="px-2 py-0.5 rounded-lg text-outline hover:text-primary text-[11px] flex items-center gap-1 hover:bg-surface-container transition-all" title="Magic: Create Task">
              <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>Magic</span>
            </button>
            <button onclick="openFuseModal({ id: '${msg.id}', content: '${escapeHtml(msg.content)}' })" class="px-2 py-0.5 rounded-lg text-outline hover:text-secondary text-[11px] flex items-center gap-1 hover:bg-surface-container transition-all" title="Fuse: 10s Poll">
              <span class="material-symbols-outlined text-[14px]">local_fire_department</span>
              <span>Fuse</span>
            </button>
          </div>
        </div>

        <!-- Message Bubble -->
        <div class="p-3.5 rounded-2xl rounded-tl-sm ${isMe ? 'bg-gradient-to-r from-primary-container/25 to-surface-container border border-primary/20' : 'bg-surface-container border border-white/5'} text-on-surface shadow-sm text-xs sm:text-sm leading-relaxed">
          ${escapeHtml(msg.content)}
        </div>

        <!-- ATTACHED TASK CARD (IF CREATED VIA MAGIC) -->
        ${msg.task ? renderAttachedTaskCard(msg.task) : ''}

        <!-- ATTACHED FUSE CARD (IF CREATED VIA FUSE) -->
        ${msg.fuse ? renderAttachedFuseCard(msg.fuse) : ''}
      </div>
    </div>
  `;
}

// Sub-component: Attached Task Card
function renderAttachedTaskCard(task) {
  const isCompleted = task.status === 'completed';
  return `
    <div class="flex flex-col gap-1 mt-1">
      <div class="ml-4 flex items-center gap-2 py-0.5 text-primary text-[11px]">
        <div class="w-0.5 h-4 bg-gradient-to-b from-primary to-secondary"></div>
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[13px]">alt_route</span>
          Parsed 1 executable action
        </span>
      </div>

      <div class="p-3.5 rounded-2xl bg-surface-container-high shadow-xl relative overflow-hidden border border-white/5">
        <div class="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary-container to-secondary"></div>
        <div class="flex flex-col gap-2 pl-2">
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-primary text-[11px] font-bold uppercase tracking-wider">
              <span class="material-symbols-outlined text-[15px]">task_alt</span>
              <span>Task Created • From Conversation</span>
            </div>
            <span class="px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-tertiary-container/20 text-tertiary'} text-[10px] font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-tertiary'}"></span>
              ${isCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>

          <div>
            <h4 class="font-display font-bold text-sm text-on-surface ${isCompleted ? 'line-through text-outline' : ''}">${task.title}</h4>
            <p class="text-[11px] text-on-surface-variant mt-0.5">${task.description || 'Action parsed from thread dialogue.'}</p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-[11px] text-on-surface border border-white/5">
                <span class="w-3.5 h-3.5 rounded-full bg-primary-container text-on-primary-container text-[9px] font-bold flex items-center justify-center">
                  ${task.assignee_avatar || 'U'}
                </span>
                <span>${task.assignee_name || 'Assignee'}</span>
              </div>
              <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-tertiary text-[11px] border border-white/5">
                <span class="material-symbols-outlined text-[14px]">schedule</span>
                <span>${task.deadline || 'Today, 6:00 PM'}</span>
              </div>
            </div>

            <button onclick="toggleTaskComplete('${task.id}', '${task.status}')" class="px-3 py-1 rounded-xl ${isCompleted ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary hover:bg-primary-fixed'} text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md">
              <span class="material-symbols-outlined text-[15px]">${isCompleted ? 'check' : 'check_circle'}</span>
              <span>${isCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Sub-component: Attached Fuse Card
function renderAttachedFuseCard(fuse) {
  const isLocked = fuse.status === 'locked' || fuse.seconds_remaining <= 0;

  if (isLocked) {
    // Locked Permanent Decision Record
    return `
      <div class="mt-2 p-3.5 rounded-2xl bg-surface-container shadow-lg flex items-center justify-between gap-3 border border-secondary/30">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-secondary uppercase tracking-wider">🔥 Decision Locked</span>
              <span class="text-[10px] text-outline">• Consensus Reached</span>
            </div>
            <h4 class="font-display font-bold text-sm text-on-surface truncate">Outcome: ${fuse.outcome || fuse.option_a}</h4>
            <p class="text-[11px] text-on-surface-variant">${fuse.total_votes || 1} votes (${fuse.percent_a}%) • Permanent conversation record archived</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <span class="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold items-center gap-1 border border-white/5">
            <span class="material-symbols-outlined text-[13px]">inventory_2</span> Vault Record
          </span>
        </div>
      </div>
    `;
  }

  // Active Live Voting Card
  return `
    <div id="fuse-card-${fuse.id}" class="mt-2 p-4 rounded-2xl bg-surface-container-high shadow-2xl relative overflow-hidden border border-secondary/40 fuse-active-card">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-tertiary animate-pulse"></div>
      
      <div class="flex flex-col gap-3">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs text-secondary font-bold uppercase tracking-wider">
            <span class="material-symbols-outlined text-[18px]">local_fire_department</span>
            <span>Message Fuse • 10s Rapid Consensus</span>
          </div>
          <div id="fuse-timer-${fuse.id}" data-seconds="${fuse.seconds_remaining}" class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold animate-pulse">
            <span class="material-symbols-outlined text-[14px]">hourglass_bottom</span>
            <span>${fuse.seconds_remaining < 10 ? '0' + fuse.seconds_remaining : fuse.seconds_remaining}s remaining</span>
          </div>
        </div>

        <!-- Question -->
        <h4 class="font-display font-semibold text-sm sm:text-base text-on-surface">${fuse.question}</h4>

        <!-- Voting Option A -->
        <div onclick="castFuseVote('${fuse.id}', 'option_a')" class="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest cursor-pointer border border-white/5 transition-all group">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-on-surface flex items-center gap-2">
              <span class="text-secondary font-bold">✓</span>
              <span>${fuse.option_a}</span>
            </span>
            <span id="fuse-pct-a-${fuse.id}" class="text-secondary">${fuse.votes_a} votes • ${fuse.percent_a}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
            <div id="fuse-bar-a-${fuse.id}" class="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-300" style="width: ${fuse.percent_a}%"></div>
          </div>
        </div>

        <!-- Voting Option B -->
        <div onclick="castFuseVote('${fuse.id}', 'option_b')" class="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest cursor-pointer border border-white/5 transition-all group">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-on-surface-variant flex items-center gap-2">
              <span class="text-outline">•</span>
              <span>${fuse.option_b}</span>
            </span>
            <span id="fuse-pct-b-${fuse.id}" class="text-outline">${fuse.votes_b} votes • ${fuse.percent_b}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
            <div id="fuse-bar-b-${fuse.id}" class="h-full rounded-full bg-outline-variant/60 transition-all duration-300" style="width: ${fuse.percent_b}%"></div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="flex items-center justify-between pt-1 text-[11px] text-outline border-t border-white/5">
          <span>Click option above to vote</span>
          <span>Auto-executes upon timer expiry</span>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 4. USER SWITCHER & PERSPECTIVE CHANGE
// -------------------------------------------------------------
function renderUserSwitcherOptions() {
  const container = document.getElementById('user-options-container');
  if (!container) return;

  container.innerHTML = window.allUsers.map(u => `
    <button onclick="switchUser('${u.id}')" class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container-high transition-colors text-left w-full ${u.id === window.currentUserId ? 'bg-primary-container/20 text-primary' : 'text-on-surface'}">
      <div class="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-[10px]">
        ${u.avatar || u.name[0]}
      </div>
      <div class="min-w-0">
        <span class="text-xs font-semibold block truncate">${u.name}</span>
        <span class="text-[9px] text-outline block truncate">${u.role || 'Member'}</span>
      </div>
    </button>
  `).join('');
}

function switchUser(userId) {
  window.currentUserId = userId;
  updateCurrentUserUI();
  toggleUserDropdown();
  loadMessages(window.activeConversationId);
  showToast(`Switched perspective to ${getCurrentUser()?.name || 'User'}`, 'info');
}

function getCurrentUser() {
  return window.allUsers.find(u => u.id === window.currentUserId) || null;
}

function updateCurrentUserUI() {
  const user = getCurrentUser();
  if (!user) return;

  const dropAvatar = document.getElementById('dropdown-user-avatar');
  const dropName = document.getElementById('dropdown-user-name');
  const leftAvatar = document.getElementById('current-user-avatar-pill');
  const leftName = document.getElementById('current-user-name-label');
  const leftRole = document.getElementById('current-user-role-label');

  if (dropAvatar) dropAvatar.innerText = user.avatar || user.name[0];
  if (dropName) dropName.innerText = user.name;
  if (leftAvatar) leftAvatar.innerText = user.avatar || user.name[0];
  if (leftName) leftName.innerText = user.name;
  if (leftRole) leftRole.innerText = user.role || 'Member';
}

function toggleUserDropdown() {
  const menu = document.getElementById('user-switcher-menu');
  if (menu) menu.classList.toggle('hidden');
}

// -------------------------------------------------------------
// 5. CONVERSATION SIDEBAR LIST
// -------------------------------------------------------------
function renderConversationsList() {
  const container = document.getElementById('conversations-list-container');
  if (!container) return;

  container.innerHTML = window.allConversations.map(conv => {
    const isActive = conv.id === window.activeConversationId;
    let subtitle = conv.id === 'conv_alpha' ? '✨ 2 actions pending' : 'Active thread';
    let time = conv.id === 'conv_alpha' ? '12:42' : 'Yesterday';

    return `
      <button onclick="selectConversation('${conv.id}')" class="flex items-center gap-3 p-2.5 rounded-xl ${isActive ? 'bg-surface-container border border-primary/20 text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent'} transition-all text-left w-full group">
        <div class="relative flex-shrink-0 w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs text-primary">
          ${conv.name.substring(0, 2).toUpperCase()}
          <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full ${isActive ? 'bg-secondary ring-1 ring-surface' : 'bg-surface-bright'}"></span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold truncate ${isActive ? 'text-primary' : 'text-on-surface'}">${conv.name}</span>
            <span class="text-[10px] text-outline">${time}</span>
          </div>
          <p class="text-[11px] ${isActive ? 'text-secondary font-medium' : 'text-outline'} truncate">${subtitle}</p>
        </div>
      </button>
    `;
  }).join('');
}

function selectConversation(convId) {
  window.activeConversationId = convId;
  const conv = window.allConversations.find(c => c.id === convId);
  if (conv) {
    document.getElementById('active-chat-title').innerText = conv.name;
    document.getElementById('active-chat-avatar').innerText = conv.name.substring(0, 2).toUpperCase();
    document.getElementById('active-chat-badge').innerText = conv.badge || 'Thread';
  }
  renderConversationsList();
  loadMessages(convId);
}

// -------------------------------------------------------------
// 6. MESSAGE COMPOSER & ACTIONS
// -------------------------------------------------------------
async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Intercept Slash Commands
  if (text.startsWith('/magic')) {
    input.value = '';
    const query = text.replace('/magic', '').trim();
    openMagicModal({ content: query });
    return;
  }
  if (text.startsWith('/fuse')) {
    input.value = '';
    const query = text.replace('/fuse', '').trim();
    openFuseModal({ content: query });
    return;
  }
  if (text.startsWith('/whisper')) {
    input.value = '';
    const query = text.replace('/whisper', '').trim();
    openWhisperModal({ content: query });
    return;
  }

  // Clear input right away
  input.value = '';

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: window.activeConversationId,
        senderId: window.currentUserId,
        content: text
      })
    });

    const data = await res.json();
    if (data.success) {
      loadMessages(window.activeConversationId);
    }
  } catch (err) {
    showToast('Failed to send message', 'error');
  }
}

function quickInsertTrigger(prefix) {
  const input = document.getElementById('chat-input');
  input.value = prefix;
  input.focus();
}

// -------------------------------------------------------------
// 7. SETUP EVENT LISTENERS & ACCESSORIES
// -------------------------------------------------------------
function setupEventListeners() {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobile-sidebar-toggle-btn');
  const mobileClose = document.getElementById('close-mobile-sidebar-btn');
  const sidebar = document.getElementById('left-sidebar');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }
  if (mobileClose && sidebar) {
    mobileClose.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
    });
  }

  // Conversation Search Filtering
  const searchInput = document.getElementById('conversation-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const container = document.getElementById('conversations-list-container');
      if (!container) return;
      if (!q) {
        renderConversationsList();
        return;
      }
      const filtered = window.allConversations.filter(c => c.name.toLowerCase().includes(q));
      container.innerHTML = filtered.map(c => `
        <button onclick="selectConversation('${c.id}')" class="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-left w-full">
          <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold text-xs flex items-center justify-center">
            ${c.name.substring(0, 2).toUpperCase()}
          </div>
          <span class="text-xs font-semibold text-on-surface truncate">${c.name}</span>
        </button>
      `).join('');
    });
  }
}

// Right Actions Panel Toggle (Mobile/Tablet)
function toggleRightActionsPanel() {
  const panel = document.getElementById('right-actions-panel');
  if (panel) {
    panel.classList.toggle('translate-x-full');
  }
}

// Activity Drawer
async function openActivityDrawer() {
  const drawer = document.getElementById('activity-drawer');
  if (drawer) drawer.classList.remove('translate-x-full');

  const container = document.getElementById('activity-feed-container');
  if (container) {
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      if (data.success && data.activity.length > 0) {
        container.innerHTML = data.activity.map(a => `
          <div class="p-3 rounded-2xl bg-surface-container border border-white/5 flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-primary truncate">${a.title}</span>
              <span class="text-[10px] text-outline">${formatTime(a.created_at)}</span>
            </div>
            <p class="text-[11px] text-on-surface-variant">${a.detail || ''}</p>
          </div>
        `).join('');
      } else {
        container.innerHTML = `<p class="text-xs text-outline italic">No activity logs recorded.</p>`;
      }
    } catch (e) {
      console.warn('Activity fetch error:', e);
    }
  }
}

function closeActivityDrawer() {
  const drawer = document.getElementById('activity-drawer');
  if (drawer) drawer.classList.add('translate-x-full');
}

// DB Modal
function openDbModal() {
  openModal('db-modal');
}

async function submitConnectDb() {
  const input = document.getElementById('modal-db-url-input');
  const feedback = document.getElementById('modal-db-feedback');
  const url = input.value.trim();

  if (!url) {
    feedback.className = 'p-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs block';
    feedback.innerText = 'Please enter an Aiven PostgreSQL connection URL';
    return;
  }

  feedback.className = 'p-2.5 rounded-xl bg-primary-container/20 text-primary text-xs block animate-pulse';
  feedback.innerText = 'Connecting to Aiven PostgreSQL and migrating schema...';

  try {
    const res = await fetch('/api/db/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionUrl: url })
    });
    const data = await res.json();
    if (data.success) {
      feedback.className = 'p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs block';
      feedback.innerText = '⚡ Successfully connected to Aiven PostgreSQL! Schema synchronized.';
      fetchDbStatus();
      loadMessages(window.activeConversationId);
      refreshActionsPanel();
      setTimeout(() => closeModal('db-modal'), 2000);
    } else {
      feedback.className = 'p-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs block';
      feedback.innerText = `Connection failed: ${data.result?.error || 'Unknown error'}`;
    }
  } catch (err) {
    feedback.className = 'p-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs block';
    feedback.innerText = 'Network error testing database connection';
  }
}

// Helpers
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
  return strTime;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toggleEmojiPicker() {
  const emojis = ['👍', '✨', '🔥', '🔒', '🚀', '🎉', '💡', '✅'];
  const input = document.getElementById('chat-input');
  const chosen = emojis[Math.floor(Math.random() * emojis.length)];
  input.value += (input.value ? ' ' : '') + chosen;
  input.focus();
}

function triggerFileUpload() {
  showToast('File upload simulator: Attached sprint_spec_v2.pdf', 'info');
}

function triggerVoiceNote() {
  showToast('Voice note recorded: 4s audio vector attached', 'info');
}

function triggerSimulatedCall() {
  showToast('Huddle started: Project Alpha voice room initialized', 'info');
}

function openNewChatModal() {
  showToast('Direct chat launcher: Select any member from switcher', 'info');
}

function openProfileModal() {
  showToast(`Profile: ${getCurrentUser()?.name || 'Guhan'} (Status: Online)`, 'info');
}

function focusSearchMessages() {
  const input = document.getElementById('conversation-search-input');
  if (input) input.focus();
}

function setActiveNav(tab) {
  ['chats', 'communities', 'actions-hub'].forEach(t => {
    const el = document.getElementById(`nav-${t}`);
    if (el) {
      if (t === tab) {
        el.className = 'flex items-center justify-between px-3 py-2 rounded-xl bg-primary-container/20 text-primary font-semibold text-xs transition-all w-full text-left';
      } else {
        el.className = 'flex items-center gap-2.5 px-3 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-xs font-medium transition-all w-full text-left';
      }
    }
  });

  if (tab === 'actions-hub') {
    toggleRightActionsPanel();
  }
}
