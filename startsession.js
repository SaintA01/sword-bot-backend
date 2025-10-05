// startsession.js - WORKING VERSION
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SESS_DIR = path.resolve('./sessions');
if (!fs.existsSync(SESS_DIR)) fs.mkdirSync(SESS_DIR, { recursive: true });

export async function startNewSession(ownerNumber = '', onQR) {
  try {
    console.log('🔐 Starting WhatsApp session...');
    
    const { version } = await fetchLatestBaileysVersion();
    console.log('📱 Using Baileys version:', version);

    const sessionId = uuidv4();
    const authFolder = path.join(SESS_DIR, `auth_${sessionId}`);
    
    console.log('📁 Auth folder:', authFolder);
    
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Create socket with SIMPLE configuration
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: {
        level: 'warn' // Only show warnings and errors
      },
      browser: ['Chrome', 'Windows', '10.0.0'],
      // Simple connection settings
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000
    });

    sock.ev.on('creds.update', saveCreds);

    return new Promise((resolve, reject) => {
      let qrShown = false;
      let connected = false;
      
      console.log('⏳ Waiting for WhatsApp connection...');
      
      const timeout = setTimeout(() => {
        if (!connected) {
          console.log('⏰ Session timeout');
          reject(new Error('Timeout: Could not connect to WhatsApp'));
        }
      }, 120000);

      sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        console.log('📡 Connection update:', connection);
        
        // Handle QR Code
        if (qr && !qrShown) {
          console.log('🎯 QR Code received');
          qrShown = true;
          
          if (typeof onQR === 'function') {
            try {
              onQR(qr);
              console.log('✅ QR sent to frontend');
            } catch (e) {
              console.error('❌ Failed to send QR:', e);
            }
          }
        }
        
        // Handle successful connection
        if (connection === 'open') {
          console.log('✅✅✅ WhatsApp CONNECTED!');
          connected = true;
          clearTimeout(timeout);
          resolve(sessionId);
        }
        
        // Handle connection closure with better error messages
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
          
          console.log('🔌 Connection closed:', {
            statusCode: lastDisconnect?.error?.output?.statusCode,
            shouldReconnect
          });
          
          clearTimeout(timeout);
          
          if (lastDisconnect?.error) {
            const statusCode = lastDisconnect.error.output?.statusCode;
            switch (statusCode) {
              case DisconnectReason.connectionLost:
                reject(new Error('Connection lost to WhatsApp'));
                break;
              case DisconnectReason.connectionClosed:
                reject(new Error('Connection closed by WhatsApp'));
                break;
              case DisconnectReason.restartRequired:
                reject(new Error('Restart required'));
                break;
              case DisconnectReason.timedOut:
                reject(new Error('Connection timed out'));
                break;
              case DisconnectReason.loggedOut:
                reject(new Error('Logged out from WhatsApp. Please scan QR again.'));
                break;
              default:
                reject(new Error(`Connection failed: ${lastDisconnect.error.message}`));
            }
          } else {
            reject(new Error('Connection closed unexpectedly'));
          }
        }
      });

      // Handle connection errors
      sock.ev.on('connection.failed', (error) => {
        console.error('💥 Connection failed:', error);
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('💥 Error in startNewSession:', error);
    throw error;
  }
}
