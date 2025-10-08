// server.js - ULTRA SIMPLE
import express from 'express';
import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';

const app = express();
app.use(express.json());

let currentQR = null;

app.post('/api/start', async (req, res) => {
  console.log('🔄 Starting WhatsApp...');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: { level: 'silent' }
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
      console.log('📡 Update:', update.connection);
      if (update.qr) {
        console.log('✅ QR Received!');
        currentQR = update.qr;
        res.json({ success: true, qr: update.qr });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', hasQR: !!currentQR });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Server ready on port 3000');
});
