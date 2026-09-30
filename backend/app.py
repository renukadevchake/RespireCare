from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import Base, engine
import models

from auth import router as auth_router
from connections import router as connections_router
from monitoring import router as monitoring_router
from medications import router as medications_router

load_dotenv()


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="RespiCare API",
    description="Backend API for the RespiCare respiratory monitoring platform.",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(monitoring_router)
app.include_router(medications_router)
# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def root():
    return {
        "message": "RespiCare API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": "RespiCare",
        "version": "1.0.0"
    }