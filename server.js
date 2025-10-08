// server.js - FIXED QR GENERATION
import express from 'express';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import cors from 'cors';

const app = express();

// CORS fix
app.use(cors({
  origin: ['https://sword-ai-b.onrender.com', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

let sock = null;
let currentQR = null;

app.post('/api/start', async (req, res) => {
  console.log('🚀 Starting WhatsApp connection...');
  
  try {
    // Clear previous session
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
    }
    
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: { level: 'info' }, // Changed to info for debugging
      browser: ['Ubuntu', 'Chrome', '110.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000
    });

    sock.ev.on('creds.update', saveCreds);
    
    let qrSent = false;
    
    sock.ev.on('connection.update', (update) => {
      console.log('📡 WhatsApp update:', {
        connection: update.connection,
        qr: update.qr ? 'QR_RECEIVED' : 'NO_QR',
        isNewLogin: update.isNewLogin
      });
      
      // Send QR code to frontend
      if (update.qr && !qrSent) {
        console.log('✅ QR CODE GENERATED!');
        currentQR = update.qr;
        qrSent = true;
        
        res.json({ 
          success: true, 
          qr: update.qr,
          message: 'QR code ready for scanning'
        });
      }
      
      // Connection successful
      if (update.connection === 'open') {
        console.log('✅✅✅ WHATSAPP CONNECTED!');
        currentQR = null;
      }
    });

    // Timeout after 30 seconds if no QR
    setTimeout(() => {
      if (!qrSent) {
        console.log('⏰ QR timeout');
        res.status(408).json({ 
          error: 'WhatsApp took too long to respond',
          solution: 'Try again in a few moments'
        });
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Setup error:', error);
    res.status(500).json({ 
      error: 'Failed to setup WhatsApp: ' + error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'WhatsApp Backend',
    hasQR: !!currentQR,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - always returns a test QR
app.post('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  const testQR = '2@TestQRCode_ThisIsFake_ButShowsBackendWorks';
  res.json({ 
    success: true, 
    qr: testQR,
    message: 'TEST QR - Backend is working but WhatsApp connection may be blocked'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`🔗 Test: POST /api/test`);
  console.log(`🔗 Start: POST /api/start`);
});
