// server.js - DEBUG VERSION
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.post('/api/start-session', async (req, res) => {
  console.log('📱 Start session called');
  
  try {
    // Simulate a working session
    const tempId = 'test_' + Date.now();
    
    // Return a success response immediately
    res.json({
      tempId,
      qr: '2@test_qr_code_that_will_fail_but_show_backend_is_working',
      status: 'qr_ready',
      message: 'Backend is working! QR will be invalid but connection is good.'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Session failed',
      details: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test backend running on port ${PORT}`);
});
