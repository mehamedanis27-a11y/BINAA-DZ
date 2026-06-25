# BINAA — Complete Project Knowledge Base

> **Version:** 1.0 — June 2026
> **Repository:** [github.com/mehamedanis27-a11y/BINAA-DZ](https://github.com/mehamedanis27-a11y/BINAA-DZ)
> **Status:** Active Development — MVP Phase
> **Primary Language:** French (UI bilingual FR/AR planned)

---

## 1. What is BINAA

BINAA (بناء — Arabic for "construction") is a **rule-based architectural plan generation platform** for the Algerian residential construction market. It takes simple inputs from a non-expert user (land dimensions, family size, budget) and produces:

1. A complete 2D floor plan with rooms, doors, windows, and structural grid
2. A construction cost estimate calibrated to Algerian market prices
3. Material recommendations adapted to local availability and climate
4. An architectural validation report identifying structural or design problems

BINAA targets Algerian individuals and families who want to build a house but lack architectural expertise. The platform encodes Algerian housing conventions, construction norms (RPA 99 v2003 seismic code), cultural expectations (guest reception privacy, multigenerational living), and real market pricing into a deterministic, auditable engine.

### Why BINAA Exists

In Algeria, 80%+ of residential construction is self-built ("auto-construction"). Families buy land, hire a maçon (mason), and build without architectural plans, leading to:

- Structurally unsafe buildings (no seismic compliance)
- Wasted space and poor circulation
- Budget overruns due to lack of cost estimation
- Culturally inappropriate layouts (guest areas mixing with private zones)

BINAA democratizes architectural planning by making professional-grade design accessible through a simple web wizard.

### Core Design Principles

1. **Rule-based first, AI later** — No black-box ML in MVP; deterministic, auditable logic
2. **Algerian-context native** — Prices, materials, room logic, and cultural norms baked into core
3. **Modular & decoupled** — Each engine (plan, cost, materials, validation) is independent
4. **Mobile-first** — Designed for smartphone users on slow Algerian 3G/4G networks
5. **Bilingual** — Arabic (Derja-friendly) + French from day one (FR implemented, AR pending)

---

## 2. Architecture Overview

### Current Architecture (MVP — Implemented)

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (Vite + React 18)          │
│                                                      │
│  WizardForm → API Call → ResultsScreen + PlanViewer  │
│  Port 3000                                           │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP POST /api/v1/generate
                       ▼
┌─────────────────────────────────────────────────────┐
│             BACKEND (FastAPI + Python 3.11+)         │
│             Port 8000                                │
│                                                      │
│  Pipeline: Site → Grid → Plan → Validation → Cost   │
│            → Materials → JSON Response               │
│                                                      │
│  Data: pricing_config.json (file-based, no DB)       │
└─────────────────────────────────────────────────────┘
```

**Key architectural decision:** The MVP uses no database. All data (pricing, wilaya metadata, room specs) is embedded in Python code or a single JSON config file. This keeps deployment trivially simple (two processes: uvicorn + vite).

### Future Architecture (Aspirational)

The `ARCHITECTURE_ROADMAP.md` file describes a future microservices architecture with PostgreSQL, Redis, MinIO, auth (JWT), admin panel, and React Native mobile app. None of this is implemented yet.

---

## 3. Technology Stack

### Backend

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | FastAPI | Single `app.main:app` entry point |
| Language | Python 3.11+ | No NumPy/Shapely — pure Python geometry |
| Validation | Pydantic v2 | Every request/response is typed |
| Server | Uvicorn | `--reload` for development |
| Pricing Data | `pricing_config.json` | File-based, no database |
| Dependencies | `fastapi`, `uvicorn[standard]`, `pydantic`, `python-dotenv` |

### Frontend

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | React 18 | Vite dev server on port 3000 |
| Build Tool | Vite 6 | `npm run dev` / `npm run build` |
| Rendering | HTML5 Canvas API | No SVG, no Konva.js — raw Canvas |
| Styling | Vanilla CSS with CSS Variables | Custom design system in `index.css`, Tailwind CSS v4 |
| Typography | Manrope (headings), IBM Plex Mono (numbers), Plus Jakarta Sans (body), Noto Sans Arabic, Space Grotesk, Syne |
| State | React `useState` | No Zustand/Redux yet, simple state-based routing |
| Package Manager | npm |

### No External Services

The current codebase has **zero external API dependencies**. No OpenAI, no Supabase, no Firebase, no database server. Everything runs locally with two processes.

---

## 4. Project Structure

```
BINAA-DZ/
├── server/                          # Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app factory, CORS, error handlers
│   │   ├── routes.py                # POST /generate endpoint + health/wilayas
│   │   ├── models.py                # ALL Pydantic models (552 lines)
│   │   ├── site_analysis.py         # Wilaya → seismic/climate zone lookup
│   │   ├── structural_grid.py       # Béton armé column grid generation
│   │   ├── plan_engine.py           # CORE: Room placement algorithm (1479 lines)
│   │   ├── validation_engine.py     # 6-layer architectural validation (764 lines)
│   │   ├── cost_engine.py           # Method 01 cost estimation
│   │   └── material_engine.py       # Material recommendations
│   ├── pricing_config.json          # Wilaya-specific construction rates
│   ├── requirements.txt             # Python dependencies
│   ├── test_design_rules.py         # Architectural acceptance tests
│   ├── test_new_engine.py           # Engine debugging/exploration test
│   ├── test_pricing_ac.py           # Cost engine acceptance tests
│   └── test_ac.py                   # Legacy acceptance tests
│
├── src/                             # React frontend
│   ├── main.jsx                     # React entry point
│   ├── App.jsx                      # Root component, screen routing
│   ├── index.css                    # Complete design system (723+ lines)
│   └── components/
│       ├── WizardForm.jsx           # Multi-step input wizard
│       ├── ResultsScreen.jsx        # Results dashboard (560 lines)
│       ├── PlanViewer.jsx           # Canvas 2D plan renderer (749 lines)
│       ├── LandingPage.jsx          # Marketing landing page
│       ├── TopAppBar.jsx            # Fixed top navigation
│       ├── NavSidebar.jsx           # Desktop sidebar navigation
│       ├── BottomTabBar.jsx         # Mobile bottom navigation
│       ├── TrustRow.jsx             # Trust indicators strip
│       └── VisualIcons.jsx          # SVG icon components
│
├── index.html                       # HTML shell
├── package.json                     # npm config
├── vite.config.js                   # Vite configuration
├── postcss.config.js                # Tailwind CSS v4 / PostCSS config
├── .env.example                     # Frontend env template
├── .env.development                 # Dev environment (VITE_API_URL)
├── .gitignore
└── ARCHITECTURE_ROADMAP.md          # Future architecture vision (1158 lines)
```

---

## 5. Backend Pipeline — The Generation Engine

### Pipeline Execution Order

When `POST /api/v1/generate` is called, these modules execute in strict sequence:

```
M0: Feasibility Gate    → Can this project be built at all?
M1: Site Analysis       → Derive seismic zone, climate zone from wilaya
M3: Structural Grid     → Generate column positions (béton armé portique)
M2: Plan Generation     → Place rooms within structural constraints
M7: Validation          → Check 6 layers of architectural quality
M8: Cost Estimation     → Calculate min/max price (Method 01)
M4: Material Engine     → Recommend materials by finish level
```

Each module receives the output of the previous. No module can override constraints set by an earlier module.

### 5.1 Site Analysis (`site_analysis.py`)

**Input:** `GenerateRequest`
**Output:** `SiteAnalysisOutput`

Maps the 2-digit wilaya code to:
- **Wilaya name** (e.g., "31" → "Oran")
- **Seismic zone** (LOW / MEDIUM / HIGH) — based on RPA 99 v2003
- **Climate zone** (COASTAL / HIGHLAND / ARID / SAHARAN)
- **Built areas** (footprint × floors)

Also performs **feasibility gating**:
- Width must be ≥ 4.0m
- Depth must be ≥ 6.0m
- Footprint must be ≥ 40m² (R+0), 60m² (R+1), 80m² (R+2)
- Budget must cover minimum construction cost (based on Oran minimum rate)

If any gate fails → HTTP 422 with French error messages. The plan is never generated.

### 5.2 Structural Grid (`structural_grid.py`)

**Input:** `GenerateRequest` (built_width_m, built_depth_m)
**Output:** `StructuralGridOutput`

Generates a reinforced concrete frame (portique) grid:

```
STANDARD_GRID_SPEC = {
    "column_section_cm": 30,       # 30×30 cm columns
    "preferred_span_m": 4.0,       # Target bay span
    "max_span_m": 4.5,             # Absolute maximum span
    "slab_thickness_cm": 15,       # Standard slab thickness
}
```

The algorithm:
1. Divide width into N bays where each bay ≈ 4.0m
2. Divide depth into M bays similarly
3. Generate evenly-spaced column axis arrays
4. All floors share the same grid (columns must be vertically aligned)

**Example:** 10.5m × 13.0m → 3×4 bays → X axes [0, 3.5, 7.0, 10.5], Y axes [0, 3.25, 6.5, 9.75, 13.0]

### 5.3 Plan Generation Engine (`plan_engine.py`) — THE CORE

This is the intellectual core of BINAA.

#### 5.3.1 Room Specifications (`ROOM_SPECS`)

Every room type has defined constraints:

| Room Type | Area (min/target/max m²) | Zone | Privacy |
|-----------|-------------------------|------|---------|
| vestibule | 4 / 6 / 10 | public | 1 |
| salon_hotes | 16 / 22 / 32 | public | 1 |
| salon_famille | 14 / 20 / 30 | semi-public | 2 |
| cuisine | 10 / 14 / 20 | service | 4 |
| chambre_parents | 14 / 18 / 26 | private | 3 |
| chambre_enfant | 10 / 13 / 18 | private | 3 |
| chambre_grandp | 12 / 14 / 18 | private | 3 |
| sdb_principale | 5 / 7 / 12 | service | 4 |
| sdb_enfants | 4.5 / 6 / 9 | service | 4 |
| wc_invites | 2.0 / 2.5 / 4.0 | service | 4 |
| wc_separe | 1.5 / 2.5 / 4.0 | service | 4 |
| garage | 16 / 20 / 30 | service | 4 |
| escalier | 10 / 13 / 16 | circulation | 5 |
| degagement | 4 / 6 / 10 | circulation | 5 |
| buanderie | 3 / 4.5 / 8 | service | 4 |

#### 5.3.2 Spatial Program Builder (`build_spatial_program()`)

Determines **which rooms** to include on **which floor**, based on family parameters:

**Logic for R+0 (single floor):**
- Always: vestibule, salon_famille, cuisine, wc_separe
- If guest_frequency HIGH/MEDIUM → salon_hotes + wc_invites
- Bedrooms: chambre_parents + extra bedrooms based on family_size
- If generations ≥ 2 → chambre_grandp
- degagement placed before bedrooms for connectivity
- buanderie if family_size ≥ 4 and width ≥ 6.5m

**Logic for R+1 (multi-floor):**
- RDC: Public rooms (vestibule, salon_hotes, garage, escalier, degagement, chambre_grandp)
- R+1: Private rooms (chambre_parents, chambre_enfant × N, sdb_enfants)
- Staircase always placed on RDC when multi-floor

#### 5.3.3 Room Placement Algorithm

The engine uses a **constraint-aware greedy placer** that works within the structural grid:

1. **Build Grid Cells** from the generated structural grid bays.
2. **Sort rooms** by priority (public first, then semi-public, then private) `PLACEMENT_ORDER`.
3. For each room, find **candidate positions** by trying every cell. Each cell maps to one bay.
4. **Score each candidate** using a weighted scoring function (`_score_cell`):
   - Constraints (Returns -999999 if violated): Aspect ratio, exterior wall requirement, garage on street, vestibule on street, cuisine NOT on street. Staircase must align on upper floors.
   - Zone score: penalizes public rooms placed deep, private rooms placed near entrance.
   - Adjacency score: rewards wet rooms adjacent to each other (plumbing stacking), circulation adjacency, bedroom clustering.
   - Size quality score: area fit score.
5. Place room at highest-scoring cell position. (Note: Currently uses a 1-room = 1-bay paradigm where the room is clamped to its area constraints inside the bay).

#### 5.3.4 Door Generation (`_generate_doors()`)

After placement, doors are generated between adjacent rooms:

- Two rooms get a door if they **share a wall** (Manhattan distance 1 in grid) AND their type pair is NOT in `NO_DOOR_PAIRS`
- Door widths: 0.9m standard, 1.0m vestibule, 0.8m WC/SDB
- Main entrance door always on vestibule
- All doors swing clockwise.

**NO_DOOR_PAIRS** (rooms that must NOT have a direct door between them):
- salon_hotes ↔ cuisine, chambre_*, sdb_*, degagement
- chambre_parents ↔ chambre_enfant, chambre_grandp
- chambre_enfant ↔ chambre_enfant
- escalier ↔ any bedroom

#### 5.3.5 Window Generation (`_generate_windows_for_rooms()`)

Windows placed on exterior walls based on room type:
- Bedrooms: 1.2m × 1.2m window, centered
- Salons: 1.5m × 1.2m, dual windows if wall ≥ 4m
- Kitchen: 0.9m × 1.2m
- SDB: 0.6m × 0.6m
- Vestibule: 0.6m × 0.4m (transom)

#### 5.3.6 Circulation Graph (`build_circulation_graph()`)

Builds an adjacency graph (nodes = rooms, edges = doors + staircases) to be used by the Validation engine for reachability checks via BFS.

### 5.4 Validation Engine (`validation_engine.py`)

Six validation layers + Extra connectivity checks, each producing issues with severity scores:

| Severity | Points | Meaning |
|----------|--------|---------|
| CRITICAL | 1000 | Plan cannot be shown — blocks output ("UNBUILDABLE") |
| HIGH | 100 | Serious problem — red warning |
| MEDIUM | 10 | Quality issue — yellow note |
| LOW | 1 | Optimization suggestion — info |

**Status mapping:** Total score → GOOD (0-9) / ACCEPTABLE (10-99) / PROBLEMATIC (100-999) / UNBUILDABLE (1000+)

#### Validation Layers:
1. **Mandatory Rooms**: Missing vestibule/cuisine (CRITICAL). Missing salons (HIGH).
2. **Algerian Cultural**: Vestibule size, Salon hôtes adjacent to bedroom (HIGH), Cuisine adjacent to Salon hôtes (HIGH), Cuisine no window (HIGH), Garage no exterior (CRITICAL).
3. **Dimensions**: Room too narrow/shallow, bad proportions, area < 1.0m² (CRITICAL).
4. **Structural**: Room span > 4.5m + 0.10m (HIGH).
5. **Climate**: Cuisine oriented badly based on climate zone rules (MEDIUM).
6. **Circulation**: Bedroom without door (CRITICAL), Salon hôtes not accessible (HIGH), Staircase missing adjacent bedroom (HIGH).
7. **Connectivity (BFS)**: Bedroom completely unreachable (CRITICAL). Bedroom only reachable through public zones (CRITICAL).
8. **Extras**: Geotechnical risks, finish/budget mismatches.

### 5.5 Cost Engine (`cost_engine.py`)

Uses **Method 01** (all-in rate × total area):

```
total_built_area = built_width × built_depth × (floors + 1)
cost_min = total_built_area × rate_min × (1 + contingency_rate)
cost_max = total_built_area × rate_max × (1 + contingency_rate)
```

**Contingency rate: always 20%** (non-negotiable — Algerian market reality)

Rates are loaded from `pricing_config.json`:

| Wilaya | Rate Min (DA/m²) | Rate Max (DA/m²) |
|--------|-----------------|-----------------|
| 31 (Oran) | 95,000 | 155,000 |
| 16 (Alger) | 120,000 | 183,000 |
| 25 (Constantine) | 90,000 | 148,000 |
| DEFAULT | 85,000 | 140,000 |

Budget evaluation produces status: `comfortable` / `sufficient` / `tight` / `insufficient`.
Cost breakdown is simplified to 3 lines: Structure+Finitions, Imprévus 20%, Total.

### 5.6 Material Engine (`material_engine.py`)

Recommends construction materials based on:
- Finish level (economy / standard / premium)
- Seismic zone (affects structural requirements like column size, longrines)
- Climate zone (affects insulation/waterproofing/glazing)
- Budget status

Returns categorized lists of:
- **Gros œuvres** (structural materials)
- **Finition** (finishing materials)
- **Cost saving tips** in French

---

## 6. Frontend Architecture

### Application Flow

```
LandingPage → WizardForm → [API Call] → ResultsScreen
                                           ├── Cost Summary Cards
                                           ├── Budget Gauge
                                           ├── PlanViewer (Canvas 2D)
                                           ├── Cost Breakdown Table
                                           ├── Material Recommendations
                                           ├── Validation Warnings
                                           └── Share/Export Actions
```

### WizardForm — Multi-Step Input

The wizard collects all `GenerateRequest` fields through a stepped interface:
- **Step 0:** Land dimensions (built_width_m, built_depth_m), location (wilaya selector), slope/soil.
- **Step 1:** Budget amount, budget scope checkboxes.
- **Step 2:** Volume & Structure (floors, roof_type).
- **Step 3:** Family & Privacy (size, generations, guest_frequency, car).
- **Step 4:** Finitions level.
- **Step 5:** Summary & Submit.

Submits to `POST ${VITE_API_URL}/api/v1/generate`. Upon success, replaces itself with `ResultsScreen`.

### PlanViewer — Canvas 2D Renderer

Two rendering modes:
1. **Real coordinates mode** (default): Uses actual `x, y, width, height` from backend.
2. **Bin-packing fallback**: If all rooms have x=0,y=0 → simple grid layout.

Features:
- **Responsive**: scales based on device width/height.
- **Color Coding**: Zone-based colors (public=blue, private=brown, service=gray, circulation=dark).
- **Walls**: Double-line exterior walls, single-line interior walls.
- **Features**: Door swing arcs, window openings, dimension lines, 5m scale bar, North arrow compass.
- **Structural Grid**: Dashed lines + column intersection dots.

### ResultsScreen — Results Dashboard

Displays:
- **Hero Cost Card**: Budget status badge, cost range, budget gauge bar, validation source.
- **Plan Viewer**: Embedded 2D canvas.
- **Warnings Banner**: Red/yellow validation issues.
- **Cost Breakdown**: Structure + Finitions / Imprévus / Total.
- **Material Recommendations**: Economy/Standard/Premium list.
- **RPA 99 Compliance**: Seismic and climate requirements.
- **Actions Panel**: WhatsApp share (generates a canvas image snapshot).

### Design System (`index.css`)

Custom CSS variables + Tailwind CSS v4 token integration.

```css
--navy: #002645          /* Primary brand color */
--orange: #E8622A        /* Accent/CTA color */
--bg-base: #0B1622       /* Dark background */
--bg-surface: #0F1117    /* Card surfaces */
--text-primary: #E3E2E8  /* Primary text */
--success: #2DC653       /* Green status */
--warning: #E9C46A       /* Yellow status */
--danger: #E63946        /* Red status */
```

**Typography:** Uses Google Fonts. Headings in Manrope, body in Plus Jakarta Sans, numbers in IBM Plex Mono. Arabic in Noto Sans Arabic.

---

## 7. Data Models (Pydantic)

### Request

**`GenerateRequest`** — All user inputs:
- `built_width_m`, `built_depth_m` (emprise sans retraits, min 4.0/6.0)
- `wilaya` (code 01-58)
- `family_size` (1-20), `generations` (1-3)
- `has_car` (bool), `guest_frequency` (NEVER/LOW/MEDIUM/HIGH)
- `floors` (0-2)
- `budget` (DZD)
- `slope_category`, `soil_category`, `roof_type`, `finish_level`
- `independent_generations`
- `vrd_*` infrastructure booleans

### Response

**`GenerateResponse`** wraps `GenerateResponseData`:
- `site_analysis` (SiteAnalysisOutput)
- `structural_grid` (StructuralGridOutput)
- `summary` (PlanSummary)
- `floors[]` (FloorOutput[] containing RoomOutput[], DoorOutput[], WindowOutput[])
- `validation` (ValidationReport)
- `cost_estimate` (CostEstimateOutput)
- `material_recommendations` (MaterialRecommendationOutput)
- `warnings[]`

---

## 8. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/generate` | Main generation pipeline |
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/wilayas` | List all 58 wilayas with metadata |
| GET | `/api/v1/admin/reload-pricing` | Hot-reload pricing_config.json |

---

## 9. Algerian Domain Knowledge

### Wilaya System

Algeria has 58 wilayas (provinces), each identified by a 2-digit code (01-58). The system maps each wilaya to a seismic zone, a climate zone, and a construction pricing tier.

### Seismic Zones (RPA 99 v2003)

| Zone | Risk | Wilayas (examples) |
|------|------|-------------------|
| HIGH | Major earthquake risk | 16 (Alger), 06 (Béjaïa), 09 (Blida), 42 (Tipaza) |
| MEDIUM | Moderate risk | 31 (Oran), 25 (Constantine), 19 (Sétif) |
| LOW | Low risk | 01 (Adrar), 07 (Biskra), 30 (Ouargla), 47 (Ghardaïa) |

The structural grid currently uses a single standard spec (30×30cm columns) regardless of zone, but material recommendations suggest 35×35cm columns in HIGH zones.

### Climate Zones

| Zone | Characteristics | Orientation Rules |
|------|----------------|-------------------|
| COASTAL | Hot summers, mild winters, humidity | Avoid W-facing kitchens (surchauffe) |
| HIGHLAND | Cold winters, hot summers | Prefer S/E-facing living rooms |
| ARID | Extreme heat, dry | Avoid W and S for habitable rooms |
| SAHARAN | Desert, extreme temperatures | Avoid W and S, prefer N and E |

### Cultural Housing Rules

1. **Privacy gradient**: Public zones (salon_hotes) near entrance, private zones (bedrooms) furthest from entrance
2. **Guest isolation**: Guests should NEVER see private areas or pass through them (enforced via BFS connectivity checks).
3. **Kitchen visibility**: Kitchen must NOT be visible from the main entrance (street-facing).
4. **Wet room clustering**: Kitchen, SDB, and WC should share plumbing walls when possible.

### Construction Terminology

| French | Arabic | English | Notes |
|--------|--------|---------|-------|
| RDC (Rez-de-chaussée) | الطابق الأرضي | Ground floor | Floor number 0 |
| R+1, R+2 | الطابق الأول، الثاني | 1st, 2nd floor | |
| Emprise | مساحة البناء | Building footprint | Width × Depth |
| Salon invités (Majlis) | صالون الضيوف | Guest reception room | Culturally important |
| Séjour familial | غرفة المعيشة | Family living room | Private family space |
| Dégagement | ممر | Hallway/corridor | Circulation space |
| Vestibule | مدخل | Entry hall | Transition from exterior |
| Portique | هيكل | Frame structure | Column-beam system |
| Gros œuvre | أشغال كبرى | Structural work | Foundation + frame |
| Second œuvre | أشغال ثانوية | Finishing work | Interior fit-out |
| VRD | شبكات | Utilities/Infrastructure | Water, elec, gas, sewage |

---

## 10. Testing Strategy

### Design Rules Acceptance Tests (`test_design_rules.py`)

- **R+0 Validation Test**: Validates single-floor output achieves GOOD or ACCEPTABLE status.
- **Multi-Generation R+1 Test**: 10 statistical iterations testing bedroom accessibility (100%), wet adjacency (≥60%), bedroom clustering (≥70%), staircase placement, and window existence.

### Pricing Acceptance Tests (`test_pricing_ac.py`)

Tests the cost engine with various wilaya/floor/budget combinations.

---

## 11. Known Limitations & Technical Debt

1. **Greedy Single-Cell Placement**: The current algorithm uses a 1-room = 1-bay paradigm where the room is clamped to its area constraints inside a single structural bay. It does not intelligently merge bays for large rooms, leading to restrictive dimensions and uniform grid-like outputs.
2. **Hardcoded Orientation**: The engine assumes the street is always North (bay_y=0). No user control.
3. **No Database/Auth**: Stateless execution.
4. **Pricing configuration**: JSON file is in `.gitignore`, must be manually provided in deployments.

---

## 12. Development Workflow

```bash
# Terminal 1: Backend
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
npm install
npm run dev
```

**Configuration:**
- Frontend API URL: `VITE_API_URL` in `.env.development`
- Backend CORS: `CORS_ORIGINS` in `.env`
- Pricing: Edit `server/pricing_config.json`

---

## 13. Key Design Decisions

- **Rule-Based over AI for MVP**: Ensures auditable, deterministic outputs and embeds specific Algerian domain knowledge.
- **"Emprise" instead of "Terrain"**: By asking for the exact buildable footprint directly, the app avoids complex setback rule calculations that vary by municipality.
- **1-Room = 1-Bay**: An early algorithm simplification that caused the "grid-driven architecture" bug. (A major goal for Phase 1b/1c redesign).
- **No React Router / Redux**: Frontend relies purely on React state to simplify MVP logic.
- **20% Contingency (Imprévus)**: An absolute mandate in the Algerian market context, hardcoded into cost estimations.

---

**End of Document**
