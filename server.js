// server.js - DEBUG VERSION
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

// SIMPLE TEST ENDPOINT - Let's test if this works first
app.post('/api/test-session', async (req, res) => {
  console.log('🧪 TEST ENDPOINT CALLED');
  
  try {
    // Just return a success message to test if the endpoint works
    res.json({
      success: true,
      message: 'Test endpoint is working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

// Session API Routes - SIMPLIFIED
app.post('/api/start-session', async (req, res) => {
  console.log('📱 API Called: /api/start-session');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { ownerNumber, returnQRCode, phoneNumber } = req.body;
    
    console.log('🔄 Starting session with:', { ownerNumber, returnQRCode, phoneNumber });

    // SIMPLE TEST - Just return a QR code immediately
    if (returnQRCode) {
      console.log('🎯 Returning test QR code');
      
      // Return a test QR code (this is a fake QR for testing)
      const testQR = '2@3e7S4gR9pXqL2bK8mN5tWcVdF7hJkL3pQrS9tUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890ABCD';
      
      const tempId = 'test_' + Date.now();
      activeSessions.set(tempId, {
        qr: testQR,
        status: 'qr_ready',
        timestamp: Date.now()
      });
      
      return res.json({
        tempId,
        qr: testQR,
        status: 'qr_ready',
        message: 'TEST QR CODE - Backend is working!'
      });
    }
    
    // If we get here, try the real session creation
    console.log('🔄 Attempting real session creation...');
    
    const tempId = Date.now().toString();
    
    try {
      const sessionId = await startNewSession(ownerNumber || '', (qr) => {
        console.log('✅ QR callback fired!');
        activeSessions.set(tempId, {
          qr,
          status: 'qr_ready', 
          ownerNumber: ownerNumber || '',
          timestamp: Date.now()
        });
      });
      
      console.log('✅ Session created successfully:', sessionId);
      res.json({
        sessionId,
        status: 'connected', 
        message: 'Session created!'
      });
      
    } catch (sessionError) {
      console.error('❌ SESSION CREATION ERROR:', sessionError);
      console.error('Error stack:', sessionError.stack);
      
      res.status(500).json({
        error: 'Session creation failed',
        details: sessionError.message,
        stack: sessionError.stack // This will show us the exact error
      });
    }
    
  } catch (error) {
    console.error('💥 TOP LEVEL ERROR:', error);
    console.error('Full error stack:', error.stack);
    
    res.status(500).json({
      error: 'Failed to start session',
      details: error.message,
      stack: error.stack, // This will show us the exact error
      type: error.constructor.name
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
  console.log(`🚀 Sword Bot Backend (DEBUG) running on port ${PORT}`);
  console.log(`🌐 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🧪 Test: http://0.0.0.0:${PORT}/api/test-session`);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
  console.error('At promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
});
