import base64
import json
import time
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def b64_to_np(b64: str) -> np.ndarray:
    data = base64.b64decode(b64)
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def np_to_b64(img: np.ndarray, ext: str = ".jpg") -> str:
    _, buf = cv2.imencode(ext, img)
    return base64.b64encode(buf).decode()


def process_frame(img: np.ndarray, canny_low: int, canny_high: int, show_boxes: bool):
    t0 = time.perf_counter()

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, canny_low, canny_high)

    # Colorize edges to neon green for visual appeal
    edges_color = np.zeros_like(img)
    edges_color[edges > 0] = [0, 255, 80]  # BGR neon green

    bboxes = []
    defect_count = 0
    result_img = edges_color.copy()

    if show_boxes:
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        # Filter to significant contours (potential defects)
        significant = [c for c in contours if cv2.contourArea(c) > 120]
        defect_count = len(significant)

        for c in significant:
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(result_img, (x, y), (x + w, y + h), (0, 0, 255), 2)
            bboxes.append({"x": x, "y": y, "w": w, "h": h})

    processing_ms = round((time.perf_counter() - t0) * 1000, 1)
    total_pixels = edges.size
    edge_pixels = int(np.sum(edges > 0))
    yield_pct = round(100 - (defect_count / max(len(bboxes) + 1, 1)) * 5, 1)

    return {
        "edges_b64": np_to_b64(result_img),
        "bboxes": bboxes,
        "defect_count": defect_count,
        "edge_density": round(edge_pixels / total_pixels * 100, 2),
        "yield_pct": min(yield_pct, 100.0),
        "processing_ms": processing_ms,
        "resolution": f"{img.shape[1]}×{img.shape[0]}",
    }


@router.websocket("/ws/vision")
async def vision_ws(ws: WebSocket):
    await ws.accept()

    if not CV2_AVAILABLE:
        await ws.send_text(json.dumps({"type": "error", "message": "OpenCV not installed"}))
        await ws.close()
        return

    frame_count = 0
    pass_count = 0

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)

            if msg["type"] == "process":
                img = b64_to_np(msg["image_b64"])
                canny_low = int(msg.get("canny_low", 50))
                canny_high = int(msg.get("canny_high", 150))
                show_boxes = bool(msg.get("show_boxes", True))

                result = process_frame(img, canny_low, canny_high, show_boxes)
                frame_count += 1
                if result["defect_count"] == 0:
                    pass_count += 1

                await ws.send_text(json.dumps({
                    "type": "result",
                    "frame": frame_count,
                    "pass_rate": round(pass_count / frame_count * 100, 1),
                    **result,
                }))

    except WebSocketDisconnect:
        pass
