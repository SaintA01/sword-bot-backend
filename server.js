// server.js - OPTIMIZED FOR RENDER
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

// Health check route (important for Render)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Sword Bot Backend',
    timestamp: new Date().toISOString()
  });
});

// Session API Routes
app.post('/api/start-session', async (req, res) => {
  console.log('📱 API Called: /api/start-session');
  
  try {
    const { ownerNumber, returnQRCode } = req.body;
    
    const tempId = Date.now().toString() + Math.random().toString(36).substring(2);
    
    console.log('🔄 Starting WhatsApp session...');
    
    const sessionResult = await new Promise(async (resolve, reject) => {
      try {
        const sessionId = await startNewSession(ownerNumber || '', async (qr) => {
          console.log('🎯 QR code generated');
          
          // Store in active sessions
          activeSessions.set(tempId, {
            qr,
            status: 'qr_ready',
            ownerNumber: ownerNumber || '',
            timestamp: Date.now()
          });
          
          // If QR was requested, return it
          if (returnQRCode) {
            resolve({
              tempId,
              qr,
              status: 'qr_ready',
              message: 'Scan the QR code with WhatsApp'
            });
          }
        });
        
        // Session connected successfully
        console.log('✅ Session connected:', sessionId);
        activeSessions.set(tempId, {
          sessionId,
          status: 'connected',
          ownerNumber: ownerNumber || '',
          timestamp: Date.now()
        });
        
        resolve({
          sessionId,
          status: 'connected',
          message: 'Session created successfully'
        });
        
      } catch (error) {
        console.error('❌ Session error:', error);
        reject(error);
      }
    });

    res.json(sessionResult);
    
  } catch (error) {
    console.error('💥 API Error:', error);
    res.status(500).json({
      error: 'Failed to start session',
      details: error.message
    });
  }
});

app.get('/api/session-status', (req, res) => {
  const { tempId } = req.query;
  
  if (!tempId || !activeSessions.has(tempId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = activeSessions.get(tempId);
  
  // Clean up old sessions (10 minutes)
  if (Date.now() - session.timestamp > 10 * 60 * 1000) {
    activeSessions.delete(tempId);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  res.json(session);
});

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.json({
    message: 'Sword Bot Backend API',
    endpoints: {
      health: '/health',
      startSession: 'POST /api/start-session',
      sessionStatus: 'GET /api/session-status'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sword Bot Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
});
