// startsession.js - IMPROVED ERROR HANDLING
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SESS_DIR = path.resolve('./sessions');
if (!fs.existsSync(SESS_DIR)) fs.mkdirSync(SESS_DIR, { recursive: true });

export async function startNewSession(ownerNumber = '', onQR) {
  try {
    console.log('🔐 Starting WhatsApp session...');
    
    // Get latest version for better compatibility
    const { version } = await fetchLatestBaileysVersion();
    console.log('📱 Using Baileys version:', version);

    const sessionId = uuidv4();
    const authFolder = path.join(SESS_DIR, `auth_${sessionId}`);
    
    console.log('📁 Creating auth folder:', authFolder);
    
    // Use MultiFileAuthState instead of SingleFile
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    console.log('✅ Auth state initialized');

    // Create socket with proper configuration
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: {
        level: 'info' // Changed to info for debugging
      },
      browser: ['Sword Bot', 'Chrome', '1.0.0'],
      // Add connection configs
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000
    });

    sock.ev.on('creds.update', saveCreds);

    return new Promise((resolve, reject) => {
      let qrShown = false;
      let connected = false;
      
      console.log('⏳ Waiting for WhatsApp connection...');
      
      const timeout = setTimeout(() => {
        if (!connected) {
          console.log('⏰ Session timeout after 2 minutes');
          reject(new Error('Timeout: No response from WhatsApp in 2 minutes'));
        }
      }, 120000);

      sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        console.log('📡 Connection update:', connection, qr ? 'QR received' : '');
        
        // Handle QR Code
        if (qr && !qrShown) {
          console.log('🎯 QR Code Received');
          qrShown = true;
          
          if (typeof onQR === 'function') {
            try {
              onQR(qr);
              console.log('✅ QR code sent to frontend');
            } catch (e) {
              console.error('❌ Failed to send QR to frontend:', e);
            }
          }
        }
        
        // Handle successful connection
        if (connection === 'open') {
          console.log('✅✅✅ WhatsApp CONNECTED SUCCESSFULLY!');
          connected = true;
          clearTimeout(timeout);
          
          // Send confirmation message if phone number provided
          if (ownerNumber && ownerNumber.trim() !== '') {
            try {
              const jid = ownerNumber.includes('@') ? ownerNumber : `${ownerNumber}@s.whatsapp.net`;
              console.log('📤 Sending confirmation to:', jid);
              
              await sock.sendMessage(jid, { 
                text: `✅ SWORD BOT - SESSION CREATED\n\nYour Session ID: ${sessionId}\n\nUse this ID in your bot configuration.` 
              });
              
              console.log('✅ Confirmation sent to owner');
            } catch (e) {
              console.warn('⚠️ Could not send WhatsApp message:', e.message);
            }
          }
          
          resolve(sessionId);
        }
        
        // Handle connection closure
        if (connection === 'close') {
          const errorCode = lastDisconnect?.error?.output?.statusCode;
          console.log('🔌 Connection closed, code:', errorCode);
          
          clearTimeout(timeout);
          
          if (!connected) {
            if (errorCode === 401) {
              reject(new Error('Logged out from WhatsApp. Please scan QR again.'));
            } else if (errorCode === 403) {
              reject(new Error('Connection blocked. Try again later.'));
            } else if (errorCode === 419) {
              reject(new Error('Session expired. Please try again.'));
            } else if (errorCode) {
              reject(new Error(`Connection failed: ${errorCode}`));
            } else {
              reject(new Error('Connection closed unexpectedly'));
            }
          }
        }
      });

      // Handle errors
      sock.ev.on('connection.failed', (error) => {
        console.error('💥 Connection failed:', error);
        clearTimeout(timeout);
        if (!connected) {
          reject(new Error('Connection failed: ' + error.message));
        }
      });
    });
  } catch (error) {
    console.error('💥 Error in startNewSession:', error);
    throw error;
  }
}
