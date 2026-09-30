from datetime import datetime, timezone, date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db

from models import (
    User,
    Connection,
    Prescription,
    MedicationLog,
)

from auth import (
    get_current_user,
    require_role,
)

from connections import can_access_patient


router = APIRouter(
    prefix="/medications",
    tags=["Medications"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class PrescriptionCreate(BaseModel):
    patient_id: int
    medicine_name: str
    dosage: str
    schedule: str
    instructions: str = ""


class MedicationTakenRequest(BaseModel):
    prescription_id: int
    taken: bool


# =========================================================
# HELPER
# =========================================================

def doctor_connected_to_patient(
    doctor_id: int,
    patient_id: int,
    db: Session,
):

    connection = (
        db.query(Connection)
        .filter(
            Connection.patient_id == patient_id,
            Connection.guardian_id == doctor_id,
            Connection.connection_type == "DOCTOR",
            Connection.status == "ACTIVE",
        )
        .first()
    )

    return connection is not None


# =========================================================
# CREATE PRESCRIPTION
# DOCTOR ONLY
# =========================================================

@router.post("/prescriptions")
def create_prescription(
    data: PrescriptionCreate,

    current_user: User = Depends(
        require_role("DOCTOR")
    ),

    db: Session = Depends(get_db),
):

    patient = (
        db.query(User)
        .filter(
            User.id == data.patient_id,
            User.role == "PATIENT",
        )
        .first()
    )

    if not patient:

        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )


    if not doctor_connected_to_patient(
        current_user.id,
        patient.id,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only prescribe medication "
                "to connected patients"
            ),
        )


    medicine_name = (
        data.medicine_name.strip()
    )

    dosage = data.dosage.strip()

    schedule = data.schedule.strip()

    instructions = (
        data.instructions.strip()
    )


    if len(medicine_name) < 2:

        raise HTTPException(
            status_code=400,
            detail="Enter a valid medicine name",
        )


    if not dosage:

        raise HTTPException(
            status_code=400,
            detail="Dosage is required",
        )


    if not schedule:

        raise HTTPException(
            status_code=400,
            detail="Medication schedule is required",
        )


    prescription = Prescription(
        patient_id=patient.id,
        doctor_id=current_user.id,
        medicine_name=medicine_name,
        dosage=dosage,
        schedule=schedule,
        instructions=instructions,
        is_active=True,
    )


    db.add(prescription)

    db.commit()

    db.refresh(prescription)


    return {
        "message": "Prescription created",
        "prescription": serialize_prescription(
            prescription,
            db,
        ),
    }


# =========================================================
# GET PATIENT MEDICATIONS
#
# PATIENT:
#   own medicines
#
# FAMILY:
#   connected patient's medicines
#
# DOCTOR:
#   connected patient's medicines
# =========================================================

@router.get("/patient/{patient_id}")
def get_patient_medications(
    patient_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    if not can_access_patient(
        current_user,
        patient_id,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access this patient's "
                "medications"
            ),
        )


    prescriptions = (
        db.query(Prescription)
        .filter(
            Prescription.patient_id
            == patient_id,

            Prescription.is_active
            == True,
        )
        .order_by(
            Prescription.id.desc()
        )
        .all()
    )


    return [
        serialize_prescription(
            prescription,
            db,
        )

        for prescription
        in prescriptions
    ]


# =========================================================
# MARK TAKEN / NOT TAKEN
#
# PATIENT + FAMILY
#
# Doctors can view adherence,
# but do not tick medication for patient.
# =========================================================

@router.post("/taken")
def mark_medication_taken(
    data: MedicationTakenRequest,

    current_user: User = Depends(
        require_role(
            "PATIENT",
            "FAMILY",
        )
    ),

    db: Session = Depends(get_db),
):

    prescription = (
        db.query(Prescription)
        .filter(
            Prescription.id
            == data.prescription_id,

            Prescription.is_active
            == True,
        )
        .first()
    )


    if not prescription:

        raise HTTPException(
            status_code=404,
            detail="Prescription not found",
        )


    patient_id = (
        prescription.patient_id
    )


    if not can_access_patient(
        current_user,
        patient_id,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot update this patient's "
                "medication"
            ),
        )


    today = date.today()


    # Find today's latest log for this medicine.
    #
    # MVP:
    # one completion state per prescription per day.
    #
    # Later we can expand this into separate
    # morning / afternoon / evening dose instances.

    logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.prescription_id
            == prescription.id,

            MedicationLog.patient_id
            == patient_id,
        )
        .order_by(
            MedicationLog.id.desc()
        )
        .all()
    )


    today_log = None


    for log in logs:

        log_date = (
            log.timestamp.date()
            if log.timestamp
            else None
        )

        if log_date == today:

            today_log = log

            break


    if today_log:

        today_log.taken = data.taken

        today_log.marked_by = (
            current_user.id
        )

        today_log.timestamp = (
            datetime.now(
                timezone.utc
            )
        )

    else:

        today_log = MedicationLog(
            prescription_id=
                prescription.id,

            patient_id=
                patient_id,

            taken=
                data.taken,

            marked_by=
                current_user.id,

            timestamp=
                datetime.now(
                    timezone.utc
                ),
        )


        db.add(today_log)


    db.commit()

    db.refresh(today_log)


    return {
        "message":
            "Medication status updated",

        "prescription_id":
            prescription.id,

        "taken":
            today_log.taken,

        "marked_by":
            current_user.id,

        "marked_by_name":
            current_user.name,

        "timestamp":
            today_log.timestamp,
    }


# =========================================================
# DEACTIVATE PRESCRIPTION
# DOCTOR ONLY
# =========================================================

@router.delete(
    "/prescriptions/{prescription_id}"
)
def deactivate_prescription(
    prescription_id: int,

    current_user: User = Depends(
        require_role("DOCTOR")
    ),

    db: Session = Depends(get_db),
):

    prescription = (
        db.query(Prescription)
        .filter(
            Prescription.id
            == prescription_id,

            Prescription.is_active
            == True,
        )
        .first()
    )


    if not prescription:

        raise HTTPException(
            status_code=404,
            detail="Prescription not found",
        )


    if prescription.doctor_id != (
        current_user.id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "Only the prescribing doctor "
                "can remove this prescription"
            ),
        )


    prescription.is_active = False

    db.commit()


    return {
        "message":
            "Prescription deactivated"
    }


# =========================================================
# SERIALIZER
# =========================================================

def serialize_prescription(
    prescription: Prescription,
    db: Session,
):

    doctor = (
        db.query(User)
        .filter(
            User.id
            == prescription.doctor_id
        )
        .first()
    )


    logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.prescription_id
            == prescription.id
        )
        .order_by(
            MedicationLog.id.desc()
        )
        .all()
    )


    today = date.today()

    today_log = None


    for log in logs:

        if (
            log.timestamp
            and
            log.timestamp.date()
            == today
        ):

            today_log = log

            break


    marked_by_user = None


    if (
        today_log
        and
        today_log.marked_by
    ):

        marked_by_user = (
            db.query(User)
            .filter(
                User.id
                == today_log.marked_by
            )
            .first()
        )


    return {
        "id":
            prescription.id,

        "patient_id":
            prescription.patient_id,

        "doctor_id":
            prescription.doctor_id,

        "doctor_name":
            doctor.name
            if doctor
            else "Doctor",

        "medicine_name":
            prescription.medicine_name,

        "dosage":
            prescription.dosage,

        "schedule":
            prescription.schedule,

        "instructions":
            prescription.instructions,

        "is_active":
            prescription.is_active,

        "created_at":
            prescription.created_at,

        "today": {
            "taken":
                today_log.taken
                if today_log
                else False,

            "marked_by":
                marked_by_user.name
                if marked_by_user
                else None,

            "timestamp":
                today_log.timestamp
                if today_log
                else None,
        },
    }