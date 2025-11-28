import base64
import json
import sys
from typing import Any

import cv2
import numpy as np

try:
    from fast_alpr import ALPR
except ImportError as exc:
    raise SystemExit(
        json.dumps({"success": False, "error": "fast-alpr is not installed", "details": str(exc)})
    )


def to_serializable(value: Any):
    if isinstance(value, dict):
        return {k: to_serializable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_serializable(v) for v in value]
    if hasattr(value, "model_dump"):
        return to_serializable(value.model_dump())
    if hasattr(value, "__dict__"):
        return to_serializable(vars(value))
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (np.generic,)):
        return value.item()
    return value


def normalize_entries(raw):
    if isinstance(raw, dict) and "results" in raw:
        return raw["results"]
    if isinstance(raw, list):
        return raw
    return [raw]


def extract_text(entry: dict):
    return (
        entry.get("plate_text")
        or entry.get("plate")
        or entry.get("text")
        or entry.get("license_plate")
        or entry.get("ocr_text")
        or ""
    )


def extract_confidence(entry: dict):
    return (
        entry.get("plate_confidence")
        or entry.get("confidence")
        or entry.get("plate_score")
        or entry.get("score")
        or 0
    )


def extract_bbox(entry: dict):
    return (
        entry.get("plate_bbox")
        or entry.get("bbox")
        or entry.get("box")
        or entry.get("plate_box")
    )


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    image_data = payload.get("imageData")
    if not image_data:
        raise SystemExit(json.dumps({"success": False, "error": "Missing imageData"}))

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(json.dumps({"success": False, "error": "Invalid base64 image", "details": str(exc)}))

    np_array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise SystemExit(json.dumps({"success": False, "error": "Unable to decode image"}))

    alpr = ALPR(
        detector_model="yolo-v9-t-384-license-plate-end2end",
        ocr_model="global-plates-mobile-vit-v2-model",
    )
    results = alpr.predict(frame)
    
    # Debug log
    print(f"[DEBUG] ALPR predict returned {len(results)} results", file=sys.stderr)

    # Manual annotation
    annotated = frame.copy()
    plates = []

    for result in results:
        # Check for object attributes directly
        plate_text = getattr(result, "plate", "") or ""
        confidence = getattr(result, "confidence", 0.0)
        detection = getattr(result, "detection", None)

        if not plate_text and hasattr(result, "ocr"):
            # Maybe nested?
            ocr_obj = getattr(result, "ocr", None)
            if ocr_obj:
                plate_text = getattr(ocr_obj, "text", "") or ""
                confidence = getattr(ocr_obj, "confidence", 0.0)

        plate_text = plate_text.upper().strip()

        # Chỉ thêm plate nếu có text (không filter theo độ dài để không bỏ sót)
        # Bỏ qua các detection không có text
        if not plate_text:
            continue  # Skip plates without text

        bbox = [0, 0, 0, 0]
        if detection and hasattr(detection, "box"):
            # [x1, y1, x2, y2]
            box = detection.box
            if len(box) == 4:
                x1, y1, x2, y2 = map(int, box)
                bbox = [x1, y1, x2 - x1, y2 - y1] # Convert to [x, y, w, h] for frontend
                
                # Draw green box
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (64, 255, 120), 3)

                # Draw text background and text inside box bottom
                label = f"{plate_text} ({confidence * 100:.1f}%)"
                (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
                text_y = max(y2 - 8, y1 + h + 8)
                cv2.rectangle(annotated, (x1, text_y - h - 8), (x1 + w + 12, text_y + 6), (64, 255, 120), -1)
                cv2.putText(
                    annotated,
                    label,
                    (x1 + 6, text_y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.75,
                    (0, 40, 20),
                    2,
                )

        plates.append(
            {
                "text": plate_text,
                "confidence": float(confidence),
                "bbox": bbox,
            }
        )

    if plates:
        banner = f"[{plates[0]['text']}]"
        (tw, th), _ = cv2.getTextSize(banner, cv2.FONT_HERSHEY_SIMPLEX, 1.1, 3)
        bx = max(20, (annotated.shape[1] - tw) // 2 - 20)
        by = annotated.shape[0] - 25
        cv2.rectangle(annotated, (bx - 10, by - th - 15), (bx + tw + 10, by + 15), (255, 255, 255), -1)
        cv2.putText(
            annotated,
            banner,
            (bx, by),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.1,
            (0, 0, 0),
            3,
        )

    ok, buffer = cv2.imencode(".png", annotated)
    if not ok:
        raise SystemExit(json.dumps({"success": False, "error": "Failed to encode annotated image"}))

    annotated_b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")

    print(
        json.dumps(
            {
                "plates": plates,
                "raw": [], # Simplified raw
                "annotatedImage": f"data:image/png;base64,{annotated_b64}",
            }
        )
    )


if __name__ == "__main__":
    main()

