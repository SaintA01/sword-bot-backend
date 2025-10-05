// startsession.js - WORKING VERSION
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

const SESS_DIR = path.resolve('./sessions');
if (!fs.existsSync(SESS_DIR)) fs.mkdirSync(SESS_DIR, { recursive: true });

export async function startNewSession(ownerNumber = '', onQR) {
  try {
    console.log('🔐 Initializing WhatsApp...');
    
    const { version } = await fetchLatestBaileysVersion();
    const sessionId = 'session_' + Date.now();
    const authFolder = path.join(SESS_DIR, sessionId);
    
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: { level: 'silent' },
      browser: ['Chrome', 'Windows', '10.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    return new Promise((resolve, reject) => {
      let connected = false;
      const timeout = setTimeout(() => {
        if (!connected) reject(new Error('Timeout: Scan QR within 2 minutes'));
      }, 120000);

      sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        
        if (qr && typeof onQR === 'function') {
          console.log('📱 QR received');
          onQR(qr);
        }
        
        if (connection === 'open') {
          console.log('✅ Connected to WhatsApp!');
          connected = true;
          clearTimeout(timeout);
          
          if (ownerNumber) {
            try {
              const jid = `${ownerNumber}@s.whatsapp.net`;
              await sock.sendMessage(jid, { 
                text: `✅ WhatsApp Bot Connected!\nSession: ${sessionId}` 
              });
            } catch (e) {
              console.log('⚠️ Could not send message');
            }
          }
          
          resolve(sessionId);
        }
        
        if (connection === 'close') {
          clearTimeout(timeout);
          reject(new Error('Connection closed'));
        }
      });
    });
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}
