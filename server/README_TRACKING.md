# Object Tracking Setup Guide

Hướng dẫn cài đặt và sử dụng tính năng Object Tracking với ByteTrack và SAM3.

## 📦 Cài Đặt Dependencies

### 1. Kích hoạt Virtual Environment

```bash
cd server
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### 2. Cài Đặt Python Packages

```bash
# Cài đặt core dependencies
pip install ultralytics opencv-python numpy lap

# Lưu ý: 
# - YOLO (ultralytics) đã có ByteTrack tích hợp sẵn!
# - lap (Linear Assignment Problem) là bắt buộc cho tracking algorithm
# - Không cần cài byte-track riêng - nó đã được implement trong ultralytics

# Hoặc cài tất cả từ requirements.txt
pip install -r requirements.txt
```

### 3. Cài Đặt SAM3 (Optional)

SAM3 (Segment Anything Model 3) có thể cần cài đặt từ GitHub:

```bash
# Clone repository
git clone https://github.com/facebookresearch/segment-anything-3.git
cd sam3
pip install -e .

# Hoặc cài trực tiếp
pip install git+https://github.com/facebookresearch/segment-anything-3.git
```

**Lưu ý**: SAM3 có thể yêu cầu GPU và nhiều dependencies. Nếu không cần segmentation, có thể bỏ qua.

## 🚀 Sử Dụng

### Backend API

API endpoint: `POST http://localhost:3001/api/object-tracking`

**Request Body:**
```json
{
  "videoData": "data:video/mp4;base64,...",
  "frameSkip": 1,
  "confThreshold": 0.25,
  "iouThreshold": 0.45,
  "useSAM3": false
}
```

**Response:**
```json
{
  "success": true,
  "total_frames": 100,
  "processed_frames": 100,
  "unique_tracks": 5,
  "annotatedVideo": "data:video/mp4;base64,...",
  "tracks": [...],
  "track_history": {...},
  "summary": {
    "total_objects_detected": 5,
    "total_detections": 500,
    "avg_detections_per_frame": 5.0
  }
}
```

### Frontend

1. Truy cập `/tracking` trong web app
2. Chọn video file (mp4, webm, etc.)
3. Điều chỉnh settings (frame skip, confidence threshold, etc.)
4. Click "Bắt Đầu Tracking"
5. Xem kết quả video đã được annotate với bounding boxes và track IDs

## ⚙️ Settings

- **Frame Skip**: Xử lý mỗi N frame (1 = tất cả frames, 2 = mỗi 2 frames, ...)
- **Confidence Threshold**: Ngưỡng tin cậy cho detection (0.1 - 1.0)
- **IOU Threshold**: Ngưỡng IOU cho NMS (0.1 - 1.0)
- **Use SAM3**: Bật segmentation với SAM3 (nếu đã cài đặt)

## 🐛 Troubleshooting

### Lỗi: "Required packages not installed" hoặc "No module named 'lap'"

```bash
pip install ultralytics opencv-python numpy lap
```

**Lưu ý**: `lap` (Linear Assignment Problem) là bắt buộc cho tracking algorithm. Nếu thiếu sẽ báo lỗi "No module named 'lap'".

### Lỗi: "Failed to load YOLO model"

YOLO sẽ tự động download model `yolov8n.pt` lần đầu chạy. Đảm bảo có kết nối internet.

### Lỗi: "ByteTracker not available"

**Không cần lo!** YOLO (ultralytics) đã có ByteTrack algorithm tích hợp sẵn. 
Khi gọi `model.track()` với `persist=True`, nó tự động sử dụng ByteTrack.
Không cần cài đặt package `byte-track` riêng.

### Video quá lớn

- Giảm `frameSkip` để xử lý ít frames hơn
- Nén video trước khi upload
- Xử lý video ngắn hơn

## 📝 Notes

- YOLO model mặc định: `yolov8n.pt` (nano, nhanh nhất)
- Có thể thay đổi model trong code: `yolov8s.pt`, `yolov8m.pt`, `yolov8l.pt`, `yolov8x.pt`
- Classes được detect: car (2), motorcycle (3), bus (5), truck (7)
- Tracking sử dụng YOLO's built-in tracker hoặc ByteTracker nếu có

