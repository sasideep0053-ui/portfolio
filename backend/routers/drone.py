import asyncio
import json
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

MASS       = 0.5    # kg
GRAVITY    = 9.81   # m/s²
HOVER_T    = MASS * GRAVITY       # ~4.905 N (exact thrust to hover)
MAX_T      = HOVER_T * 4          # ceiling thrust
DRAG       = 0.4    # N·s/m  velocity damping
MAX_H      = 10.0   # metres
DT         = 0.05   # physics tick (20 Hz)

DEFAULT_KP = 2.0
DEFAULT_KI = 0.1
DEFAULT_KD = 1.5


class PID:
    def __init__(self, kp: float, ki: float, kd: float):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.integral   = 0.0
        self.prev_error = 0.0

    def reset(self):
        self.integral   = 0.0
        self.prev_error = 0.0

    def compute(self, setpoint: float, measurement: float, dt: float):
        error = setpoint - measurement
        self.integral = max(-10.0, min(10.0, self.integral + error * dt))
        derivative    = (error - self.prev_error) / dt if dt > 0 else 0.0
        self.prev_error = error
        p = self.kp * error
        i = self.ki * self.integral
        d = self.kd * derivative
        return p + i + d, p, i, d, error


@router.websocket("/ws/drone")
async def drone_ws(ws: WebSocket):
    await ws.accept()
    print("[drone] client connected")

    height   = 0.0
    velocity = 0.0
    target   = 5.0
    wind     = 0.0
    running  = False
    t        = 0.0
    pid      = PID(DEFAULT_KP, DEFAULT_KI, DEFAULT_KD)
    loop_task = None

    async def physics_loop():
        nonlocal height, velocity, wind, t, running
        while running:
            await asyncio.sleep(DT)
            if not running:
                break

            wind *= 0.92  # exponential wind decay

            output, p, i, d, error = pid.compute(target, height, DT)
            thrust = max(0.0, min(MAX_T, HOVER_T + output))

            net          = thrust - MASS * GRAVITY - DRAG * velocity + wind
            velocity    += (net / MASS) * DT
            height       = max(0.0, min(MAX_H, height + velocity * DT))
            t           += DT

            payload = {
                "type":     "state",
                "t":        round(t, 2),
                "height":   round(height, 4),
                "velocity": round(velocity, 4),
                "thrust":   round(thrust, 4),
                "error":    round(error, 4),
                "p_term":   round(p, 4),
                "i_term":   round(i, 4),
                "d_term":   round(d, 4),
                "target":   round(target, 2),
                "wind":     round(wind, 3),
            }
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                running = False
                break

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            kind = msg.get("type")

            if kind == "start":
                if loop_task and not loop_task.done():
                    running = False
                    loop_task.cancel()
                height   = float(msg.get("height", 0.0))
                velocity = 0.0
                target   = float(msg.get("target", 5.0))
                wind     = 0.0
                t        = 0.0
                pid      = PID(
                    float(msg.get("kp", DEFAULT_KP)),
                    float(msg.get("ki", DEFAULT_KI)),
                    float(msg.get("kd", DEFAULT_KD)),
                )
                running   = True
                loop_task = asyncio.create_task(physics_loop())
                print(f"[drone] started — target={target}m  kp={pid.kp} ki={pid.ki} kd={pid.kd}")

            elif kind == "stop":
                running = False
                if loop_task and not loop_task.done():
                    loop_task.cancel()
                print("[drone] stopped")

            elif kind == "wind_gust":
                force = float(msg.get("force", 3.0)) * (1 if random.random() > 0.5 else -1)
                wind += force
                print(f"[drone] wind gust {force:+.1f} N")

            elif kind == "update_gains":
                pid.kp = float(msg.get("kp", pid.kp))
                pid.ki = float(msg.get("ki", pid.ki))
                pid.kd = float(msg.get("kd", pid.kd))

            elif kind == "update_target":
                target       = max(0.5, min(MAX_H - 0.5, float(msg.get("height", target))))
                pid.integral = 0.0  # anti-windup reset on setpoint change

    except WebSocketDisconnect:
        running = False
        if loop_task and not loop_task.done():
            loop_task.cancel()
        print("[drone] client disconnected")
