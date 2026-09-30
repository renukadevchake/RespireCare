from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db

from models import (
    User,
    RespiratoryReading
)

from auth import get_current_user

from connections import can_access_patient

from simulator import (
    SCENARIOS,
    start_simulation,
    stop_simulation,
    get_simulation_state,
    generate_reading
)


router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"]
)


# =========================================================
# REQUEST MODELS
# =========================================================

class SimulationRequest(BaseModel):
    scenario: str


class LiveReadingRequest(BaseModel):
    respiratory_rate: float | None = None
    signal_quality: str
    pattern: str = "NORMAL"
    confidence: float | None = None
    waveform: float | None = None


# =========================================================
# AVAILABLE SIMULATION SCENARIOS
# =========================================================

@router.get("/scenarios")
def get_scenarios():

    scenarios = []

    for key, config in SCENARIOS.items():

        scenarios.append({
            "value": key,
            "label": config["label"],
            "start_rate": config["start_rate"],
            "target_rate": config["target_rate"],
            "start_volume": config["start_volume"],
            "target_volume": config["target_volume"],
            "transition_seconds":
                config["transition_seconds"],
        })

    return {
        "scenarios": scenarios
    }


# =========================================================
# START SIMULATION
# =========================================================

@router.post(
    "/patient/{patient_id}/simulation/start"
)
def start_demo(
    patient_id: int,
    data: SimulationRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    if not can_access_patient(
        current_user,
        patient_id,
        db
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot access this patient"
        )

    scenario = data.scenario.upper()

    if scenario not in SCENARIOS:

        raise HTTPException(
            status_code=400,
            detail="Invalid simulation scenario"
        )

    state = start_simulation(
        patient_id,
        scenario
    )

    return {
        "message": "Simulation started",
        "patient_id": patient_id,
        "scenario": state["scenario"]
    }


# =========================================================
# STOP SIMULATION
# =========================================================

@router.post(
    "/patient/{patient_id}/simulation/stop"
)
def stop_demo(
    patient_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    if not can_access_patient(
        current_user,
        patient_id,
        db
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot access this patient"
        )

    stop_simulation(patient_id)

    return {
        "message": "Simulation stopped"
    }


# =========================================================
# CURRENT MONITORING
# =========================================================

@router.get(
    "/patient/{patient_id}/current"
)
def current_monitoring(
    patient_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    if not can_access_patient(
        current_user,
        patient_id,
        db
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot access this patient"
        )


    # =====================================================
    # DEMO MODE
    # =====================================================

    state = get_simulation_state(
        patient_id
    )

    if state:

        reading = generate_reading(
            patient_id
        )

        return {
            "patient_id": patient_id,
            "mode": "DEMO",
            "status": "MONITORING",
            "scenario": state["scenario"],

            "respiratory_rate":
                reading["respiratory_rate"],

            "simulated_volume":
                reading["simulated_volume"],

            "signal_quality":
                reading["signal_quality"],

            "pattern":
                reading["pattern"],

            "confidence":
                reading["confidence"],

            "waveform":
                reading["waveform"],

            "progress":
                reading["progress"],

            "timestamp":
                datetime.now(
                    timezone.utc
                ).isoformat()
        }


    # =====================================================
    # LIVE MODE
    # =====================================================

    latest = (
        db.query(RespiratoryReading)
        .filter(
            RespiratoryReading.patient_id
            == patient_id
        )
        .order_by(
            RespiratoryReading.id.desc()
        )
        .first()
    )

    if not latest:

        return {
            "patient_id": patient_id,
            "mode": "LIVE",
            "status": "WAITING_FOR_DEVICE",
            "scenario": None,
            "respiratory_rate": None,
            "simulated_volume": None,
            "signal_quality": "UNKNOWN",
            "pattern": "NO_DATA",
            "confidence": None,
            "waveform": None,
            "progress": None,
        }


    return {
        "patient_id": patient_id,
        "mode": "LIVE",
        "status": "MONITORING",

        "scenario": None,

        "respiratory_rate":
            latest.respiratory_rate,

        "simulated_volume": None,

        "signal_quality":
            latest.signal_quality,

        "pattern":
            latest.pattern,

        "confidence":
            latest.confidence,

        "waveform": None,

        "progress": None,

        "timestamp":
            latest.timestamp,
    }


# =========================================================
# LIVE SENSOR INPUT
# =========================================================

@router.post(
    "/patient/{patient_id}/reading"
)
def receive_live_reading(
    patient_id: int,
    data: LiveReadingRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    if (
        current_user.role != "PATIENT"
        or current_user.id != patient_id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "Only this patient's monitoring "
                "source can submit readings"
            )
        )


    reading = RespiratoryReading(
        patient_id=patient_id,
        respiratory_rate=
            data.respiratory_rate,

        signal_quality=
            data.signal_quality,

        pattern=
            data.pattern,

        confidence=
            data.confidence,

        source="LIVE"
    )

    db.add(reading)

    db.commit()

    db.refresh(reading)


    return {
        "message": "Reading received",
        "reading_id": reading.id
    }


# =========================================================
# HISTORY
# =========================================================

@router.get(
    "/patient/{patient_id}/history"
)
def monitoring_history(
    patient_id: int,
    limit: int = 50,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    if not can_access_patient(
        current_user,
        patient_id,
        db
    ):

        raise HTTPException(
            status_code=403,
            detail="You cannot access this patient"
        )


    readings = (
        db.query(RespiratoryReading)
        .filter(
            RespiratoryReading.patient_id
            == patient_id
        )
        .order_by(
            RespiratoryReading.id.desc()
        )
        .limit(
            min(limit, 200)
        )
        .all()
    )


    return [
        {
            "id": reading.id,

            "respiratory_rate":
                reading.respiratory_rate,

            "signal_quality":
                reading.signal_quality,

            "pattern":
                reading.pattern,

            "confidence":
                reading.confidence,

            "source":
                reading.source,

            "timestamp":
                reading.timestamp,
        }

        for reading in readings
    ]