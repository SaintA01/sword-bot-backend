// startsession.js - ULTRA SIMPLE WORKING VERSION
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = './sessions';

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

export async function startNewSession(ownerNumber = '', onQR) {
  console.log('🔐 INITIALIZING WHATSAPP CONNECTION...');
  
  try {
    // Get Baileys version
    const { version } = await fetchLatestBaileysVersion();
    console.log('📱 Using Baileys version:', version);

    // Create unique session ID
    const sessionId = 'whatsapp_session_' + Date.now();
    const authFolder = path.join(SESSIONS_DIR, sessionId);
    
    console.log('📁 Auth folder:', authFolder);

    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    console.log('✅ Auth state initialized');

    // Create WhatsApp socket
    const sock = makeWASocket({
      version: version,
      auth: state,
      printQRInTerminal: true,
      logger: {
        level: 'silent'
      },
      browser: ['Ubuntu', 'Chrome', '110.0.0'],
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Return promise that resolves when connected
    return new Promise((resolve, reject) => {
      console.log('⏳ Waiting for WhatsApp connection...');
      
      let qrGenerated = false;
      let connected = false;

      // Timeout after 2 minutes
      const timeout = setTimeout(() => {
        if (!connected) {
          console.log('⏰ Connection timeout');
          reject(new Error('WhatsApp connection timeout. Please try again.'));
        }
      }, 120000);

      // Handle connection updates
      sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        console.log('📡 Connection update:', connection);

        // QR Code received
        if (qr && !qrGenerated) {
          console.log('🎯 QR CODE RECEIVED FROM WHATSAPP');
          qrGenerated = true;
          
          // Send QR to frontend
          if (typeof onQR === 'function') {
            onQR(qr);
          }
        }

        // Connected successfully
        if (connection === 'open') {
          console.log('✅✅✅ WHATSAPP CONNECTED SUCCESSFULLY!');
          connected = true;
          clearTimeout(timeout);
          resolve(sessionId);
        }

        // Connection closed
        if (connection === 'close') {
          console.log('🔌 Connection closed');
          clearTimeout(timeout);
          
          if (lastDisconnect?.error) {
            reject(new Error(`Connection closed: ${lastDisconnect.error.message}`));
          } else {
            reject(new Error('Connection closed unexpectedly'));
          }
        }
      });

      // Handle connection failures
      sock.ev.on('connection.failed', (error) => {
        console.error('💥 Connection failed:', error);
        clearTimeout(timeout);
        reject(new Error('Failed to connect to WhatsApp'));
      });
    });

  } catch (error) {
    console.error('💥 Error in startNewSession:', error);
    throw error;
  }
}
