import base64
import json
import sys
import tempfile
import os
from typing import Any, List, Dict
from pathlib import Path

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except ImportError as exc:
    raise SystemExit(
        json.dumps({
            "success": False,
            "error": "Required packages not installed",
            "details": str(exc),
            "install_command": "pip install ultralytics opencv-python numpy"
        })
    )

# Note: YOLO (ultralytics) has built-in tracking using ByteTrack algorithm
# No need to install byte-track separately - it's integrated in ultralytics
BYTETRACKER_AVAILABLE = False  # We use YOLO's built-in tracking

# Try to import SAM3, but make it optional
# SAM3 is only needed if user wants segmentation (useSAM3=true)
try:
    from sam3 import SAM3
    SAM3_AVAILABLE = True
except ImportError:
    SAM3_AVAILABLE = False
    # Don't print warning - SAM3 is optional and not needed for basic tracking


def to_serializable(value: Any):
    """Convert numpy types and other non-serializable objects to JSON-compatible types."""
    if isinstance(value, dict):
        # Convert keys to strings if they are numpy types
        result = {}
        for k, v in value.items():
            # Convert numpy key to Python native type
            if isinstance(k, (np.integer, np.int64, np.int32)):
                k = int(k)
            elif isinstance(k, (np.floating, np.float64, np.float32)):
                k = float(k)
            elif not isinstance(k, (str, int, float, bool)) and k is not None:
                k = str(k)
            result[k] = to_serializable(v)
        return result
    if isinstance(value, (list, tuple)):
        return [to_serializable(v) for v in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (np.generic, np.integer, np.int64, np.int32, np.floating, np.float64, np.float32)):
        return value.item()
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    return str(value)


def process_video_frame_by_frame(
    video_path: str,
    yolo_model_path: str = "yolov8n.pt",
    frame_skip: int = 1,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
    use_sam3: bool = False
) -> Dict[str, Any]:
    """
    Process video with object tracking using YOLO + ByteTrack.
    
    Args:
        video_path: Path to input video file
        yolo_model_path: Path to YOLO model file
        frame_skip: Process every Nth frame (1 = all frames)
        conf_threshold: Detection confidence threshold
        iou_threshold: IOU threshold for NMS
        use_sam3: Whether to use SAM3 for segmentation (if available)
    
    Returns:
        Dictionary with tracking results and annotated video
    """
    # Load YOLO model
    try:
        model = YOLO(yolo_model_path)
    except Exception as e:
        raise SystemExit(json.dumps({
            "success": False,
            "error": f"Failed to load YOLO model: {str(e)}"
        }))
    
    # YOLO (ultralytics) has built-in ByteTrack algorithm
    # No need to initialize separate tracker - YOLO's track() method handles it
    print("ℹ️  Using YOLO built-in ByteTrack tracking", file=sys.stderr)
    
    # Initialize SAM3 if requested and available
    sam3_model = None
    if use_sam3 and SAM3_AVAILABLE:
        try:
            sam3_model = SAM3()
            print("✅ SAM3 initialized", file=sys.stderr)
        except Exception as e:
            print(f"⚠️  Failed to initialize SAM3: {e}", file=sys.stderr)
            use_sam3 = False
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise SystemExit(json.dumps({
            "success": False,
            "error": f"Failed to open video: {video_path}"
        }))
    
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Create output video writer
    output_path = os.path.join(tempfile.gettempdir(), f"tracked_{os.path.basename(video_path)}")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    processed_frames = 0
    all_tracks: List[Dict[str, Any]] = []
    track_history: Dict[int, List[Dict[str, Any]]] = {}  # track_id -> list of positions
    
    print(f"📹 Processing video: {width}x{height} @ {fps}fps, {total_frames} frames", file=sys.stderr)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Skip frames if needed
        if frame_count % frame_skip != 0:
            frame_count += 1
            continue
        
        # Run YOLO detection with tracking
        # YOLO's track() method uses built-in ByteTrack algorithm
        # persist=True enables tracking across frames
        results = model.track(
            frame,
            persist=True,  # Enable tracking persistence across frames (uses ByteTrack internally)
            conf=conf_threshold,
            iou=iou_threshold,
            classes=[2, 3, 5, 7],  # car, motorcycle, bus, truck
            verbose=False
        )
        
        # Extract detections
        detections = []
        if results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            scores = results[0].boxes.conf.cpu().numpy()
            classes = results[0].boxes.cls.cpu().numpy().astype(int)
            track_ids = results[0].boxes.id
            if track_ids is not None:
                track_ids = track_ids.cpu().numpy().astype(int)
            else:
                track_ids = np.array([-1] * len(boxes))
            
            for i, (box, score, cls, tid) in enumerate(zip(boxes, scores, classes, track_ids)):
                x1, y1, x2, y2 = map(int, box)
                detections.append({
                    'bbox': [x1, y1, x2 - x1, y2 - y1],  # [x, y, w, h]
                    'confidence': float(score),
                    'class': int(cls),
                    'class_name': model.names[int(cls)],
                    'track_id': int(tid) if tid >= 0 else None
                })
                
                # Update track history
                if tid >= 0:
                    # Convert numpy int64 to Python int for dictionary key
                    track_id_key = int(tid) if isinstance(tid, (np.integer, np.int64, np.int32)) else tid
                    if track_id_key not in track_history:
                        track_history[track_id_key] = []
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    track_history[track_id_key].append({
                        'frame': int(frame_count),
                        'center': [int(center_x), int(center_y)],
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    })
        
        # Draw annotations on frame
        annotated_frame = frame.copy()
        
        # Draw bounding boxes and track IDs
        for det in detections:
            x, y, w, h = det['bbox']
            x1, y1, x2, y2 = x, y, x + w, y + h
            track_id = det['track_id']
            class_name = det['class_name']
            confidence = det['confidence']
            
            # Choose color based on track ID
            color = (
                int((track_id * 50) % 255),
                int((track_id * 100) % 255),
                int((track_id * 150) % 255)
            ) if track_id is not None else (0, 255, 0)
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"ID:{track_id} {class_name}" if track_id is not None else f"{class_name}"
            label += f" {confidence:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated_frame, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
            cv2.putText(
                annotated_frame,
                label,
                (x1 + 3, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )
            
            # Draw track trail (last 10 positions)
            if track_id is not None and track_id in track_history:
                trail = track_history[track_id][-10:]  # Last 10 positions
                if len(trail) > 1:
                    points = [t['center'] for t in trail]
                    for i in range(1, len(points)):
                        alpha = i / len(points)
                        cv2.line(
                            annotated_frame,
                            tuple(points[i-1]),
                            tuple(points[i]),
                            color,
                            2
                        )
        
        # Write frame to output video
        out.write(annotated_frame)
        
        # Store frame results
        all_tracks.append({
            'frame': frame_count,
            'timestamp': frame_count / fps,
            'detections': detections
        })
        
        processed_frames += 1
        frame_count += 1
        
        # Progress update
        if processed_frames % 10 == 0:
            progress = (frame_count / total_frames) * 100
            print(f"⏳ Progress: {progress:.1f}% ({processed_frames} frames processed)", file=sys.stderr)
    
    cap.release()
    out.release()
    
    # Read output video as base64
    with open(output_path, 'rb') as f:
        video_bytes = f.read()
    video_b64 = base64.b64encode(video_bytes).decode('utf-8')
    
    # Clean up temp file
    try:
        os.remove(output_path)
    except:
        pass
    
    # Aggregate statistics
    unique_tracks = set()
    for frame_data in all_tracks:
        for det in frame_data['detections']:
            if det['track_id'] is not None:
                unique_tracks.add(det['track_id'])
    
    return {
        'success': True,
        'total_frames': total_frames,
        'processed_frames': processed_frames,
        'unique_tracks': len(unique_tracks),
        'video_width': width,
        'video_height': height,
        'fps': fps,
        'annotatedVideo': f"data:video/mp4;base64,{video_b64}",
        'tracks': to_serializable(all_tracks),
        'track_history': to_serializable(track_history),
        'summary': {
            'total_objects_detected': len(unique_tracks),
            'total_detections': sum(len(f['detections']) for f in all_tracks),
            'avg_detections_per_frame': sum(len(f['detections']) for f in all_tracks) / max(processed_frames, 1)
        }
    }


def main():
    """Main entry point for video object tracking."""
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        
        # Get video data (can be base64 or file path)
        video_data = payload.get("videoData")
        video_path = payload.get("videoPath")
        
        if not video_data and not video_path:
            raise SystemExit(json.dumps({
                "success": False,
                "error": "Missing videoData or videoPath"
            }))
        
        # If video_data is provided (base64), save to temp file
        if video_data:
            if "," in video_data:
                video_data = video_data.split(",", 1)[1]
            
            try:
                video_bytes = base64.b64decode(video_data)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
                    tmp.write(video_bytes)
                    video_path = tmp.name
            except Exception as e:
                raise SystemExit(json.dumps({
                    "success": False,
                    "error": f"Failed to decode video data: {str(e)}"
                }))
        
        # Get optional parameters
        frame_skip = payload.get("frameSkip", 1)
        conf_threshold = payload.get("confThreshold", 0.25)
        iou_threshold = payload.get("iouThreshold", 0.45)
        use_sam3 = payload.get("useSAM3", False) and SAM3_AVAILABLE
        
        # Process video
        result = process_video_frame_by_frame(
            video_path=video_path,
            frame_skip=frame_skip,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            use_sam3=use_sam3
        )
        
        # Clean up temp file if created from base64
        if video_data and os.path.exists(video_path):
            try:
                os.remove(video_path)
            except:
                pass
        
        print(json.dumps(result))
        
    except SystemExit:
        raise
    except Exception as e:
        raise SystemExit(json.dumps({
            "success": False,
            "error": f"Processing error: {str(e)}"
        }))


if __name__ == "__main__":
    main()

