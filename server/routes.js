const express = require('express');
const router = express.Router();
const db = require('./db');

module.exports = function(broadcast) {
  // DB Status Check
  router.get('/status', async (req, res) => {
    try {
      const status = db.getDbStatus();
      const users = await db.getUsers();
      const convs = await db.getConversations();
      res.json({
        success: true,
        status,
        stats: {
          usersCount: users.length,
          conversationsCount: convs.length
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database status unavailable' });
    }
  });

  // Get Users
  router.get('/users', async (req, res) => {
    try {
      const users = await db.getUsers();
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to retrieve users' });
    }
  });

  // Get Conversations
  router.get('/conversations', async (req, res) => {
    try {
      const conversations = await db.getConversations();
      res.json({ success: true, conversations });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to retrieve conversations' });
    }
  });

  // GET messages for current conversation (with Whisper privacy protection)
  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const currentUserId = req.query.userId || 'user_guhan';
      if (!conversationId) {
        return res.status(400).json({ success: false, error: 'Conversation ID required' });
      }

      const messages = await db.getMessages(conversationId, currentUserId);
      res.json({ success: true, messages });
    } catch (err) {
      console.error('Error retrieving messages:', err.message);
      res.status(500).json({ success: false, error: 'Failed to retrieve messages from database' });
    }
  });

  // POST normal message
  router.post('/messages', async (req, res) => {
    try {
      const { conversationId, senderId, content, messageType = 'text' } = req.body;

      if (!conversationId || !senderId || !content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'conversationId, senderId, and content are required' });
      }

      const savedMessage = await db.addMessage({
        conversationId,
        senderId,
        content: content.trim(),
        messageType
      });

      broadcast({
        type: 'NEW_MESSAGE',
        conversationId,
        message: savedMessage
      });

      res.status(201).json({ success: true, message: savedMessage });
    } catch (err) {
      console.error('Error inserting message:', err.message);
      res.status(500).json({ success: false, error: 'Failed to save message to database' });
    }
  });

  // 1. 🔒 WHISPER ROUTE
  router.post('/whisper', async (req, res) => {
    try {
      const { conversationId, senderId, recipientId, content } = req.body;
      if (!conversationId || !senderId || !recipientId || !content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'conversationId, senderId, recipientId, and content are required' });
      }

      const sender = await db.getUser(senderId);
      const recipient = await db.getUser(recipientId);

      // Create message row
      const savedMessage = await db.addMessage({
        conversationId,
        senderId,
        content: `🔒 Private Whisper for ${recipient ? recipient.name : 'Member'}`,
        messageType: 'whisper'
      });

      // Save whisper object in Aiven
      const whisper = await db.addWhisper({
        messageId: savedMessage.id,
        senderId,
        recipientId,
        content: content.trim()
      });

      // Realtime broadcast to all connected clients
      broadcast({
        type: 'NEW_WHISPER',
        conversationId,
        messageId: savedMessage.id,
        senderId,
        recipientId,
        senderName: sender ? sender.name : 'Sender',
        recipientName: recipient ? recipient.name : 'Recipient',
        content: content.trim(),
        createdAt: savedMessage.created_at
      });

      res.status(201).json({ success: true, message: savedMessage, whisper });
    } catch (err) {
      console.error('Error sending whisper:', err.message);
      res.status(500).json({ success: false, error: 'Failed to send whisper' });
    }
  });

  // 2. ✨ MAGIC -> TASK ROUTE
  router.post('/tasks', async (req, res) => {
    try {
      const { messageId, assignedTo, title, description = '', deadline = 'Today, 6:00 PM', conversationId } = req.body;
      if (!assignedTo || !title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'assignedTo and title are required' });
      }

      const task = await db.createTask({
        messageId,
        assignedTo,
        title: title.trim(),
        description,
        deadline
      });

      // Realtime broadcast to all connected clients
      broadcast({
        type: 'TASK_CREATED',
        conversationId: conversationId || 'conv_alpha',
        messageId,
        task
      });

      res.status(201).json({ success: true, task });
    } catch (err) {
      console.error('Error creating task:', err.message);
      res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  });

  router.patch('/tasks/:id', async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, error: 'status is required' });

      const updated = await db.updateTaskStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });

      broadcast({
        type: 'TASK_UPDATED',
        task: updated
      });

      res.json({ success: true, task: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/tasks', async (req, res) => {
    try {
      const tasks = await db.getTasks();
      res.json({ success: true, tasks });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. 🔥 FUSE ROUTE
  router.post('/fuses', async (req, res) => {
    try {
      const { conversationId, senderId, question, optionA = '👍 Submit Today', optionB = '👎 Tomorrow', durationSeconds = 10 } = req.body;
      if (!question || !question.trim()) {
        return res.status(400).json({ success: false, error: 'question is required' });
      }

      // Create message for Fuse if conversation specified
      let messageId = null;
      if (conversationId && senderId) {
        const msg = await db.addMessage({
          conversationId,
          senderId,
          content: question.trim(),
          messageType: 'fuse'
        });
        messageId = msg.id;
      }

      const fuse = await db.createFuse({
        messageId,
        question: question.trim(),
        optionA,
        optionB,
        durationSeconds: parseInt(durationSeconds) || 10
      });

      // Realtime broadcast to all connected clients
      broadcast({
        type: 'FUSE_STARTED',
        conversationId: conversationId || 'conv_alpha',
        messageId,
        fuse
      });

      res.status(201).json({ success: true, fuse });
    } catch (err) {
      console.error('Error starting fuse:', err.message);
      res.status(500).json({ success: false, error: 'Failed to start fuse' });
    }
  });

  router.get('/fuses/:id', async (req, res) => {
    try {
      const fuse = await db.getFuse(req.params.id);
      if (!fuse) return res.status(404).json({ success: false, error: 'Fuse not found' });
      res.json({ success: true, fuse });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/fuses/:id/vote', async (req, res) => {
    try {
      const { userId, vote } = req.body;
      if (!userId || !vote) {
        return res.status(400).json({ success: false, error: 'userId and vote are required' });
      }

      const updatedFuse = await db.castVote({
        fuseId: req.params.id,
        userId,
        vote
      });

      // Realtime broadcast of vote update
      broadcast({
        type: 'VOTE_CAST',
        fuseId: req.params.id,
        fuse: updatedFuse
      });

      res.json({ success: true, fuse: updatedFuse });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/fuses/:id/lock', async (req, res) => {
    try {
      const { outcome } = req.body;
      const locked = await db.lockFuse(req.params.id, outcome || 'Submit Today');

      broadcast({
        type: 'FUSE_LOCKED',
        fuseId: req.params.id,
        fuse: locked
      });

      res.json({ success: true, fuse: locked });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Right Actions Panel
  router.get('/actions', async (req, res) => {
    try {
      const summary = await db.getActionsSummary();
      res.json({ success: true, summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Activity Feed
  router.get('/activity', async (req, res) => {
    try {
      const activity = await db.getActivity(30);
      res.json({ success: true, activity });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
