import math
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

ANOMALY_Z_THRESHOLD = 2.5
FAIR_COIN_P = 0.5


class StatsRequest(BaseModel):
    counts: list[int]
    rows: int


class BinStat(BaseModel):
    bin: int
    count: int
    freq: float
    z: float
    expected_freq: float


class Anomaly(BaseModel):
    bin: int
    z: float


class TheoreticalBin(BaseModel):
    bin: int
    freq: float


class StatsResponse(BaseModel):
    total: int
    mean: float
    variance: float
    std_dev: float
    bins: list[BinStat]
    anomalies: list[Anomaly]
    theoretical: list[TheoreticalBin]


def _theoretical_distribution(rows: int) -> list[float]:
    return [math.comb(rows, k) * FAIR_COIN_P ** rows for k in range(rows + 1)]


@router.post("/api/galton/stats", response_model=StatsResponse)
def galton_stats(req: StatsRequest):
    counts = req.counts
    rows = req.rows

    total = sum(counts)

    if total == 0:
        return StatsResponse(
            total=0,
            mean=0,
            variance=0,
            std_dev=0,
            bins=[],
            anomalies=[],
            theoretical=[TheoreticalBin(bin=k, freq=f) for k, f in enumerate(_theoretical_distribution(rows))],
        )

    mean = sum(i * c for i, c in enumerate(counts)) / total
    variance = sum(c * (i - mean) ** 2 for i, c in enumerate(counts)) / total
    std_dev = math.sqrt(variance)

    theoretical_freqs = _theoretical_distribution(rows)

    bins: list[BinStat] = []
    anomalies: list[Anomaly] = []

    for i, count in enumerate(counts):
        freq = count / total
        z = (i - mean) / std_dev if std_dev > 0 else 0.0
        expected_freq = theoretical_freqs[i] if i < len(theoretical_freqs) else 0.0

        bins.append(BinStat(
            bin=i,
            count=count,
            freq=round(freq, 3),
            z=round(z, 2),
            expected_freq=round(expected_freq, 3),
        ))

        if abs(z) >= ANOMALY_Z_THRESHOLD:
            anomalies.append(Anomaly(bin=i, z=round(z, 2)))

    theoretical = [
        TheoreticalBin(bin=k, freq=round(f, 3))
        for k, f in enumerate(theoretical_freqs)
    ]

    return StatsResponse(
        total=total,
        mean=round(mean, 2),
        variance=round(variance, 2),
        std_dev=round(std_dev, 2),
        bins=bins,
        anomalies=anomalies,
        theoretical=theoretical,
    )
