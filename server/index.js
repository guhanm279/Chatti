require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Broadcast helper for WebSockets
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}

// WebSocket Connection Management
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // Send welcome & initial connection state
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);
      // Allow clients to ping or send quick realtime sync
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      console.warn('Malformed WS message:', e.message);
    }
  });
});

// Periodic heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Mount API routes
const routes = require('./routes')(broadcast);
app.use('/api', routes);

// Serve Static Frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback to index.html for SPA routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// Start Server & Init DB
async function start() {
  try {
    console.log('🚀 Starting CHATTi full-stack application...');
    await db.initDb();

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`✨ CHATTi: Turn Conversations Into Actions`);
      console.log(`🌐 Application running at: http://localhost:${PORT}`);
      console.log(`📡 WebSocket server live on port: ${PORT}`);
      console.log(`💾 Database Status: ${JSON.stringify(db.getDbStatus())}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
