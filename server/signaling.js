import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const plateScriptPath = path.join(__dirname, 'plate_detect.py');
const trackingScriptPath = path.join(__dirname, 'object_tracking.py');

// Detect Python path - ưu tiên venv, sau đó dùng system Python
function getPythonPath() {
  // Windows: venv/Scripts/python.exe
  const venvPythonWindows = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  // Unix/Linux/Mac: venv/bin/python
  const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');
  
  if (existsSync(venvPythonWindows)) {
    console.log('🐍 Using Python from venv:', venvPythonWindows);
    return venvPythonWindows;
  }
  if (existsSync(venvPythonUnix)) {
    console.log('🐍 Using Python from venv:', venvPythonUnix);
    return venvPythonUnix;
  }
  
  console.log('⚠️  Venv Python not found, using system Python');
  return 'python';
}

const app = express();
app.use(cors());
// Tăng body size limit cho video upload (100MB)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'signaling+alpr' });
});

app.post('/api/plate-detect', async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ success: false, error: 'imageData is required' });
    }
    
    console.log('📥 Received plate detection request, imageData length:', imageData.length);
    
    const result = await runPlateDetection(imageData);
    
    console.log('📤 Plate detection result:', {
      success: true,
      platesCount: result.plates?.length || 0,
      hasAnnotatedImage: !!result.annotatedImage,
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Plate detection error:', error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Plate detection failed. Ensure Python + fast-alpr are installed.',
    });
  }
});

app.post('/api/object-tracking', async (req, res) => {
  try {
    const { videoData, frameSkip, confThreshold, iouThreshold, useSAM3 } = req.body;
    
    if (!videoData || typeof videoData !== 'string') {
      return res.status(400).json({ success: false, error: 'videoData is required (base64 encoded video)' });
    }
    
    console.log('📥 Received object tracking request, videoData length:', videoData.length);
    
    const result = await runObjectTracking({
      videoData,
      frameSkip: frameSkip || 1,
      confThreshold: confThreshold || 0.25,
      iouThreshold: iouThreshold || 0.45,
      useSAM3: useSAM3 || false,
    });
    
    console.log('📤 Object tracking result:', {
      success: result.success,
      processedFrames: result.processed_frames || result.processedFrames,
      uniqueTracks: result.unique_tracks || result.uniqueTracks,
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Object tracking error:', error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Object tracking failed. Ensure Python + ultralytics + byte-track are installed.',
    });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomId -> { host: ws, viewers: Set<ws>, pendingOffer: offer }

// Helper function để gửi dữ liệu an toàn qua WebSocket
function safeSend(socket, data) {
  try {
    if (!socket) return false;
    
    // Kiểm tra readyState - OPEN = 1
    const OPEN = socket.constructor.OPEN || 1;
    if (socket.readyState === OPEN) {
      socket.send(JSON.stringify(data));
      return true;
    }
  } catch (err) {
    // Bỏ qua các lỗi thường gặp khi client disconnect
    if (err.code !== 'EPIPE' && 
        err.code !== 'ECONNRESET' && 
        err.code !== 'ECONNABORTED' &&
        err.errno !== -4095) {
      console.error('❌ Error sending message:', err.message || err.code);
    }
  }
  return false;
}

wss.on('connection', (socket) => {
  console.log('✅ Client connected');
  
  socket.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'join') {
        const room = rooms.get(data.roomId) || { host: null, viewers: new Set(), pendingOffer: null };
        if (data.role === 'host') {
          room.host = socket;
          console.log(`🎥 Host joined room: ${data.roomId}`);
          // Nếu có viewer đang chờ, gửi offer cho họ
          if (room.pendingOffer) {
            room.viewers.forEach((viewer) => {
              safeSend(viewer, { type: 'offer', offer: room.pendingOffer });
            });
          }
        } else {
          room.viewers.add(socket);
          console.log(`👀 Viewer joined room: ${data.roomId} (Total viewers: ${room.viewers.size})`);
          // Nếu host đã có offer, gửi ngay cho viewer mới
          if (room.pendingOffer) {
            safeSend(socket, { type: 'offer', offer: room.pendingOffer });
          }
        }
        rooms.set(data.roomId, room);
        socket.roomId = data.roomId;
        socket.role = data.role;
        return;
      }

      const room = rooms.get(socket.roomId);
      if (!room) return;

      if (data.type === 'offer') {
        // Host gửi offer - lưu lại và gửi cho tất cả viewers
        room.pendingOffer = data.offer;
        room.viewers.forEach((viewer) => {
          safeSend(viewer, data);
        });
      } else if (socket.role === 'host') {
        // Host gửi ICE candidate hoặc answer
        room.viewers.forEach((viewer) => safeSend(viewer, data));
      } else if (room.host) {
        // Viewer gửi answer hoặc ICE candidate
        safeSend(room.host, data);
      }
    } catch (err) {
      console.error('Signaling error', err);
    }
  });

  socket.on('close', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;
    if (socket.role === 'host') {
      console.log(`🔴 Host disconnected from room: ${socket.roomId}`);
      room.host = null;
      // Đóng tất cả viewers một cách an toàn
      room.viewers.forEach((viewer) => {
        try {
          if (viewer.readyState === viewer.constructor.OPEN) {
            viewer.close();
          }
        } catch (err) {
          // Ignore errors khi đóng socket
        }
      });
      room.viewers.clear();
      // Xóa room nếu không còn ai
      if (room.viewers.size === 0 && !room.host) {
        rooms.delete(socket.roomId);
      }
    } else {
      room.viewers.delete(socket);
      console.log(`👋 Viewer disconnected (Remaining: ${room.viewers.size})`);
      // Xóa room nếu không còn ai
      if (room.viewers.size === 0 && !room.host) {
        rooms.delete(socket.roomId);
      }
    }
  });
  
  socket.on('error', (error) => {
    // Chỉ log error, không throw để tránh crash server
    // Bỏ qua các lỗi thường gặp khi client disconnect
    if (error.code !== 'ECONNRESET' && 
        error.code !== 'EPIPE' && 
        error.code !== 'ECONNABORTED' &&
        error.code !== 'WSAECONNRESET' &&
        error.errno !== -4095) { // EOF error
      console.error('❌ WebSocket error:', error.message || error.code || error);
    } else {
      // Log nhẹ cho các lỗi thường gặp
      console.log('⚠️  Client disconnected (normal):', error.code || 'EOF');
    }
  });
});

// Thêm error handler cho WebSocketServer để bắt tất cả lỗi
wss.on('error', (error) => {
  console.error('❌ WebSocketServer error:', error.message || error);
  // Không throw để server tiếp tục chạy
});

// Thêm uncaughtException handler để server không crash
process.on('uncaughtException', (error) => {
  // Bỏ qua lỗi EOF và connection reset
  if (error.code === 'EPIPE' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ECONNABORTED' ||
      error.errno === -4095) {
    console.log('⚠️  Ignored connection error (client disconnected):', error.code || 'EOF');
    return;
  }
  console.error('❌ Uncaught Exception:', error);
  // Không exit để server tiếp tục chạy
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Không exit để server tiếp tục chạy
});

server.listen(3001, () => {
  console.log('🚀 Signaling + ALPR + Tracking server starting...');
  console.log('📡 WebSocket listening on ws://localhost:3001');
  console.log('🧠 ALPR API ready at POST http://localhost:3001/api/plate-detect');
  console.log('🎯 Object Tracking API ready at POST http://localhost:3001/api/object-tracking');
  console.log('⏳ Waiting for connections...');
  
  // Test Python path khi server start
  const pythonPath = getPythonPath();
  console.log(`🐍 Python path: ${pythonPath}\n`);
  
  console.log('💡 Press Ctrl+C to stop the server\n');
});

function runPlateDetection(imageData) {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const python = spawn(pythonPath, [plateScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname, // Đảm bảo working directory đúng
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('error', (error) => {
      reject(error);
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python process exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(err);
      }
    });

    python.stdin.write(JSON.stringify({ imageData }));
    python.stdin.end();
  });
}

function runObjectTracking({ videoData, frameSkip, confThreshold, iouThreshold, useSAM3 }) {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const python = spawn(pythonPath, [trackingScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname,
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log progress messages to console
      const message = data.toString().trim();
      if (message && !message.includes('Traceback')) {
        console.log(`[Tracking] ${message}`);
      }
    });

    python.on('error', (error) => {
      reject(error);
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python process exited with code ${code}`));
      }
      try {
        // Find the last JSON object in stdout (in case there are progress messages)
        const lines = stdout.split('\n');
        let jsonLine = '';
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim().startsWith('{')) {
            jsonLine = lines[i].trim();
            break;
          }
        }
        if (!jsonLine) {
          jsonLine = stdout.trim();
        }
        resolve(JSON.parse(jsonLine));
      } catch (err) {
        console.error('Failed to parse tracking result:', err);
        console.error('stdout:', stdout);
        reject(new Error(`Failed to parse result: ${err.message}`));
      }
    });

    python.stdin.write(JSON.stringify({
      videoData,
      frameSkip,
      confThreshold,
      iouThreshold,
      useSAM3,
    }));
    python.stdin.end();
  });
}