# BINAA — Architecture v2.0

## Actual Technology Stack

### Backend
- Runtime: Python 3.11+
- Framework: FastAPI 0.115.6
- Validation: Pydantic 2.10.4
- ASGI server: Uvicorn 0.34.0
- Database: None — fully stateless
- Cache: None

### Frontend
- Framework: React 18.3 + Vite 6
- Styling: Tailwind CSS v4
- State management: React useState / useCallback (no external store)
- Plan rendering: HTML Canvas 2D API
- Language: JSX (not TypeScript)

### Infrastructure
- No database
- No file storage
- No authentication
- No Redis or cache layer
- CORS origins configurable via CORS_ORIGINS environment variable

## Backend Modules

| File | Role |
|------|------|
| main.py | FastAPI app factory, CORS, global error handlers |
| models.py | All Pydantic models: GenerateRequest, GenerateResponseData, all output types |
| routes.py | 8-step pipeline orchestration: POST /api/generate, GET /api/health, GET /api/wilayas |
| site_analysis.py | M1 — setbacks, seismic zone, climate zone, solar orientation |
| structural_grid.py | M3 — column sizing, span validation, slab thickness |
| plan_engine.py | M2 — spatial programme, room placement, Algerian cultural rules |
| cost_engine.py | M8 — 58-wilaya cost rates, seismic surcharge, breakdown lines |
| material_engine.py | M4 — material packages by budget tier, seismic/climate requirements |
| validation_engine.py | M7 — 6-layer validation: mandatory rooms, cultural, dimensions, structure, climate, circulation |

## Frontend Components

| File | Role |
|------|------|
| Wizard.jsx | 5-step input form, API call, state management |
| ResultsScreen.jsx | Full results display: plan viewer, cost breakdown, materials |
| PlanViewer.jsx | Canvas 2D floor plan renderer |

## API

Single endpoint: `POST /api/generate`

The frontend must call `/api/generate`. The path `/generate` (no prefix) is not active.
