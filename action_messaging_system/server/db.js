const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const { Pool } = require('pg');

let redisClient = null;
let pgPool = null;
let dbMode = 'none'; // 'aiven_valkey', 'aiven_postgres', or 'local'
let isConnected = false;
let connectionError = null;

// Initial schema seed values
const defaultUsers = [
  { id: 'user_guhan', name: 'Guhan', avatar: 'G', role: 'Product Lead', status: 'online', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'user_rahul', name: 'Rahul', avatar: 'R', role: 'Tech Lead', status: 'online', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'user_ananya', name: 'Ananya', avatar: 'A', role: 'Design Lead', status: 'online', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'user_priya', name: 'Priya', avatar: 'P', role: 'Frontend Dev', status: 'offline', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'user_arjun', name: 'Arjun', avatar: 'AR', role: 'Backend Dev', status: 'offline', created_at: new Date('2026-10-01T09:00:00Z').toISOString() }
];

const defaultConversations = [
  { id: 'conv_alpha', name: 'Project Alpha', type: 'group', badge: 'Sprint 4', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'conv_rahul', name: 'Rahul', type: 'direct', badge: 'Direct', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'conv_ananya', name: 'Ananya', type: 'direct', badge: 'Direct', created_at: new Date('2026-10-01T09:00:00Z').toISOString() },
  { id: 'conv_nexus', name: 'Team Nexus', type: 'community', badge: 'Engineering', created_at: new Date('2026-10-01T09:00:00Z').toISOString() }
];

const defaultInitialMessages = [
  {
    id: 'msg_init_1',
    conversation_id: 'conv_alpha',
    sender_id: 'user_guhan',
    content: 'Should we submit the project today?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'msg_init_2',
    conversation_id: 'conv_alpha',
    sender_id: 'user_rahul',
    content: 'I think we should submit today 👍',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 2.8).toISOString()
  },
  {
    id: 'msg_init_3',
    conversation_id: 'conv_alpha',
    sender_id: 'user_ananya',
    content: "I'll finish the PPT before 6.",
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString()
  },
  {
    id: 'msg_init_4',
    conversation_id: 'conv_alpha',
    sender_id: 'user_guhan',
    content: 'Rahul, can you send the database details?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 2.2).toISOString()
  }
];

// Initialize Database connection to Aiven
async function initDb(overrideUrl = null) {
  const url = overrideUrl || process.env.AIVEN_SERVICE_URL || process.env.DATABASE_URL;

  if (!url || url.trim() === '') {
    console.warn('⚠️ No Aiven database URL found in environment.');
    dbMode = 'local';
    isConnected = false;
    return { connected: false, mode: 'local', message: 'No connection URL configured' };
  }

  // 1. Aiven Valkey / Redis connection
  if (url.startsWith('rediss://') || url.startsWith('redis://')) {
    try {
      console.log('⏳ Connecting to Aiven Valkey Cloud Database...');
      const client = new Redis(url, {
        tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 8000,
        maxRetriesPerRequest: 3
      });

      await client.ping();
      redisClient = client;
      isConnected = true;
      dbMode = 'aiven_valkey';
      connectionError = null;
      console.log('⚡ Successfully connected to Aiven Valkey Cloud Database!');

      // Seed Users if not present
      const usersExist = await redisClient.exists('chatti:users');
      if (!usersExist) {
        console.log('🌱 Seeding initial users into Aiven...');
        await redisClient.set('chatti:users', JSON.stringify(defaultUsers));
      }

      // Seed Conversations if not present
      const convsExist = await redisClient.exists('chatti:conversations');
      if (!convsExist) {
        console.log('🌱 Seeding initial conversations into Aiven...');
        await redisClient.set('chatti:conversations', JSON.stringify(defaultConversations));
      }

      // Seed default Project Alpha messages if not present
      const msgListKey = 'chatti:conv:conv_alpha:messages';
      const msgCount = await redisClient.llen(msgListKey);
      if (msgCount === 0) {
        console.log('🌱 Seeding initial messages into Aiven for Project Alpha...');
        for (const msg of defaultInitialMessages) {
          await redisClient.rpush(msgListKey, JSON.stringify(msg));
          await redisClient.set(`chatti:msg:${msg.id}`, JSON.stringify(msg));
        }
      }

      return { connected: true, mode: 'aiven_valkey', message: 'Connected to Aiven Cloud Database' };
    } catch (err) {
      console.error('❌ Failed to connect to Aiven Valkey:', err.message);
      connectionError = err.message;
      isConnected = false;
      return { connected: false, error: err.message };
    }
  }

  // 2. Aiven PostgreSQL connection
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    try {
      console.log('⏳ Connecting to Aiven PostgreSQL...');
      const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
      });
      const client = await pool.connect();
      console.log('⚡ Successfully connected to Aiven PostgreSQL!');
      client.release();
      pgPool = pool;
      isConnected = true;
      dbMode = 'aiven_postgres';
      connectionError = null;

      // Create minimal tables
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          avatar VARCHAR(256),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(64) PRIMARY KEY,
          conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          message_type VARCHAR(32) DEFAULT 'text',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(64) PRIMARY KEY,
          message_id VARCHAR(64),
          assigned_to VARCHAR(64),
          title VARCHAR(256) NOT NULL,
          description TEXT,
          deadline VARCHAR(128),
          status VARCHAR(32) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS fuses (
          id VARCHAR(64) PRIMARY KEY,
          message_id VARCHAR(64),
          question TEXT NOT NULL,
          option_a VARCHAR(128),
          option_b VARCHAR(128),
          duration_seconds INT DEFAULT 10,
          expires_at TIMESTAMPTZ NOT NULL,
          status VARCHAR(32) DEFAULT 'active',
          outcome VARCHAR(128),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS votes (
          id VARCHAR(64) PRIMARY KEY,
          fuse_id VARCHAR(64),
          user_id VARCHAR(64),
          vote VARCHAR(64),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(fuse_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS whispers (
          id VARCHAR(64) PRIMARY KEY,
          message_id VARCHAR(64),
          sender_id VARCHAR(64),
          recipient_id VARCHAR(64),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return { connected: true, mode: 'aiven_postgres', message: 'Connected to Aiven PostgreSQL' };
    } catch (err) {
      console.error('❌ Failed to connect to Aiven PostgreSQL:', err.message);
      connectionError = err.message;
      isConnected = false;
      return { connected: false, error: err.message };
    }
  }

  return { connected: false, error: 'Unsupported database URL format' };
}

// Get DB Status
function getDbStatus() {
  return {
    connected: isConnected,
    mode: dbMode,
    storageType: isConnected ? 'Aiven Cloud Database (Persistent) ⚡' : 'Disconnected',
    error: connectionError
  };
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
async function getUsers() {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const raw = await redisClient.get('chatti:users');
    return raw ? JSON.parse(raw) : defaultUsers;
  }
  if (dbMode === 'aiven_postgres' && pgPool) {
    const res = await pgPool.query('SELECT * FROM users ORDER BY name ASC');
    return res.rows;
  }
  return defaultUsers;
}

async function getUser(id) {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

// -------------------------------------------------------------
// CONVERSATION OPERATIONS
// -------------------------------------------------------------
async function getConversations() {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const raw = await redisClient.get('chatti:conversations');
    return raw ? JSON.parse(raw) : defaultConversations;
  }
  if (dbMode === 'aiven_postgres' && pgPool) {
    const res = await pgPool.query('SELECT * FROM conversations ORDER BY created_at ASC');
    return res.rows;
  }
  return defaultConversations;
}

async function getConversation(id) {
  const convs = await getConversations();
  return convs.find(c => c.id === id) || null;
}

// -------------------------------------------------------------
// MESSAGE OPERATIONS (WITH WHISPER REDACTION & MAGIC/FUSE ATTACHMENTS)
// -------------------------------------------------------------
async function getMessages(conversationId, currentUserId = 'user_guhan') {
  const users = await getUsers();
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  let rawMessages = [];

  if (dbMode === 'aiven_valkey' && redisClient) {
    const msgListKey = `chatti:conv:${conversationId}:messages`;
    const list = await redisClient.lrange(msgListKey, 0, -1);
    rawMessages = list.map(item => JSON.parse(item));
  } else if (dbMode === 'aiven_postgres' && pgPool) {
    const res = await pgPool.query(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    rawMessages = res.rows;
  } else {
    rawMessages = defaultInitialMessages.filter(m => m.conversation_id === conversationId);
  }

  // Augment each message with attached Task, Fuse, or Whisper
  const enhanced = await Promise.all(
    rawMessages.map(async msg => {
      const sender = userMap[msg.sender_id] || {};
      let task = null;
      let fuse = null;
      let whisper = null;

      if (dbMode === 'aiven_valkey' && redisClient) {
        // Check attached Task
        const taskId = await redisClient.get(`chatti:msg_task:${msg.id}`);
        if (taskId) {
          const rawTask = await redisClient.get(`chatti:task:${taskId}`);
          if (rawTask) {
            task = JSON.parse(rawTask);
            const assignee = userMap[task.assigned_to] || {};
            task.assignee_name = assignee.name || 'Member';
            task.assignee_avatar = assignee.avatar || '?';
          }
        }

        // Check attached Fuse
        const fuseId = await redisClient.get(`chatti:msg_fuse:${msg.id}`);
        if (fuseId) {
          fuse = await getFuse(fuseId);
        } else if (msg.message_type === 'fuse') {
          // If message itself is fuse
          const directFuse = await getFuseByMessageId(msg.id);
          if (directFuse) fuse = directFuse;
        }

        // Check Whisper
        if (msg.message_type === 'whisper') {
          const rawWhisper = await redisClient.get(`chatti:whisper:${msg.id}`);
          if (rawWhisper) {
            whisper = JSON.parse(rawWhisper);
            const sUser = userMap[whisper.sender_id] || {};
            const rUser = userMap[whisper.recipient_id] || {};
            whisper.sender_name = sUser.name || 'Member';
            whisper.recipient_name = rUser.name || 'Member';
          }
        }
      }

      // WHISPER PRIVACY PROTECTION
      if (msg.message_type === 'whisper' && whisper) {
        const isAuthorized = currentUserId && (currentUserId === whisper.sender_id || currentUserId === whisper.recipient_id);
        if (!isAuthorized) {
          return {
            ...msg,
            content: `🔒 ${whisper.sender_name} sent a private Whisper to ${whisper.recipient_name}`,
            is_redacted: true,
            whisper: {
              id: whisper.id,
              sender_id: whisper.sender_id,
              recipient_id: whisper.recipient_id,
              sender_name: whisper.sender_name,
              recipient_name: whisper.recipient_name,
              is_redacted: true
            },
            task: null,
            fuse: null,
            sender_name: sender.name || 'Member',
            sender_avatar: sender.avatar || '?',
            sender_role: sender.role || 'Member'
          };
        } else {
          return {
            ...msg,
            is_redacted: false,
            whisper: {
              ...whisper,
              is_redacted: false
            },
            task,
            fuse,
            sender_name: sender.name || 'Member',
            sender_avatar: sender.avatar || '?',
            sender_role: sender.role || 'Member'
          };
        }
      }

      return {
        ...msg,
        is_redacted: false,
        task,
        fuse,
        whisper,
        sender_name: sender.name || 'Member',
        sender_avatar: sender.avatar || '?',
        sender_role: sender.role || 'Member'
      };
    })
  );

  return enhanced;
}

async function addMessage({ conversationId, senderId, content, messageType = 'text', id = null }) {
  if (!conversationId || !senderId || !content || !content.trim()) {
    throw new Error('Missing required message parameters: conversationId, senderId, content');
  }

  const msgId = id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const createdAt = new Date().toISOString();

  const newMsg = {
    id: msgId,
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    message_type: messageType,
    created_at: createdAt
  };

  if (dbMode === 'aiven_valkey' && redisClient) {
    const msgListKey = `chatti:conv:${conversationId}:messages`;
    await redisClient.rpush(msgListKey, JSON.stringify(newMsg));
    await redisClient.set(`chatti:msg:${msgId}`, JSON.stringify(newMsg));
  } else if (dbMode === 'aiven_postgres' && pgPool) {
    await pgPool.query(
      'INSERT INTO messages (id, conversation_id, sender_id, content, message_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [newMsg.id, newMsg.conversation_id, newMsg.sender_id, newMsg.content, newMsg.message_type, newMsg.created_at]
    );
  }

  const sender = await getUser(senderId);
  return {
    ...newMsg,
    sender_name: sender ? sender.name : 'Member',
    sender_avatar: sender ? sender.avatar : '?',
    sender_role: sender ? sender.role : 'Member'
  };
}

// -------------------------------------------------------------
// 1. 🔒 WHISPER OPERATIONS
// -------------------------------------------------------------
async function addWhisper({ messageId, senderId, recipientId, content }) {
  const whisperId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const whisper = {
    id: whisperId,
    message_id: messageId,
    sender_id: senderId,
    recipient_id: recipientId,
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  if (dbMode === 'aiven_valkey' && redisClient) {
    await redisClient.set(`chatti:whisper:${messageId}`, JSON.stringify(whisper));
  } else if (dbMode === 'aiven_postgres' && pgPool) {
    await pgPool.query(
      'INSERT INTO whispers (id, message_id, sender_id, recipient_id, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [whisper.id, whisper.message_id, whisper.sender_id, whisper.recipient_id, whisper.content, whisper.created_at]
    );
  }

  const sender = await getUser(senderId);
  const recipient = await getUser(recipientId);

  await addActivity({
    userId: senderId,
    type: 'whisper',
    title: `${sender ? sender.name : 'Guhan'} sent a private Whisper to ${recipient ? recipient.name : 'Rahul'}`,
    detail: 'Stealth 1-on-1 tunnel inside thread'
  });

  return whisper;
}

// -------------------------------------------------------------
// 2. ✨ MAGIC -> TASK OPERATIONS
// -------------------------------------------------------------
async function createTask({ messageId, assignedTo, title, description = '', deadline = 'Today, 6:00 PM' }) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const task = {
    id: taskId,
    message_id: messageId || null,
    assigned_to: assignedTo,
    title: title.trim(),
    description,
    deadline,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (dbMode === 'aiven_valkey' && redisClient) {
    await redisClient.set(`chatti:task:${taskId}`, JSON.stringify(task));
    await redisClient.rpush('chatti:tasks', taskId);
    if (messageId) {
      await redisClient.set(`chatti:msg_task:${messageId}`, taskId);
    }
  } else if (dbMode === 'aiven_postgres' && pgPool) {
    await pgPool.query(
      'INSERT INTO tasks (id, message_id, assigned_to, title, description, deadline, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [task.id, task.message_id, task.assigned_to, task.title, task.description, task.deadline, task.status, task.created_at]
    );
  }

  const assignee = await getUser(assignedTo);
  const fullTask = {
    ...task,
    assignee_name: assignee ? assignee.name : 'Member',
    assignee_avatar: assignee ? assignee.avatar : '?'
  };

  await addActivity({
    userId: assignedTo,
    type: 'task',
    title: `Task Created: ${title}`,
    detail: `Assigned to ${assignee ? assignee.name : 'Team'} • Due ${deadline}`
  });

  return fullTask;
}

async function updateTaskStatus(taskId, status) {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const raw = await redisClient.get(`chatti:task:${taskId}`);
    if (raw) {
      const task = JSON.parse(raw);
      task.status = status;
      await redisClient.set(`chatti:task:${taskId}`, JSON.stringify(task));
      const assignee = await getUser(task.assigned_to);
      return {
        ...task,
        assignee_name: assignee ? assignee.name : 'Member',
        assignee_avatar: assignee ? assignee.avatar : '?'
      };
    }
    return null;
  }
  return null;
}

async function getTasks() {
  const users = await getUsers();
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  if (dbMode === 'aiven_valkey' && redisClient) {
    const taskIds = await redisClient.lrange('chatti:tasks', 0, -1);
    const tasks = [];
    for (const tid of taskIds) {
      const raw = await redisClient.get(`chatti:task:${tid}`);
      if (raw) {
        const t = JSON.parse(raw);
        const assignee = userMap[t.assigned_to] || {};
        tasks.push({
          ...t,
          assignee_name: assignee.name || 'Member',
          assignee_avatar: assignee.avatar || '?'
        });
      }
    }
    return tasks.reverse();
  }
  return [];
}

// -------------------------------------------------------------
// 3. 🔥 FUSE OPERATIONS (TIMED DECISIONS & LIVE VOTES)
// -------------------------------------------------------------
async function createFuse({ messageId, question, optionA = '👍 Submit Today', optionB = '👎 Tomorrow', durationSeconds = 10 }) {
  const fuseId = `fuse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  const fuse = {
    id: fuseId,
    message_id: messageId || null,
    question: question.trim(),
    option_a: optionA,
    option_b: optionB,
    duration_seconds: durationSeconds,
    expires_at: expiresAt,
    status: 'active',
    outcome: null,
    created_at: new Date().toISOString()
  };

  if (dbMode === 'aiven_valkey' && redisClient) {
    await redisClient.set(`chatti:fuse:${fuseId}`, JSON.stringify(fuse));
    await redisClient.rpush('chatti:fuses', fuseId);
    if (messageId) {
      await redisClient.set(`chatti:msg_fuse:${messageId}`, fuseId);
    }
  }

  await addActivity({
    userId: 'user_guhan',
    type: 'fuse',
    title: `🔥 Message Fuse Initialized: ${question}`,
    detail: `${durationSeconds}s Rapid Consensus Voting Window Open`
  });

  return await getFuse(fuseId);
}

async function getFuse(fuseId) {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const raw = await redisClient.get(`chatti:fuse:${fuseId}`);
    if (!raw) return null;
    const fuse = JSON.parse(raw);

    // Fetch votes tally
    const voteMap = await redisClient.hgetall(`chatti:fuse:${fuseId}:votes`) || {};
    let votesA = 0;
    let votesB = 0;
    const voters = [];

    const users = await getUsers();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    Object.entries(voteMap).forEach(([uid, vote]) => {
      if (vote === 'option_a') votesA++;
      if (vote === 'option_b') votesB++;
      const u = userMap[uid] || {};
      voters.push({ user_id: uid, user_name: u.name || 'Member', vote });
    });

    const totalVotes = votesA + votesB;
    const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
    const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

    const now = Date.now();
    const expireTime = new Date(fuse.expires_at).getTime();
    const isExpired = now >= expireTime;

    if (isExpired && fuse.status === 'active') {
      const winningOutcome = votesA >= votesB ? fuse.option_a : fuse.option_b;
      await lockFuse(fuse.id, winningOutcome);
      fuse.status = 'locked';
      fuse.outcome = winningOutcome;
    }

    return {
      ...fuse,
      votes_a: votesA,
      votes_b: votesB,
      total_votes: totalVotes,
      percent_a: percentA,
      percent_b: percentB,
      voters,
      seconds_remaining: Math.max(0, Math.ceil((expireTime - now) / 1000))
    };
  }
  return null;
}

async function getFuseByMessageId(messageId) {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const fuseId = await redisClient.get(`chatti:msg_fuse:${messageId}`);
    if (fuseId) return await getFuse(fuseId);

    // Or search recent fuses
    const fuseIds = await redisClient.lrange('chatti:fuses', -10, -1);
    for (const fid of fuseIds) {
      const raw = await redisClient.get(`chatti:fuse:${fid}`);
      if (raw) {
        const f = JSON.parse(raw);
        if (f.message_id === messageId) return await getFuse(f.id);
      }
    }
  }
  return null;
}

async function castVote({ fuseId, userId, vote }) {
  const fuse = await getFuse(fuseId);
  if (!fuse) throw new Error('Fuse not found');
  if (fuse.status === 'locked' || fuse.seconds_remaining <= 0) {
    throw new Error('Voting is closed for this Fuse');
  }

  if (dbMode === 'aiven_valkey' && redisClient) {
    await redisClient.hset(`chatti:fuse:${fuseId}:votes`, userId, vote);
  }

  const user = await getUser(userId);
  await addActivity({
    userId,
    type: 'vote',
    title: `${user ? user.name : 'A member'} voted on Fuse`,
    detail: `Voted for ${vote === 'option_a' ? fuse.option_a : fuse.option_b}`
  });

  return await getFuse(fuseId);
}

async function lockFuse(fuseId, outcome) {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const raw = await redisClient.get(`chatti:fuse:${fuseId}`);
    if (raw) {
      const fuse = JSON.parse(raw);
      fuse.status = 'locked';
      fuse.outcome = outcome;
      await redisClient.set(`chatti:fuse:${fuseId}`, JSON.stringify(fuse));
    }
  }

  await addActivity({
    userId: 'system',
    type: 'decision_locked',
    title: `🔥 DECISION LOCKED: ${outcome}`,
    detail: 'Consensus reached. Decision permanently locked into record.'
  });

  return await getFuse(fuseId);
}

async function getFuses() {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const fuseIds = await redisClient.lrange('chatti:fuses', 0, -1);
    const list = [];
    for (const fid of fuseIds) {
      const f = await getFuse(fid);
      if (f) list.push(f);
    }
    return list.reverse();
  }
  return [];
}

// -------------------------------------------------------------
// 4. ACTIVITY LOG & SUMMARY
// -------------------------------------------------------------
async function addActivity({ userId = 'user_guhan', type, title, detail }) {
  const actId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const act = {
    id: actId,
    user_id: userId,
    type,
    title,
    detail,
    created_at: new Date().toISOString()
  };

  if (dbMode === 'aiven_valkey' && redisClient) {
    await redisClient.lpush('chatti:activity', JSON.stringify(act));
    await redisClient.ltrim('chatti:activity', 0, 49);
  }
  return act;
}

async function getActivity(limit = 20) {
  if (dbMode === 'aiven_valkey' && redisClient) {
    const list = await redisClient.lrange('chatti:activity', 0, limit - 1);
    return list.map(item => JSON.parse(item));
  }
  return [];
}

async function getActionsSummary() {
  const allTasks = await getTasks();
  const allFuses = await getFuses();

  const openTasks = allTasks.filter(t => t.status === 'pending');
  const lockedDecisions = allFuses.filter(f => f.status === 'locked');
  const activeFuses = allFuses.filter(f => f.status === 'active');

  return {
    tasks: allTasks.slice(0, 5),
    openTasksCount: openTasks.length,
    decisions: lockedDecisions.slice(0, 5),
    activeFuses
  };
}

module.exports = {
  initDb,
  getDbStatus,
  getUsers,
  getUser,
  getConversations,
  getConversation,
  getMessages,
  addMessage,
  addWhisper,
  createTask,
  updateTaskStatus,
  getTasks,
  createFuse,
  getFuse,
  castVote,
  lockFuse,
  getFuses,
  addActivity,
  getActivity,
  getActionsSummary
};
