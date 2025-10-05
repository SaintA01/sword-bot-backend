// server.js - BACKEND ONLY (for sword-bot-backend)
import express from 'express';
import { startNewSession } from './startsession.js';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const activeSessions = new Map();

// API ENDPOINTS ONLY - No HTML serving
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Backend API' });
});

app.post('/api/start-session', async (req, res) => {
  try {
    const { returnQRCode } = req.body;
    const tempId = Date.now().toString();

    const sessionId = await startNewSession('', (qr) => {
      activeSessions.set(tempId, { qr, status: 'qr_ready', timestamp: Date.now() });
      
      if (returnQRCode) {
        res.json({ tempId, qr, status: 'qr_ready', message: 'Scan QR with WhatsApp' });
      }
    });

    activeSessions.set(tempId, { sessionId, status: 'connected', timestamp: Date.now() });
    res.json({ sessionId, status: 'connected', message: 'Session created!' });

  } catch (error) {
    res.status(500).json({ error: 'Failed: ' + error.message });
  }
});

app.get('/api/session-status', (req, res) => {
  const { tempId } = req.query;
  const session = activeSessions.get(tempId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend API running on port ${PORT}`);
});
