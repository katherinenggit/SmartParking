# 🚀 Hướng Dẫn Khởi Động Server

## Vấn đề

Nếu bạn thấy lỗi: **"Không thể kết nối đến server detect biển số"** khi bấm nút "Capture & Detect Biển Số", điều này có nghĩa là server chưa chạy.

## Cách Khởi Động Server

### Cách 1: Sử dụng Command Line (Khuyên dùng)

1. **Mở một terminal/PowerShell MỚI** (không đóng terminal của frontend)

2. **Chuyển vào thư mục server:**
   ```bash
   cd D:\SmartParking\server
   ```

3. **Khởi động server:**
   ```bash
   npm start
   ```

4. **Bạn sẽ thấy:**
   ```
   🚀 Signaling + ALPR server starting...
   📡 WebSocket listening on ws://localhost:3001
   🧠 ALPR API ready at POST http://localhost:3001/api/plate-detect
   ⏳ Waiting for connections...
   💡 Press Ctrl+C to stop the server
   ```

5. **Giữ terminal này MỞ** - đừng đóng nó!

### Cách 2: Sử dụng File Batch (Windows)

1. **Double-click vào file:** `server/start-server.bat`
2. Server sẽ tự động khởi động

### Cách 3: Kiểm tra Server Đang Chạy

Chạy script kiểm tra:
```bash
cd server
node check-server.js
```

Hoặc mở trình duyệt và vào:
```
http://localhost:3001/health
```

Nếu thấy `{"status":"ok","service":"signaling+alpr"}` → Server đang chạy ✅

## Sau Khi Khởi Động Server

1. **Quay lại trình duyệt**
2. **Refresh trang** (F5) hoặc bấm lại nút "Bắt đầu phát"
3. **Bấm nút "Capture & Detect Biển Số"** → Lỗi sẽ biến mất!

## Lưu Ý Quan Trọng

⚠️ **Server phải chạy liên tục** trong khi bạn sử dụng ứng dụng
- Đừng đóng terminal server
- Nếu đóng, bạn sẽ gặp lỗi lại

## Port Mặc Định

- **WebSocket:** `ws://localhost:3001`
- **HTTP API:** `http://localhost:3001`
- **Plate Detection API:** `http://localhost:3001/api/plate-detect`

## Xử Lý Lỗi Port Đã Được Sử Dụng

Nếu bạn thấy lỗi: **"EADDRINUSE: address already in use :::3001"**

Điều này có nghĩa là có process khác đang dùng port 3001. Có 2 cách xử lý:

### Cách 1: Kill Process Cũ (Khuyên dùng)

1. **Chạy file batch:**
   - Double-click vào: `server/kill-port.bat`
   - Hoặc chạy lệnh: `cd server && kill-port.bat`

2. **Hoặc kill thủ công:**
   ```bash
   # Tìm process ID
   netstat -ano | findstr :3001
   
   # Kill process (thay PID bằng số tìm được)
   taskkill /F /PID <PID>
   ```

### Cách 2: Đổi Port

Nếu muốn dùng port khác, sửa file `server/signaling.js` dòng 149:
```javascript
server.listen(3002, () => {  // Đổi từ 3001 sang 3002
```

Và nhớ cập nhật `frontend/src/pages/StreamHostPage.tsx`:
```javascript
const SIGNALING_URL = 'ws://localhost:3002';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';
```

