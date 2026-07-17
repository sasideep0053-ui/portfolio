import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ── Physics constants ──────────────────────────────────────────────────────
GRAVITY           = 9.81    # m/s²
MPH_TO_MS         = 0.44704 # 1 mph in m/s
TURN_RADIUS_MIN_M = 100.0   # minimum turn radius (city/suburban), scales up with speed
TURN_RADIUS_SPD_K =   5.0   # radius = max(100, speed_ms × 5) — grows proportionally at highway speed
MAX_LONG_G        = 3.0     # longitudinal cap (extreme crash/race limit)
MAX_LAT_G         = 1.0     # lateral cap (street-tire grip limit ~1G)
MAX_SPEED_MPH     = 100.0   # speed ceiling

# ── Speed simulation constants (frontend drives physics; kept in sync here) ─
# Gas: 18 mph/s (constant) — ~0.82G, 0-60 in ~3.3s (sports car)
BRAKE_BASE        =  5.0    # mph/s  base braking deceleration
BRAKE_COEFF       =  0.18   # speed-dependent brake factor (mph/s per mph)
#   total brake decel = (BRAKE_BASE + BRAKE_COEFF × speed) mph/s
#   at 100 mph → 23 mph/s → ~1.05G (harsh)
#   at  80 mph → 19 mph/s → ~0.88G (harsh)
#   at  60 mph → 16 mph/s → ~0.72G (firm, not harsh)
#   at  25 mph →  9 mph/s → ~0.41G (normal)
COAST_BASE        =  0.4    # mph/s  rolling resistance baseline
COAST_COEFF       =  0.012  # speed-dependent aero drag factor
#   total coast decel = (COAST_BASE + COAST_COEFF × speed) mph/s
#   at  60 mph → 1.1 mph/s → ~0.05G  (realistic highway coast)
#   at 100 mph → 1.6 mph/s → ~0.07G

# ── Harsh-event thresholds (matches frontend) ──────────────────────────────
HARSH_BRAKE_THRESHOLD   = -0.9   # g  (emergency braking: >0.9G decel, ~85+ mph)
HARSH_LATERAL_THRESHOLD =  0.9   # g  (sharp cornering: >0.9G lateral, ~93+ mph full steer)

# ── Risk-scoring thresholds ────────────────────────────────────────────────
RISK_HIGH_DECEL   = -1.0   # g  — peak decel worse than this → HIGH
RISK_MED_DECEL    = -0.8   # g  — peak decel worse than this → MEDIUM
RISK_HIGH_RATE    =  8.0   # harsh events/min → HIGH  (2+ events in 15s session)
RISK_MED_RATE     =  4.0   # harsh events/min → MEDIUM (1+ event in 15s session)


def compute_report(events: list[dict]) -> dict:
    if not events:
        return {}

    speeds = [e["speed"] for e in events]
    g_forces = [e["g_force"] for e in events]
    lateral_gs = [e["lateral_g"] for e in events]

    # Count harsh event onsets only (transition from non-harsh to harsh)
    harsh_count = 0
    was_harsh = False
    for e in events:
        is_harsh = e.get("harsh", False)
        if is_harsh and not was_harsh:
            harsh_count += 1
        was_harsh = is_harsh

    peak_decel = min(g_forces)
    peak_lateral = max(abs(g) for g in lateral_gs)
    duration_s = (events[-1]["ts"] - events[0]["ts"]) / 1000

    rate_per_min = (harsh_count / duration_s * 60) if duration_s > 0 else 0

    risk = "LOW"
    premium_delta = 0
    if peak_decel < RISK_HIGH_DECEL or rate_per_min > RISK_HIGH_RATE:
        risk = "HIGH"
        premium_delta = 25
    elif peak_decel < RISK_MED_DECEL or rate_per_min > RISK_MED_RATE:
        risk = "MEDIUM"
        premium_delta = 10

    return {
        "type": "report",
        "peak_speed_mph": round(max(speeds), 1),
        "peak_decel_g": round(peak_decel, 3),
        "peak_lateral_g": round(peak_lateral, 3),
        "harsh_events": harsh_count,
        "rate_per_min": round(rate_per_min, 1),
        "risk_category": risk,
        "premium_delta": premium_delta,
        "duration_s": round(duration_s, 1),
    }


@router.websocket("/ws/telematics")
async def telematics_ws(ws: WebSocket):
    await ws.accept()
    print("[telematics] client connected")
    prev_speed_ms = 0.0
    prev_ts = None
    events: list[dict] = []

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)

            if msg["type"] == "update":
                speed_mph = float(msg.get("speed", 0))
                steer = float(msg.get("steer", 0))
                ts = msg.get("timestamp", time.time() * 1000)

                speed_ms = speed_mph * MPH_TO_MS
                dt = ((ts - prev_ts) / 1000) if prev_ts else 0.05

                accel_ms2 = (speed_ms - prev_speed_ms) / dt if dt > 0 else 0
                long_g    = max(-MAX_LONG_G, min(MAX_LONG_G, accel_ms2 / GRAVITY))
                # effective radius grows with speed — city: 100m, highway: ~200m
                effective_radius = max(TURN_RADIUS_MIN_M, speed_ms * TURN_RADIUS_SPD_K)
                lateral_g = max(-MAX_LAT_G, min(MAX_LAT_G,
                    steer * (speed_ms ** 2) / (GRAVITY * effective_radius)
                )) if speed_ms > 2 else 0

                harsh = (
                    long_g < HARSH_BRAKE_THRESHOLD
                    or abs(lateral_g) > HARSH_LATERAL_THRESHOLD
                )

                event = (
                    "HARSH_BRAKE" if long_g < HARSH_BRAKE_THRESHOLD
                    else "HARSH_TURN" if abs(lateral_g) > HARSH_LATERAL_THRESHOLD
                    else None
                )

                if harsh:
                    print(f"[telematics] {event}  speed={speed_mph:.1f}mph  g={long_g:.2f}")

                payload = {
                    "type": "telemetry",
                    "ts": ts,
                    "speed": speed_mph,
                    "g_force": round(long_g, 3),
                    "lateral_g": round(lateral_g, 3),
                    "harsh": harsh,
                    "event": event,
                }
                events.append(payload)
                await ws.send_text(json.dumps(payload))

                prev_speed_ms = speed_ms
                prev_ts = ts

            elif msg["type"] == "end_session":
                report = compute_report(events)
                print(f"[telematics] session ended → {report.get('risk_category')} risk, {report.get('harsh_events')} harsh events")
                await ws.send_text(json.dumps(report))
                events.clear()
                prev_speed_ms = 0.0
                prev_ts = None

    except WebSocketDisconnect:
        print("[telematics] client disconnected")
