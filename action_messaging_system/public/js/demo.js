// CHATTi Hackathon Demo Flow: Automated and Step-by-Step Scenario Runner

function openDemoWalkthroughModal() {
  openModal('demo-modal');
}

// STEP 1: Guhan sends task directive -> Magic -> Task Created
async function runStep1() {
  closeModal('demo-modal');
  showToast('▶ Running Demo Step 1: Magic → Task Creation...', 'magic');

  // Ensure active user is Guhan and conversation is Project Alpha
  window.currentUserId = 'user_guhan';
  window.activeConversationId = 'conv_alpha';
  updateCurrentUserUI();

  // 1. Post Guhan's message
  const msgContent = 'Rahul, send the PPT before 6 PM.';
  const resMsg = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conv_alpha',
      senderId: 'user_guhan',
      content: msgContent
    })
  });
  const dataMsg = await resMsg.json();

  if (dataMsg.success) {
    // 2. Automatically trigger Magic -> Create Task
    setTimeout(async () => {
      const resTask = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: dataMsg.message.id,
          assignedTo: 'user_rahul',
          title: 'Finish the PPT',
          description: 'Presentation deck for final evaluation sync and team alignment.',
          deadline: 'Today, 6:00 PM',
          conversationId: 'conv_alpha'
        })
      });
      const dataTask = await resTask.json();
      if (dataTask.success) {
        showToast('✨ Step 1 Complete: Task Created for Rahul!', 'magic');
        await loadMessages('conv_alpha');
        await refreshActionsPanel();
        scrollToBottom();
      }
    }, 900);
  }
}

// STEP 2: Guhan sends stealth Whisper to Rahul
async function runStep2() {
  closeModal('demo-modal');
  showToast('▶ Running Demo Step 2: 🔒 In-Thread Stealth Whisper...', 'whisper');

  window.currentUserId = 'user_guhan';
  window.activeConversationId = 'conv_alpha';
  updateCurrentUserUI();

  const whisperContent = 'Rahul, come 15 minutes early.';
  const res = await fetch('/api/whisper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conv_alpha',
      senderId: 'user_guhan',
      recipientId: 'user_rahul',
      content: whisperContent
    })
  });

  const data = await res.json();
  if (data.success) {
    showToast('🔒 Step 2 Complete: Whisper sent to Rahul!', 'whisper');
    await loadMessages('conv_alpha');
    await refreshActionsPanel();
    scrollToBottom();

    // Show educational prompt for the presenter
    setTimeout(() => {
      showToast('💡 Try switching to Rahul in the top switcher to see the private whisper decrypted!', 'info');
    }, 2500);
  }
}

// STEP 3: Guhan starts 10-second Fuse -> Rahul & Ananya vote -> 10s Consensus -> Decision Locked
async function runStep3() {
  closeModal('demo-modal');
  showToast('▶ Running Demo Step 3: 🔥 Live 10s Fuse Consensus...', 'fuse');

  window.currentUserId = 'user_guhan';
  window.activeConversationId = 'conv_alpha';
  updateCurrentUserUI();

  // 1. Initialize 10s Fuse
  const res = await fetch('/api/fuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conv_alpha',
      senderId: 'user_guhan',
      question: 'Should we submit today?',
      optionA: '👍 Submit Today',
      optionB: '👎 Tomorrow',
      durationSeconds: 10
    })
  });

  const data = await res.json();
  if (!data.success) {
    showToast('Failed to start demo fuse', 'error');
    return;
  }

  const fuseId = data.fuse.id;
  await loadMessages('conv_alpha');
  await refreshActionsPanel();
  scrollToBottom();

  // 2. Simulated Live Vote 1: Rahul votes 👍 at t = 2s
  setTimeout(async () => {
    showToast('Rahul voted: 👍 Submit Today', 'fuse');
    await fetch(`/api/fuses/${fuseId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_rahul', vote: 'option_a' })
    });
  }, 2200);

  // 3. Simulated Live Vote 2: Ananya votes 👍 at t = 4s
  setTimeout(async () => {
    showToast('Ananya voted: 👍 Submit Today', 'fuse');
    await fetch(`/api/fuses/${fuseId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_ananya', vote: 'option_a' })
    });
  }, 4400);

  // 4. Simulated Live Vote 3: Priya votes 👍 at t = 6s
  setTimeout(async () => {
    await fetch(`/api/fuses/${fuseId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_priya', vote: 'option_a' })
    });
  }, 6600);
}

// FULL AUTOMATED 60s HACKATHON DEMO WALKTHROUGH
async function runFullAutoDemo() {
  closeModal('demo-modal');
  showToast('🚀 Launching Full 60s Hackathon Live Walkthrough...', 'magic');

  // Step 1
  await runStep1();

  // Step 2 after 3.5s
  setTimeout(async () => {
    await runStep2();
  }, 3800);

  // Step 3 after 8s
  setTimeout(async () => {
    await runStep3();
  }, 8200);
}

function scrollToBottom() {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}
