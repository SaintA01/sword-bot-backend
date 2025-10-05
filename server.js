// server.js - REAL WHATSAPP CONNECTION
import express from 'express';
import { startNewSession } from './startsession.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active sessions
const activeSessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Sword Bot Backend',
    timestamp: new Date().toISOString()
  });
});

// Session API Routes - REAL IMPLEMENTATION
app.post('/api/start-session', async (req, res) => {
  console.log('📱 API Called: /api/start-session');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { ownerNumber, returnQRCode, phoneNumber } = req.body;
    
    const tempId = Date.now().toString() + Math.random().toString(36).substring(2);
    
    console.log('🔄 Starting REAL WhatsApp session...', { tempId, ownerNumber, phoneNumber, returnQRCode });

    // REAL SESSION CREATION - No more test data
    try {
      const sessionId = await startNewSession(ownerNumber || '', (qr) => {
        console.log('🎯 REAL QR code generated');
        
        // Store in active sessions
        activeSessions.set(tempId, {
          qr,
          status: 'qr_ready',
          ownerNumber: ownerNumber || '',
          phoneNumber: phoneNumber || '',
          timestamp: Date.now()
        });
        
        // If QR was requested, return it immediately
        if (returnQRCode) {
          console.log('✅ Sending REAL QR code to frontend');
          res.json({
            tempId,
            qr,
            status: 'qr_ready',
            message: 'Scan this QR code with WhatsApp'
          });
        }
      });
      
      // Session connected successfully
      console.log('✅ Session connected successfully:', sessionId);
      activeSessions.set(tempId, {
        sessionId,
        status: 'connected',
        ownerNumber: ownerNumber || '',
        phoneNumber: phoneNumber || '',
        timestamp: Date.now()
      });
      
      res.json({
        sessionId,
        status: 'connected',
        message: 'Session created successfully'
      });
      
    } catch (sessionError) {
      console.error('❌ SESSION CREATION ERROR:', sessionError);
      res.status(500).json({
        error: 'Session creation failed',
        details: sessionError.message
      });
    }
    
  } catch (error) {
    console.error('💥 TOP LEVEL ERROR:', error);
    res.status(500).json({
      error: 'Failed to start session',
      details: error.message
    });
  }
});

app.get('/api/session-status', (req, res) => {
  const { tempId } = req.query;
  console.log('Status check for:', tempId);
  
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
  console.log(`🚀 Sword Bot Backend (REAL) running on port ${PORT}`);
  console.log(`🌐 Health: http://0.0.0.0:${PORT}/health`);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
});
