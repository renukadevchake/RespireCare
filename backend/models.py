from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func

from database import Base


# =========================================================
# USERS
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # PATIENT | FAMILY | DOCTOR
    role = Column(String(20), nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# PATIENT ↔ GUARDIAN / DOCTOR CONNECTIONS
# =========================================================

class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    guardian_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # FAMILY | DOCTOR
    connection_type = Column(String(20), nullable=False)

    # PENDING | ACTIVE | REJECTED
    status = Column(String(20), default="PENDING")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# PATIENT PAIRING CODES
# =========================================================

class PairingCode(Base):
    __tablename__ = "pairing_codes"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    code = Column(
        String(20),
        unique=True,
        index=True,
        nullable=False
    )

    is_active = Column(Boolean, default=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# ESP32 / MONITORING DEVICES
# =========================================================

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    device_code = Column(
        String(100),
        unique=True,
        index=True,
        nullable=False
    )

    name = Column(String(100), default="RespiCare ESP32")

    is_online = Column(Boolean, default=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# RESPIRATORY READINGS
# =========================================================

class RespiratoryReading(Base):
    __tablename__ = "respiratory_readings"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    respiratory_rate = Column(Float, nullable=True)

    signal_quality = Column(
        String(30),
        default="UNKNOWN"
    )

    pattern = Column(
        String(50),
        default="UNKNOWN"
    )

    confidence = Column(Float, nullable=True)

    source = Column(
        String(20),
        default="LIVE"
    )

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# ALERTS
# =========================================================

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    alert_type = Column(String(50), nullable=False)

    severity = Column(
        String(20),
        default="WARNING"
    )

    message = Column(Text, nullable=False)

    acknowledged = Column(Boolean, default=False)

    acknowledged_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# PRESCRIPTIONS
# =========================================================

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    doctor_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    medicine_name = Column(String(150), nullable=False)

    dosage = Column(String(100), nullable=False)

    schedule = Column(String(150), nullable=False)

    instructions = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# =========================================================
# MEDICATION LOG
# =========================================================

class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)

    prescription_id = Column(
        Integer,
        ForeignKey("prescriptions.id"),
        nullable=False
    )

    patient_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    taken = Column(Boolean, default=False)

    marked_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )