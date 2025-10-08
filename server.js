// server.js - WITH CORS FIX
import express from 'express';
import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import cors from 'cors';

const app = express();

// FIX: Add proper CORS
app.use(cors({
  origin: ['https://sword-ai-b.onrender.com', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

let currentQR = null;

app.post('/api/start', async (req, res) => {
  console.log('🚀 /api/start called');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: { level: 'warn' }
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
      console.log('📡 Connection:', update.connection);
      if (update.qr) {
        console.log('✅ QR Generated!');
        currentQR = update.qr;
        res.json({ 
          success: true, 
          qr: update.qr,
          message: 'QR code ready for scanning'
        });
      }
    });

    // Timeout if no QR
    setTimeout(() => {
      if (!currentQR) {
        res.status(408).json({ error: 'QR timeout' });
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'WhatsApp Backend',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
