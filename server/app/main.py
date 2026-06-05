"""
BINAA — API Gateway (Module M8)
FastAPI Application Factory

This is the entry point for the backend server.
It configures:
  - CORS (so the React frontend on port 3000 can connect)
  - Global error handling (clean JSON errors for any exception)
  - Route registration
  - Logging

Run with:
  uvicorn app.main:app --reload --port 8000
"""

import logging
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .routes import router
from .models import ErrorResponse, ErrorDetail


# ──────────────────────────────────────────────
#  LOGGING CONFIGURATION
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("binaa.gateway")


# ──────────────────────────────────────────────
#  APP LIFECYCLE
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 BINAA API Gateway démarré — port 8000")
    logger.info("   En attente de requêtes du frontend...")
    yield
    logger.info("🛑 BINAA API Gateway arrêté")


# ──────────────────────────────────────────────
#  APP FACTORY
# ──────────────────────────────────────────────

app = FastAPI(
    title="BINAA API Gateway",
    description=(
        "Module M8 — Point d'entrée central pour l'application BINAA. "
        "Reçoit les données utilisateur, les valide, et les transmet "
        "aux moteurs de génération (futur)."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",     # ReDoc at /redoc
    lifespan=lifespan,
)


# ──────────────────────────────────────────────
#  CORS — Allow frontend to connect
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # Vite dev server
        "http://localhost:3001",     # Vite fallback port
        "http://localhost:5173",     # Vite default port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
#  GLOBAL ERROR HANDLERS
# ──────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Catches Pydantic validation errors and returns them
    as clean, structured JSON instead of FastAPI's default format.
    
    This makes error messages frontend-friendly.
    """
    errors = []
    for error in exc.errors():
        # Extract field name from the location tuple
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        message = error["msg"]
        
        # Clean up Pydantic's "Value error, " prefix
        if message.startswith("Value error, "):
            message = message[len("Value error, "):]
        
        errors.append(ErrorDetail(field=field, message=message))
    
    logger.warning(f"⚠️  Validation échouée: {len(errors)} erreur(s)")
    for err in errors:
        logger.warning(f"   → {err.field}: {err.message}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            status="error",
            message="Les données envoyées sont invalides. Veuillez vérifier les champs.",
            errors=errors,
        ).model_dump(),
    )


@app.exception_handler(json.JSONDecodeError)
async def json_decode_error_handler(request: Request, exc: json.JSONDecodeError):
    """Handles malformed JSON in request body."""
    logger.error("❌ JSON invalide reçu")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            status="error",
            message="Le corps de la requête n'est pas un JSON valide.",
            errors=[],
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all for unexpected errors — never expose internals to the client."""
    logger.exception(f"💥 Erreur interne inattendue: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            status="error",
            message="Une erreur interne est survenue. Veuillez réessayer.",
            errors=[],
        ).model_dump(),
    )


# ──────────────────────────────────────────────
#  REGISTER ROUTES
# ──────────────────────────────────────────────

app.include_router(router, prefix="/api", tags=["Generation"])

# Also mount at root /generate for direct frontend compatibility
# (the frontend POSTs to http://localhost:8000/generate)
app.include_router(router, tags=["Generation (root)"])
