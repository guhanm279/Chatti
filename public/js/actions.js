// CHATTi Action Primitives: Magic, Whisper, Fuse, and Actions Dock

let activeFuseTimers = {}; // { [fuseId]: intervalId }
let pendingActionMessage = null;
let currentFuseDuration = 10;

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
  pendingActionMessage = null;
}

// -------------------------------------------------------------
// 1. ✨ MAGIC ACTIONS & TASK CREATION
// -------------------------------------------------------------
function openMagicModal(contextMsg = null) {
  pendingActionMessage = contextMsg;
  const titleInput = document.getElementById('magic-task-title-input');
  const assigneeSelect = document.getElementById('magic-task-assignee-select');

  if (contextMsg && contextMsg.content) {
    let cleanText = contextMsg.content.replace(/^Rahul,\s*/i, '').replace(/^Ananya,\s*/i, '').trim();
    if (cleanText.toLowerCase().includes('ppt')) {
      titleInput.value = 'Finish the PPT';
    } else {
      titleInput.value = cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText;
    }

    // Auto-detect assignee if mentioned in text
    if (contextMsg.content.toLowerCase().includes('rahul')) {
      assigneeSelect.value = 'user_rahul';
    } else if (contextMsg.content.toLowerCase().includes('ananya')) {
      assigneeSelect.value = 'user_ananya';
    } else if (contextMsg.content.toLowerCase().includes('guhan')) {
      assigneeSelect.value = 'user_guhan';
    }
  } else {
    titleInput.value = 'Review evaluation sprint goals';
  }

  openModal('magic-modal');
}

function selectMagicTab(tab) {
  const taskTab = document.getElementById('magic-tab-task');
  const pollTab = document.getElementById('magic-tab-poll');
  const taskForm = document.getElementById('magic-task-form');

  if (tab === 'task') {
    taskTab.className = 'flex items-center gap-2 p-2.5 rounded-xl bg-primary-container/20 border border-primary/40 text-primary text-xs font-semibold';
    pollTab.className = 'flex items-center gap-2 p-2.5 rounded-xl bg-surface-container border border-white/5 text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high';
    taskForm.classList.remove('hidden');
  } else {
    // Switch to Poll trigger
    closeModal('magic-modal');
    openFuseModal(pendingActionMessage);
  }
}

async function submitMagicTask() {
  const title = document.getElementById('magic-task-title-input').value.trim();
  const assignedTo = document.getElementById('magic-task-assignee-select').value;
  const deadline = document.getElementById('magic-task-deadline-input').value.trim() || 'Today, 6:00 PM';

  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }

  try {
    const payload = {
      messageId: pendingActionMessage ? pendingActionMessage.id : null,
      assignedTo,
      title,
      description: 'Extracted via CHATTi Magic Engine',
      deadline,
      conversationId: window.activeConversationId || 'conv_alpha'
    };

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeModal('magic-modal');
      showToast(`✨ Task Created: "${title}"`, 'magic');
      refreshActionsPanel();
      window.loadMessages(window.activeConversationId);
    } else {
      showToast(data.error || 'Failed to create task', 'error');
    }
  } catch (err) {
    showToast('Network error creating task', 'error');
  }
}

async function toggleTaskComplete(taskId, currentStatus) {
  try {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(newStatus === 'completed' ? '✓ Task marked completed!' : 'Task set to pending', 'success');
      refreshActionsPanel();
      window.loadMessages(window.activeConversationId);
    }
  } catch (err) {
    showToast('Error updating task status', 'error');
  }
}

// -------------------------------------------------------------
// 2. 🔒 WHISPER (IN-THREAD STEALTH PRIVATE MESSAGE)
// -------------------------------------------------------------
function openWhisperModal(contextMsg = null) {
  pendingActionMessage = contextMsg;
  const container = document.getElementById('whisper-recipients-list');
  const contentInput = document.getElementById('whisper-content-input');

  if (contextMsg && contextMsg.content) {
    contentInput.value = contextMsg.content;
  } else {
    contentInput.value = 'Rahul, come 15 minutes early.';
  }

  // Populate recipients (exclude current user)
  const currentUserId = window.currentUserId || 'user_guhan';
  const users = window.allUsers || [
    { id: 'user_rahul', name: 'Rahul', role: 'Tech Lead' },
    { id: 'user_ananya', name: 'Ananya', role: 'Design Lead' },
    { id: 'user_guhan', name: 'Guhan', role: 'Product Lead' },
    { id: 'user_priya', name: 'Priya', role: 'Frontend Dev' },
    { id: 'user_arjun', name: 'Arjun', role: 'Backend Dev' }
  ];

  const available = users.filter(u => u.id !== currentUserId);

  container.innerHTML = available.map((u, idx) => `
    <label class="flex items-center gap-2 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/5 cursor-pointer transition-all">
      <input type="radio" name="whisper-recipient-radio" value="${u.id}" ${idx === 0 ? 'checked' : ''} class="accent-amber-500">
      <div class="flex items-center gap-1.5 min-w-0">
        <div class="w-5 h-5 rounded-full bg-tertiary-container/40 text-tertiary text-[10px] font-bold flex items-center justify-center">
          ${u.avatar || u.name[0]}
        </div>
        <div class="truncate">
          <span class="text-xs font-semibold text-on-surface block truncate">${u.name}</span>
          <span class="text-[9px] text-outline block truncate">${u.role || 'Member'}</span>
        </div>
      </div>
    </label>
  `).join('');

  openModal('whisper-modal');
}

async function submitWhisper() {
  const content = document.getElementById('whisper-content-input').value.trim();
  const selectedRadio = document.querySelector('input[name="whisper-recipient-radio"]:checked');

  if (!content) {
    showToast('Please type whisper content', 'error');
    return;
  }
  if (!selectedRadio) {
    showToast('Please select a recipient', 'error');
    return;
  }

  const recipientId = selectedRadio.value;
  const currentUserId = window.currentUserId || 'user_guhan';
  const conversationId = window.activeConversationId || 'conv_alpha';

  try {
    const res = await fetch('/api/whisper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        senderId: currentUserId,
        recipientId,
        content
      })
    });

    const data = await res.json();
    if (data.success) {
      closeModal('whisper-modal');
      showToast('🔒 Stealth Whisper sent into thread', 'whisper');
      refreshActionsPanel();
      window.loadMessages(conversationId);
    } else {
      showToast(data.error || 'Failed to send whisper', 'error');
    }
  } catch (err) {
    showToast('Network error sending whisper', 'error');
  }
}

// -------------------------------------------------------------
// 3. 🔥 FUSE (TIMED DECISION & LIVE VOTES)
// -------------------------------------------------------------
function setFuseDuration(sec) {
  currentFuseDuration = sec;
  [10, 15, 30].forEach(s => {
    const btn = document.getElementById(`fuse-dur-${s}`);
    if (btn) {
      if (s === sec) {
        btn.className = 'flex-1 py-1.5 rounded-xl bg-secondary-container/20 border border-secondary text-secondary text-xs font-bold';
      } else {
        btn.className = 'flex-1 py-1.5 rounded-xl bg-surface-container border border-white/5 text-outline text-xs font-semibold hover:text-white';
      }
    }
  });
}

function openFuseModal(contextMsg = null) {
  pendingActionMessage = contextMsg;
  const questionInput = document.getElementById('fuse-question-input');
  if (contextMsg && contextMsg.content) {
    questionInput.value = contextMsg.content;
  } else {
    questionInput.value = 'Should we submit the project today?';
  }
  setFuseDuration(10);
  openModal('fuse-modal');
}

async function submitFuse() {
  const question = document.getElementById('fuse-question-input').value.trim();
  const optionA = document.getElementById('fuse-option-a-input').value.trim() || '👍 Submit Today';
  const optionB = document.getElementById('fuse-option-b-input').value.trim() || '👎 Tomorrow';

  if (!question) {
    showToast('Please enter a question', 'error');
    return;
  }

  try {
    const payload = {
      conversationId: window.activeConversationId || 'conv_alpha',
      senderId: window.currentUserId || 'user_guhan',
      question,
      optionA,
      optionB,
      durationSeconds: currentFuseDuration
    };

    const res = await fetch('/api/fuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeModal('fuse-modal');
      showToast(`🔥 Message Fuse Started: 10s Rapid Consensus!`, 'fuse');
      refreshActionsPanel();
      window.loadMessages(window.activeConversationId);
    } else {
      showToast(data.error || 'Failed to start fuse', 'error');
    }
  } catch (err) {
    showToast('Network error starting fuse', 'error');
  }
}

async function castFuseVote(fuseId, voteChoice) {
  try {
    const res = await fetch(`/api/fuses/${fuseId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: window.currentUserId || 'user_guhan',
        vote: voteChoice
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('✓ Vote cast!', 'fuse');
      updateFuseDom(data.fuse);
    } else {
      showToast(data.error || 'Could not cast vote', 'error');
    }
  } catch (err) {
    showToast('Network error voting', 'error');
  }
}

// Client-side Countdown Driver
function setupFuseCountdown(fuse) {
  if (!fuse || fuse.status === 'locked') return;

  if (activeFuseTimers[fuse.id]) {
    clearInterval(activeFuseTimers[fuse.id]);
  }

  activeFuseTimers[fuse.id] = setInterval(() => {
    const timerElem = document.getElementById(`fuse-timer-${fuse.id}`);
    if (!timerElem) {
      clearInterval(activeFuseTimers[fuse.id]);
      delete activeFuseTimers[fuse.id];
      return;
    }

    const currentSec = parseInt(timerElem.getAttribute('data-seconds') || '0', 10);
    if (currentSec <= 1) {
      clearInterval(activeFuseTimers[fuse.id]);
      delete activeFuseTimers[fuse.id];
      timerElem.innerHTML = `<span class="material-symbols-outlined text-[14px]">lock</span> 00s remaining`;
      // Trigger Lock on server
      fetch(`/api/fuses/${fuse.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: fuse.votes_a >= fuse.votes_b ? fuse.option_a : fuse.option_b })
      }).then(r => r.json()).then(data => {
        if (data.success) {
          showToast('🔥 DECISION LOCKED: Outcome Recorded!', 'fuse');
          window.loadMessages(window.activeConversationId);
          refreshActionsPanel();
        }
      });
    } else {
      const nextSec = currentSec - 1;
      timerElem.setAttribute('data-seconds', nextSec);
      const formatted = nextSec < 10 ? `0${nextSec}` : nextSec;
      timerElem.innerHTML = `<span class="material-symbols-outlined text-[14px]">hourglass_bottom</span> ${formatted}s remaining`;
      if (nextSec <= 3) {
        timerElem.className = 'flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/30 text-rose-300 text-xs font-bold animate-pulse';
      }
    }
  }, 1000);
}

function updateFuseDom(fuse) {
  if (!fuse) return;
  const container = document.getElementById(`fuse-card-${fuse.id}`);
  if (!container) return;

  // Update percentages and counts
  const percentElemA = document.getElementById(`fuse-pct-a-${fuse.id}`);
  const barElemA = document.getElementById(`fuse-bar-a-${fuse.id}`);
  const percentElemB = document.getElementById(`fuse-pct-b-${fuse.id}`);
  const barElemB = document.getElementById(`fuse-bar-b-${fuse.id}`);

  if (percentElemA) percentElemA.innerText = `${fuse.votes_a} votes • ${fuse.percent_a}%`;
  if (barElemA) barElemA.style.width = `${fuse.percent_a}%`;
  if (percentElemB) percentElemB.innerText = `${fuse.votes_b} votes • ${fuse.percent_b}%`;
  if (barElemB) barElemB.style.width = `${fuse.percent_b}%`;
}

// -------------------------------------------------------------
// 4. RIGHT ACTIONS PANEL SYNC
// -------------------------------------------------------------
async function refreshActionsPanel() {
  try {
    const res = await fetch('/api/actions');
    const data = await res.json();
    if (!data.success) return;

    const summary = data.summary;

    // Update Counter
    const counter = document.getElementById('tasks-open-counter');
    if (counter) counter.innerText = `${summary.openTasksCount} open`;

    // Render Tasks
    const tasksContainer = document.getElementById('side-tasks-list');
    if (tasksContainer) {
      if (summary.tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-xs text-outline italic">No tasks created yet.</p>`;
      } else {
        tasksContainer.innerHTML = summary.tasks.map(t => `
          <div class="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1.5 border border-white/5">
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-semibold text-on-surface ${t.status === 'completed' ? 'line-through text-outline' : ''}">${t.title}</span>
              <button onclick="toggleTaskComplete('${t.id}', '${t.status}')" class="text-outline hover:text-secondary">
                <span class="material-symbols-outlined text-[17px] ${t.status === 'completed' ? 'text-secondary' : 'text-outline'}">
                  ${t.status === 'completed' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </button>
            </div>
            <div class="flex items-center justify-between text-[11px] text-outline">
              <span class="flex items-center gap-1">
                <span class="w-3.5 h-3.5 rounded-full bg-primary-container text-on-primary-container text-[8px] font-bold flex items-center justify-center">
                  ${t.assignee_avatar || 'U'}
                </span>
                ${t.assignee_name || 'Member'}
              </span>
              <span>${t.deadline || 'Today'}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Decisions
    const decisionsContainer = document.getElementById('side-decisions-list');
    if (decisionsContainer) {
      if (summary.decisions.length === 0 && (!summary.activeFuses || summary.activeFuses.length === 0)) {
        decisionsContainer.innerHTML = `<p class="text-xs text-outline italic">No decisions recorded yet.</p>`;
      } else {
        const items = [...(summary.activeFuses || []), ...summary.decisions];
        decisionsContainer.innerHTML = items.slice(0, 4).map(d => `
          <div class="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1 border border-white/5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-on-surface truncate">${d.question || d.outcome}</span>
              <span class="material-symbols-outlined text-[16px] ${d.status === 'locked' ? 'text-secondary' : 'text-amber-400 animate-pulse'}">
                ${d.status === 'locked' ? 'verified' : 'hourglass_top'}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] ${d.status === 'locked' ? 'text-tertiary' : 'text-secondary'}">
              <span>${d.status === 'locked' ? `Consensus: ${d.outcome}` : 'Voting Live ⏳'}</span>
              <span class="text-outline">${d.total_votes || 0} votes</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Metrics
    const stTasks = document.getElementById('stat-tasks');
    const stFuses = document.getElementById('stat-fuses');
    const stWhispers = document.getElementById('stat-whispers');
    if (stTasks) stTasks.innerText = summary.tasks.length;
    if (stFuses) stFuses.innerText = summary.decisions.length + (summary.activeFuses ? summary.activeFuses.length : 0);
    if (stWhispers) stWhispers.innerText = '2';

  } catch (e) {
    console.warn('Could not refresh actions panel:', e);
  }
}

// Toast Feedback Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let borderColor = 'border-white/10';
  let badgeIcon = 'info';

  if (type === 'magic') {
    borderColor = 'border-primary/50 shadow-primary/20';
    badgeIcon = 'auto_awesome';
  } else if (type === 'whisper') {
    borderColor = 'border-tertiary/50 shadow-tertiary/20';
    badgeIcon = 'lock';
  } else if (type === 'fuse') {
    borderColor = 'border-secondary/50 shadow-secondary/20';
    badgeIcon = 'local_fire_department';
  } else if (type === 'success') {
    borderColor = 'border-emerald-500/50';
    badgeIcon = 'check_circle';
  }

  toast.className = `p-3 px-4 rounded-2xl glass-floating border ${borderColor} shadow-2xl flex items-center gap-2.5 text-xs text-on-surface animate-pop pointer-events-auto`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[17px] text-primary">${badgeIcon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
