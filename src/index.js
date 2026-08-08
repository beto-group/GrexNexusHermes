import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.HERMES_HOST_PORT || 7778;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Host Bridge Telemetry Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    host: 'GrexNexusHermes',
    type: 'hermes-host-bridge',
    version: '1.0.0',
    capabilities: ['component_serving', 'sidecar_ipc', 'ordo_control'],
    sidecarPort: 7777,
    bridgePort: PORT
  });
});

// Serve Components Directory dynamically
const COMPONENTS_DIR = path.resolve(__dirname, '../../components');
app.use('/components', express.static(COMPONENTS_DIR));

// Dynamic Component Directory Inspector
app.get('/api/components', (req, res) => {
  try {
    if (!fs.existsSync(COMPONENTS_DIR)) {
      return res.json({ components: [] });
    }

    const items = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true });
    const components = items
      .filter((item) => item.isDirectory())
      .map((item) => {
        const compPath = path.join(COMPONENTS_DIR, item.name, 'grex.json');
        let meta = { id: item.name, name: item.name };
        if (fs.existsSync(compPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(compPath, 'utf8'));
          } catch (_) {}
        }
        return meta;
      });

    res.json({ components });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hermes Agent Ordo IPC Control Bridge Endpoint
app.post('/api/ordo/action', (req, res) => {
  const { action, payload } = req.body || {};
  console.log(`[GrexNexusHermes] Dispatching Ordo Action: ${action}`, payload);

  // Broadcast IPC action to all connected WebSockets
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'ORDO_ACTION', action, payload }));
    }
  });

  res.json({ status: 'ok', dispatchedAction: action, payload });
});

// WebSocket Real-time Telemetry & IPC Connection
wss.on('connection', (ws) => {
  console.log('[GrexNexusHermes] Client connected to Host Bridge WebSocket');

  ws.send(
    JSON.stringify({
      type: 'INIT_HOST_BRIDGE',
      host: 'GrexNexusHermes',
      timestamp: Date.now()
    })
  );

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log('[GrexNexusHermes WebSocket] Message:', data);
    } catch (_) {}
  });
});

server.listen(PORT, () => {
  console.log(`🚀 [GrexNexusHermes Host Bridge] Running on http://localhost:${PORT}`);
});
