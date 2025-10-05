// server.js - ULTRA SIMPLE WORKING VERSION
import express from 'express';
import { startNewSession } from './startsession.js';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Store sessions
const activeSessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Start session - SIMPLE VERSION
app.post('/api/start-session', async (req, res) => {
  console.log('🚀 START SESSION CALLED');
  
  try {
    const { returnQRCode } = req.body;
    const tempId = Date.now().toString();

    console.log('🔄 Creating WhatsApp session...');

    // Start the session
    const sessionId = await startNewSession('', (qrCode) => {
      console.log('✅ QR CODE GENERATED!');
      
      // Store session
      activeSessions.set(tempId, {
        qr: qrCode,
        status: 'qr_ready',
        timestamp: Date.now()
      });

      // Send QR to frontend
      if (returnQRCode) {
        console.log('📱 Sending QR to frontend...');
        res.json({
          success: true,
          tempId: tempId,
          qr: qrCode,
          status: 'qr_ready',
          message: 'QR code ready for scanning'
        });
      }
    });

    // If we get here, session is connected
    console.log('✅ SESSION CONNECTED:', sessionId);
    activeSessions.set(tempId, {
      sessionId: sessionId,
      status: 'connected', 
      timestamp: Date.now()
    });

    res.json({
      success: true,
      sessionId: sessionId,
      status: 'connected',
      message: 'WhatsApp connected successfully!'
    });

  } catch (error) {
    console.error('❌ SESSION ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session: ' + error.message
    });
  }
});

// Session status
app.get('/api/session-status', (req, res) => {
  const { tempId } = req.query;
  console.log('📊 Status check for:', tempId);

  if (!tempId) {
    return res.status(400).json({ error: 'tempId required' });
  }

  const session = activeSessions.get(tempId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 WhatsApp Session Backend running on port ${PORT}`);
  console.log(`✅ Health check: /health`);
  console.log(`✅ Start session: POST /api/start-session`);
  console.log(`✅ Check status: GET /api/session-status`);
});
