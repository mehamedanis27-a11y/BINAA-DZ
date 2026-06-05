# BINAA — Complete System Architecture

> **Version:** 1.0 — Initial Architecture Design
> **Date:** April 15, 2026
> **Author:** CTO / Lead Architect
> **Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Module Breakdown](#4-module-breakdown)
5. [Data Structure & Database Schema](#5-data-structure--database-schema)
6. [Plan Generation Logic](#6-plan-generation-logic)
7. [Cost Estimation System](#7-cost-estimation-system)
8. [3D Visualization Strategy](#8-3d-visualization-strategy)
9. [Architecture Diagram](#9-architecture-diagram)
10. [Development Roadmap](#10-development-roadmap)
11. [Folder Structure](#11-folder-structure)

---

## 1. Executive Summary

BINAA is a mobile-first web application targeting Algerian individuals who want to build houses but lack architectural expertise. The platform generates realistic 2D house plans, simple 3D massing views, cost estimations, and material suggestions — all based on Algerian housing logic, local construction norms, and real market prices.

**Key Design Principles:**
- **Rule-based first, AI later** — No black-box ML in MVP; deterministic, auditable logic
- **Algerian-context native** — Prices, materials, room logic, and cultural norms are baked into the core
- **Modular & decoupled** — Each engine (plan, cost, materials, 3D) is an independent module
- **Mobile-first** — 80%+ of Algerian users will access via smartphone
- **Bilingual** — Arabic (Derja-friendly) + French from day one

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  Mobile App  │   │   Web App    │   │  Admin Panel │  │
│  │ React Native │   │   Next.js    │   │   Next.js    │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                   │          │
└─────────┼──────────────────┼───────────────────┼──────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                      API GATEWAY                        │
│                   (Node.js / Express)                    │
│          REST API + Auth + Rate Limiting                 │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Plan Gen   │ │  Cost Est.   │ │  Material    │
│   Engine     │ │  Engine      │ │  Engine      │
│  (Python)    │ │  (Python)    │ │  (Node.js)   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │ PostgreSQL  │   │    Redis     │   │ File Storage │  │
│  │ (Primary DB)│   │   (Cache)    │   │  (S3/Minio)  │  │
│  └─────────────┘   └─────────────┘   └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Architecture Style:** Modular Monolith (MVP) → Microservices (Scale)

> [!IMPORTANT]
> We start as a **modular monolith** — all services in one deployable unit, but with strict module boundaries. This avoids premature infrastructure complexity while keeping a clean migration path to microservices.

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Web App** | Next.js 14 (App Router) | SSR for SEO, fast initial load on slow Algerian networks, React ecosystem |
| **Mobile App** | React Native (Expo) | Code sharing with web, large community, Expo simplifies deployment |
| **UI Library** | Custom design system + Shadcn/ui | Lightweight, themeable, Arabic/RTL support |
| **State** | Zustand | Simple, performant, no boilerplate |
| **2D Rendering** | HTML Canvas + Konva.js | Lightweight 2D plan drawing, pan/zoom, export |
| **3D Rendering** | Three.js (via React Three Fiber) | Simple 3D massing, no heavy game engine needed |
| **i18n** | next-intl | Arabic + French, RTL layout support |

### Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **API Server** | Node.js + Express | JavaScript consistency, fast I/O, large ecosystem |
| **Plan Generation** | Python (FastAPI microservice) | Superior for geometry/math, NumPy/Shapely for spatial logic |
| **Auth** | JWT + bcrypt | Stateless auth, mobile-friendly |
| **Validation** | Zod (Node) / Pydantic (Python) | Runtime type safety on both ends |

### Data

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Primary DB** | PostgreSQL 16 | Relational integrity, JSON support for flexible plan data, mature |
| **Cache** | Redis | Session cache, rate limiting, frequently accessed material prices |
| **File Storage** | MinIO (self-hosted S3) | Store generated plan images, 3D exports, user uploads |
| **ORM** | Prisma (Node) / SQLAlchemy (Python) | Type-safe queries, migrations |

### Infrastructure (MVP)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Hosting** | VPS (Hetzner / DigitalOcean) | Cost-effective for MVP, close-to-Africa servers |
| **Containerization** | Docker + Docker Compose | Reproducible environments, easy onboarding |
| **CI/CD** | GitHub Actions | Free tier sufficient for MVP |
| **Monitoring** | Sentry + basic logging | Error tracking from day one |

---

## 4. Module Breakdown

### Module Map

```
BINAA System
├── M1: User Input Module
├── M2: Plan Generation Engine
├── M3: Cost Estimation Engine
├── M4: Material Database & Engine
├── M5: 2D Visualization Module
├── M6: 3D Visualization Module
├── M7: Project Management Module
├── M8: API Gateway
├── M9: Auth & User Module
└── M10: Admin Module
```

---

### M1: User Input Module

**Responsibility:** Collect, validate, and structure user requirements into a generation request.

**Location:** Frontend (React components) + Backend validation

| | Details |
|---|---|
| **Inputs** | Land dimensions (width × depth in meters), budget range (DZD), family members count, number of generations, building type (R+0, R+1, R+2), preferred style, garage (yes/no), number of bathrooms, guest reception preference |
| **Outputs** | Validated `GenerationRequest` object sent to API |
| **Key Logic** | Multi-step wizard UI, real-time validation, sensible defaults for Algerian context |

**Wizard Steps:**
1. Land info (dimensions, orientation)
2. Family info (members, generations, lifestyle)
3. Building type (floors, garage, terrace)
4. Budget range (slider with DZD presets)
5. Preferences (style, priorities)

---

### M2: Plan Generation Engine

**Responsibility:** Generate valid floor plans based on user inputs, Algerian housing rules, and spatial logic.

**Location:** Python microservice (FastAPI)

| | Details |
|---|---|
| **Inputs** | `GenerationRequest` (land size, rooms needed, constraints, building type) |
| **Outputs** | `PlanResult` — room layout with positions, dimensions, labels, circulation paths, metadata |
| **Key Logic** | Rule-based zoning → room placement → corridor routing → validation |

> [!NOTE]
> This is the **core intellectual property** of BINAA. See [Section 6](#6-plan-generation-logic) for detailed logic.

---

### M3: Cost Estimation Engine

**Responsibility:** Calculate construction cost ranges based on plan output, building type, and Algerian market prices.

**Location:** Python (shared service with Plan Engine) or Node.js

| | Details |
|---|---|
| **Inputs** | `PlanResult` (total area, floor count, room types), finish level (economic / standard / premium) |
| **Outputs** | `CostEstimate` — total range (min–max DZD), per-category breakdown, per-m² rate |
| **Key Logic** | Cost matrix lookup, multipliers for floors/finishes, regional adjustments |

> See [Section 7](#7-cost-estimation-system) for detailed logic.

---

### M4: Material Database & Engine

**Responsibility:** Maintain a database of locally available construction materials and suggest appropriate ones per project.

**Location:** Node.js service + PostgreSQL

| | Details |
|---|---|
| **Inputs** | `PlanResult` + `CostEstimate` + finish level + region (wilaya) |
| **Outputs** | `MaterialSuggestions` — categorized list of materials with local names, brands, price ranges, availability |
| **Key Logic** | Category-based filtering, regional availability, price-tier matching |

**Material Categories:**
- Structure (cement, steel rebar, aggregate, bricks)
- Walls (hollow bricks, AAC blocks, partition blocks)
- Roofing (concrete slab, tiles, waterproofing)
- Plumbing (pipes, fixtures, water heater)
- Electrical (wiring, panels, fixtures)
- Finishing (tiles, paint, doors, windows)
- External (fence, gate, landscaping)

---

### M5: 2D Visualization Module

**Responsibility:** Render the generated plan as an interactive 2D floor plan that users can view, annotate (basic), and export.

**Location:** Frontend (Canvas-based)

| | Details |
|---|---|
| **Inputs** | `PlanResult` (room polygons, labels, dimensions) |
| **Outputs** | Interactive canvas rendering, PNG/PDF export |
| **Key Logic** | Scale-to-fit, color-coded zones, dimension lines, room labels in Arabic/French |

**Features:**
- Pan and zoom
- Color-coded zones (public = blue tones, private = warm tones, wet = cyan, circulation = gray)
- Dimension labels (meters)
- Floor selector (for R+1, R+2)
- Export to PNG / PDF
- Compass indicator (orientation)

---

### M6: 3D Visualization Module

**Responsibility:** Generate a simple 3D massing/block model from the 2D plan for spatial understanding.

**Location:** Frontend (Three.js / React Three Fiber)

| | Details |
|---|---|
| **Inputs** | `PlanResult` (room polygons + floor heights) |
| **Outputs** | Interactive 3D viewport, screenshot export |
| **Key Logic** | Extrude 2D polygons to 3D blocks, assign colors per zone, orbit camera |

> [!TIP]
> This is NOT a photorealistic render. It's a **massing model** — colored blocks showing volume, proportions, and spatial relationships. This is achievable without heavy GPU resources.

---

### M7: Project Management Module

**Responsibility:** Allow users to save, name, compare, and revisit their generated projects.

**Location:** Backend (Node.js) + Frontend

| | Details |
|---|---|
| **Inputs** | User actions (save, load, compare, delete) |
| **Outputs** | Project CRUD operations, comparison views |
| **Key Logic** | Project versioning, side-by-side comparison of up to 3 plans |

---

### M8: API Gateway

**Responsibility:** Route all client requests, enforce authentication, rate limiting, and input validation.

**Location:** Node.js / Express

| | Details |
|---|---|
| **Inputs** | HTTP requests from clients |
| **Outputs** | Routed responses from internal modules |
| **Key Logic** | JWT validation, rate limiting (per IP + per user), request logging, error normalization |

**Key Endpoints:**

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

POST   /api/generate/plan          → M2
POST   /api/generate/cost          → M3
POST   /api/generate/materials     → M4

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
DELETE /api/projects/:id

GET    /api/materials/categories
GET    /api/materials/search

GET    /api/admin/stats             → M10
PUT    /api/admin/materials/:id     → M10
```

---

### M9: Auth & User Module

**Responsibility:** User registration, login, profile management, and session handling.

**Location:** Backend (Node.js)

| | Details |
|---|---|
| **Inputs** | Credentials, profile data |
| **Outputs** | JWT tokens, user profile |
| **Key Logic** | Email/phone registration, bcrypt hashing, JWT with refresh tokens, guest mode for trial |

**Guest Mode:** Users can generate 1 plan without registration. Results are stored in `localStorage` and migrated to account on signup.

---

### M10: Admin Module

**Responsibility:** Back-office for managing material prices, viewing analytics, and moderating content.

**Location:** Separate Next.js admin panel

| | Details |
|---|---|
| **Inputs** | Admin actions |
| **Outputs** | Dashboard views, CRUD on materials/prices |
| **Key Logic** | Material price updates, usage analytics, user management |

---

## 5. Data Structure & Database Schema

### Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│   User   │────<│  Project   │────<│   PlanResult │
└──────────┘     └───────────┘     └──────────────┘
                      │                    │
                      │               ┌────┴─────┐
                      │               │  Room[]   │
                      │               └──────────┘
                      │
                 ┌────┴──────┐     ┌──────────────┐
                 │CostEstimate│    │   Material   │
                 └────┬──────┘     └──────┬───────┘
                      │                   │
                 ┌────┴──────┐     ┌──────┴───────┐
                 │CostItem[] │     │MaterialPrice │
                 └───────────┘     │  (by wilaya) │
                                   └──────────────┘
```

### Core Tables

#### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    wilaya          VARCHAR(50),        -- Algerian province
    preferred_lang  VARCHAR(2) DEFAULT 'ar',  -- 'ar' | 'fr'
    is_guest        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `projects`

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft',  -- draft | generated | saved
    -- Input Parameters (stored for regeneration)
    land_width      DECIMAL(6,2) NOT NULL,   -- meters
    land_depth      DECIMAL(6,2) NOT NULL,   -- meters
    land_area       DECIMAL(8,2) GENERATED ALWAYS AS (land_width * land_depth) STORED,
    budget_min      BIGINT,                  -- DZD
    budget_max      BIGINT,                  -- DZD
    family_members  INTEGER NOT NULL,
    generations     INTEGER DEFAULT 1,       -- 1 = nuclear, 2 = parents, 3 = grandparents
    building_type   VARCHAR(10) NOT NULL,    -- 'R+0', 'R+1', 'R+2', 'R+3'
    has_garage      BOOLEAN DEFAULT false,
    has_terrace     BOOLEAN DEFAULT true,
    finish_level    VARCHAR(20) DEFAULT 'standard', -- economic | standard | premium
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `plan_results`

```sql
CREATE TABLE plan_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    version         INTEGER DEFAULT 1,
    floor_number    INTEGER NOT NULL,        -- 0 = RDC, 1 = 1st floor, etc.
    plan_data       JSONB NOT NULL,          -- Full room layout (polygons, positions)
    total_area      DECIMAL(8,2),            -- m² built area for this floor
    coverage_ratio  DECIMAL(4,2),            -- % of land covered
    thumbnail_url   VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**`plan_data` JSONB Structure:**

```json
{
  "rooms": [
    {
      "id": "room_1",
      "type": "salon",
      "zone": "public",
      "x": 0.5,
      "y": 0.5,
      "width": 5.0,
      "height": 4.0,
      "label_ar": "صالون",
      "label_fr": "Salon",
      "area": 20.0,
      "floor": 0
    }
  ],
  "walls": [
    { "x1": 0, "y1": 0, "x2": 12, "y2": 0, "type": "exterior" }
  ],
  "doors": [
    { "room_from": "room_1", "room_to": "corridor_1", "x": 5.5, "y": 4.5, "width": 0.9 }
  ],
  "circulation": [
    { "id": "corridor_1", "type": "corridor", "points": [...] }
  ],
  "stairs": {
    "x": 8.0, "y": 1.0, "width": 1.2, "length": 3.0, "direction": "up"
  },
  "metadata": {
    "orientation": "north",
    "entrance_side": "south",
    "setbacks": { "front": 3, "back": 3, "left": 1.5, "right": 1.5 }
  }
}
```

#### `cost_estimates`

```sql
CREATE TABLE cost_estimates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    total_min       BIGINT NOT NULL,         -- DZD
    total_max       BIGINT NOT NULL,         -- DZD
    cost_per_m2_min INTEGER,
    cost_per_m2_max INTEGER,
    finish_level    VARCHAR(20),
    breakdown       JSONB NOT NULL,          -- Per-category costs
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**`breakdown` JSONB Structure:**

```json
{
  "categories": [
    {
      "name": "structure",
      "label_ar": "الهيكل",
      "label_fr": "Structure",
      "min": 3500000,
      "max": 4200000,
      "percentage": 35
    },
    {
      "name": "finishing",
      "label_ar": "التشطيب",
      "label_fr": "Finition",
      "min": 2000000,
      "max": 3000000,
      "percentage": 25
    }
  ]
}
```

#### `materials`

```sql
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(50) NOT NULL,    -- structure, walls, finishing, etc.
    subcategory     VARCHAR(50),
    name_ar         VARCHAR(100) NOT NULL,
    name_fr         VARCHAR(100) NOT NULL,
    unit            VARCHAR(20) NOT NULL,    -- m², kg, unit, m³, ml
    description_ar  TEXT,
    description_fr  TEXT,
    image_url       VARCHAR(500),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `material_prices`

```sql
CREATE TABLE material_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID REFERENCES materials(id) ON DELETE CASCADE,
    wilaya          VARCHAR(50),             -- NULL = national average
    price_min       INTEGER NOT NULL,        -- DZD per unit
    price_max       INTEGER NOT NULL,
    price_tier      VARCHAR(20) DEFAULT 'standard', -- economic | standard | premium
    brand           VARCHAR(100),
    supplier_note   VARCHAR(255),
    valid_from      DATE DEFAULT CURRENT_DATE,
    valid_until     DATE,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `room_templates`

```sql
CREATE TABLE room_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type       VARCHAR(30) NOT NULL,    -- salon, chambre, cuisine, sdb, wc, garage...
    label_ar        VARCHAR(50) NOT NULL,
    label_fr        VARCHAR(50) NOT NULL,
    zone            VARCHAR(20) NOT NULL,    -- public | private | wet | service | circulation
    min_area        DECIMAL(5,2) NOT NULL,   -- m²
    max_area        DECIMAL(5,2) NOT NULL,
    ideal_area      DECIMAL(5,2) NOT NULL,
    min_width       DECIMAL(4,2),            -- minimum dimension
    aspect_ratio    VARCHAR(10),             -- e.g., '1:1.5'
    priority        INTEGER DEFAULT 5,       -- 1 = must have, 10 = optional
    floor_default   VARCHAR(10),             -- 'rdc', 'upper', 'any'
    needs_window    BOOLEAN DEFAULT true,
    needs_plumbing  BOOLEAN DEFAULT false,
    is_default      BOOLEAN DEFAULT true
);
```

---

## 6. Plan Generation Logic

### Overview

The Plan Generation Engine uses a **rule-based pipeline** — no machine learning in MVP. The pipeline follows predictable, auditable steps that encode Algerian housing conventions.

### Pipeline Steps

```
Input → Step 1: Program → Step 2: Zoning → Step 3: Placement → Step 4: Routing → Step 5: Validation → Output
```

---

### Step 1: Program Generation

**Goal:** Determine the list of rooms needed per floor.

**Rules:**

| Input | Logic |
|-------|-------|
| Family members ≤ 3 | 1 bedroom + 1 salon |
| Family members 4–5 | 2 bedrooms + 1 salon |
| Family members 6–8 | 3 bedrooms + 1 salon + 1 living |
| Family members 9+ | 4 bedrooms + 1 salon + 1 living |
| Generations ≥ 2 | Add 1 master suite on RDC (parents/grandparents) |
| Building type R+1 | Split: public on RDC, private on 1st floor |
| Garage = yes | Add garage (min 15m²) on RDC, street-facing |
| Always include | Kitchen, 1+ bathroom, 1+ WC, corridor/hall |

**Room Size Rules (from `room_templates`):**

| Room | Min m² | Ideal m² | Max m² | Zone |
|------|--------|----------|--------|------|
| Salon (صالون) | 16 | 24 | 35 | Public |
| Living (معيشة) | 14 | 20 | 28 | Private |
| Master Bedroom | 12 | 16 | 22 | Private |
| Bedroom | 9 | 12 | 16 | Private |
| Kitchen (مطبخ) | 8 | 12 | 18 | Service |
| Bathroom (حمام) | 4 | 6 | 9 | Wet |
| WC (مرحاض) | 1.5 | 2 | 3 | Wet |
| Garage | 15 | 18 | 25 | Service |
| Hall / Entry | 4 | 6 | 10 | Circulation |
| Corridor | 1.2m wide min | — | — | Circulation |
| Staircase | 3 | 4 | 6 | Circulation |

---

### Step 2: Zoning

**Goal:** Divide the land into conceptual zones before placing individual rooms.

**Algerian Housing Zoning Principles:**

```
                STREET / ENTRANCE SIDE
    ┌────────────────────────────────────┐
    │          SETBACK (3m front)        │
    │  ┌──────────────────────────────┐  │
    │  │       PUBLIC ZONE            │  │
    │  │  (Salon, Entry, Garage)      │  │
    │  │       ↕ Transition           │  │
    │  │  ─────────────────────────── │  │
    │  │       SERVICE ZONE           │  │
    │  │  (Kitchen, WC)               │  │
    │  │       ↕ Corridor             │  │
    │  │  ─────────────────────────── │  │
    │  │       PRIVATE ZONE           │  │
    │  │  (Bedrooms, Bathrooms)       │  │
    │  │       → Furthest from entry  │  │
    │  └──────────────────────────────┘  │
    │          SETBACK (3m back)         │
    └────────────────────────────────────┘
              NEIGHBORS / BACK
```

**Key Zoning Rules:**
1. **Privacy gradient:** Public → Service → Private (front to back)
2. **Guest isolation:** Salon accessible without passing through private areas
3. **Wet room clustering:** Kitchen, bathroom, WC grouped (shared plumbing walls)
4. **Staircase position:** Central, accessible from both zones, near load-bearing walls
5. **Setbacks:** Front 3m, back 3m, sides 1.5m each (COS compliance)
6. **Coverage ratio (CES):** Max 60-70% of land area (depends on wilaya regulations)

**Zone Allocation Algorithm:**

```python
def allocate_zones(land_w, land_d, building_type):
    """
    Splits the buildable area into zone rectangles.
    Returns: { 'public': Rect, 'service': Rect, 'private': Rect }
    """
    buildable_w = land_w - SETBACK_LEFT - SETBACK_RIGHT   # e.g., 12 - 3 = 9m
    buildable_d = land_d - SETBACK_FRONT - SETBACK_BACK   # e.g., 20 - 6 = 14m

    if building_type == 'R+0':
        # All on one floor — horizontal split
        public_depth  = buildable_d * 0.30   # 30% front
        service_depth = buildable_d * 0.25   # 25% middle
        private_depth = buildable_d * 0.45   # 45% back
    else:
        # R+1 / R+2 — RDC is public+service, upper is private
        public_depth  = buildable_d * 0.55
        service_depth = buildable_d * 0.45
        private_depth = 0  # Private rooms go upstairs

    return zones
```

---

### Step 3: Room Placement

**Goal:** Place individual rooms within their assigned zones.

**Placement Algorithm (Greedy Bin-Packing with Constraints):**

1. Sort rooms by priority (high → low) and size (large → small)
2. For each room:
   - Select target zone
   - Find available rectangular slot within zone
   - Check constraints (min width, window access = must touch exterior wall, plumbing adjacency)
   - Place room, update available space
3. If a room can't fit → reduce to `min_area` and retry
4. If still can't fit → flag as overflow, suggest to user

**Constraint Checks:**
- `needs_window` → room must touch at least one exterior wall
- `needs_plumbing` → room must be adjacent to another plumbing room or within 2m of plumbing stack
- Bedrooms ≥ 2.7m in smallest dimension
- Corridors ≥ 1.2m wide
- Doors ≥ 0.9m (interior), ≥ 1.2m (exterior)

---

### Step 4: Circulation Routing

**Goal:** Connect all rooms with corridors/hallways, ensure no dead-end rooms.

**Rules:**
- Every room must be reachable from the entrance
- Corridor width ≥ 1.2m
- Staircase connects to main corridor on each floor
- Entry hall opens to: salon (direct), corridor (to rest of house)
- Private bedrooms accessed via private corridor (not through other rooms)

---

### Step 5: Validation

**Goal:** Check the generated plan against quality rules.

**Validation Checks:**

| Check | Rule | Action on Fail |
|-------|------|----------------|
| Total area | ≤ land area × CES | Reduce room sizes |
| All rooms placed | No overflow rooms | Warn user, suggest larger land |
| Window access | Every habitable room has exterior wall | Reposition room |
| Corridor continuity | All rooms reachable | Add/adjust corridor |
| Stair position | Present if R+1+ | Force placement |
| Min room sizes | ≥ minimum per type | Warn user |
| Setback compliance | No rooms in setback zones | Adjust positions |

---

## 7. Cost Estimation System

### Cost Model

The system uses a **per-m² cost matrix** with multipliers, calibrated to the **Algerian construction market (2024–2026 prices)**.

### Base Cost per m² (DZD)

| Category | Economic | Standard | Premium |
|----------|----------|----------|---------|
| **Foundation & Structure** | 25,000 | 35,000 | 50,000 |
| **Walls & Masonry** | 8,000 | 12,000 | 18,000 |
| **Roofing / Slab** | 10,000 | 15,000 | 22,000 |
| **Plumbing** | 5,000 | 8,000 | 14,000 |
| **Electrical** | 4,000 | 7,000 | 12,000 |
| **Flooring (Tiles)** | 3,000 | 6,000 | 15,000 |
| **Painting & Walls** | 2,000 | 4,000 | 8,000 |
| **Doors & Windows** | 3,000 | 5,000 | 10,000 |
| **External (Fence/Gate)** | 2,000 | 4,000 | 8,000 |
| **TOTAL per m²** | **62,000** | **96,000** | **157,000** |

> [!WARNING]
> These prices are **estimates** based on 2024-2026 Algerian market research. They are stored in the database and updated by admins. The app clearly states **"estimation range, not a quote."**

### Multipliers

```python
MULTIPLIERS = {
    "floor": {
        "RDC":    1.0,    # Base cost (includes foundation)
        "R+1":    0.85,   # No foundation, shared structure
        "R+2":    0.80,
        "R+3":    0.78,
    },
    "region": {
        "algiers":     1.15,  # Higher labor/transport costs
        "oran":        1.10,
        "constantine": 1.05,
        "south":       1.20,  # Remote, higher transport
        "default":     1.00,
    },
    "garage": {
        "per_unit": 350000,   # Flat additional cost per garage
    },
    "stairs": {
        "per_floor": 180000,  # Per additional floor
    },
    "terrace": {
        "per_m2": 8000,       # Accessible terrace finishing
    }
}
```

### Calculation Logic

```python
def estimate_cost(plan_result, finish_level, region):
    base_rates = get_base_rates(finish_level)  # From DB
    total_min = 0
    total_max = 0

    for floor in plan_result.floors:
        floor_area = floor.total_area
        floor_mult = MULTIPLIERS["floor"][floor.level]
        region_mult = MULTIPLIERS["region"].get(region, 1.0)

        for category, rate in base_rates.items():
            cost = floor_area * rate * floor_mult * region_mult
            total_min += cost * 0.85   # -15% tolerance
            total_max += cost * 1.15   # +15% tolerance

    # Add flat costs
    if plan_result.has_garage:
        total_min += MULTIPLIERS["garage"]["per_unit"] * 0.85
        total_max += MULTIPLIERS["garage"]["per_unit"] * 1.15

    if plan_result.floor_count > 1:
        stairs_cost = MULTIPLIERS["stairs"]["per_floor"] * (plan_result.floor_count - 1)
        total_min += stairs_cost * 0.85
        total_max += stairs_cost * 1.15

    return CostEstimate(
        total_min=round(total_min, -3),
        total_max=round(total_max, -3),
        cost_per_m2_min=round(total_min / plan_result.total_area),
        cost_per_m2_max=round(total_max / plan_result.total_area),
    )
```

### Output to User

```
╔════════════════════════════════════════════╗
║  ESTIMATION DE COÛT — تقدير التكلفة       ║
╠════════════════════════════════════════════╣
║  Surface totale : 180 m²                  ║
║  Type : R+1 avec garage                   ║
║  Finition : Standard                      ║
╠════════════════════════════════════════════╣
║  Structure     : 4,200,000 – 5,100,000 DA ║
║  Maçonnerie    : 1,800,000 – 2,200,000 DA ║
║  Plomberie     :   900,000 – 1,200,000 DA ║
║  Électricité   :   800,000 – 1,100,000 DA ║
║  Finition      : 2,500,000 – 3,200,000 DA ║
║  Extérieur     :   500,000 –   700,000 DA ║
║  Garage        :   300,000 –   400,000 DA ║
║  Escalier      :   150,000 –   210,000 DA ║
╠════════════════════════════════════════════╣
║  ▸ TOTAL : 11,150,000 – 14,110,000 DA    ║
║  ▸ par m² : 62,000 – 78,000 DA/m²        ║
╠════════════════════════════════════════════╣
║  ⚠ Ceci est une estimation indicative,    ║
║    pas un devis professionnel.            ║
╚════════════════════════════════════════════╝
```

---

## 8. 3D Visualization Strategy

### Approach: Massing Model (Not Photorealistic)

The 3D view is a **block/massing model** — extruded floor plans with color-coded rooms. This is computationally lightweight and renders in-browser.

### Implementation

```javascript
// Pseudo-code: Extrude 2D plan to 3D blocks
function generateMassing(planData, floorHeight = 3.0) {
    const group = new THREE.Group();

    planData.rooms.forEach(room => {
        const geometry = new THREE.BoxGeometry(room.width, floorHeight, room.height);
        const material = new THREE.MeshStandardMaterial({
            color: ZONE_COLORS[room.zone],
            transparent: true,
            opacity: 0.85,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            room.x + room.width / 2,
            room.floor * floorHeight + floorHeight / 2,
            room.y + room.height / 2
        );
        group.add(mesh);
    });

    return group;
}

const ZONE_COLORS = {
    public:      0x4A90D9,  // Blue
    private:     0xD4956A,  // Warm terracotta
    wet:         0x5BBFBE,  // Teal
    service:     0x8BC34A,  // Green
    circulation: 0x9E9E9E,  // Gray
};
```

**3D Features (MVP):**
- Orbit camera (rotate around model)
- Floor toggle (show/hide individual floors)
- Zone color legend
- Screenshot export
- Simple ground plane with shadow

**Post-MVP Additions:**
- Window/door openings cut into blocks
- Roof shape (flat slab with parapet for Algerian style)
- Tree/car scale figures for context
- Day/night lighting toggle

---

## 9. Architecture Diagram

### Full System Flow

```
USER (Mobile/Web)
    │
    ▼
┌────────────────────────────────────────────────────┐
│                  FRONTEND                          │
│                                                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │
│  │  Wizard   │  │  2D View  │  │  3D Viewport   │  │
│  │  (Input)  │  │  (Canvas) │  │  (Three.js)    │  │
│  └─────┬─────┘  └─────▲─────┘  └──────▲─────────┘  │
│        │              │               │             │
│        ▼              │               │             │
│  ┌────────────────────┴───────────────┘             │
│  │        State Management (Zustand)                │
│  └─────────────────┬───────────────────             │
│                    │                                │
└────────────────────┼────────────────────────────────┘
                     │ HTTP / REST
                     ▼
┌────────────────────────────────────────────────────┐
│                  API GATEWAY                       │
│              (Node.js + Express)                   │
│                                                    │
│   Auth ─── Rate Limit ─── Validation ─── Logging  │
└───────┬──────────┬────────────┬────────────────────┘
        │          │            │
        ▼          ▼            ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│   Plan     │ │   Cost     │ │  Material  │
│ Generation │ │ Estimation │ │  Suggest   │
│  Engine    │ │  Engine    │ │  Engine    │
│            │ │            │ │            │
│ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │
│ │Program │ │ │ │ Cost   │ │ │ │Filter  │ │
│ │Zoning  │ │ │ │ Matrix │ │ │ │Match   │ │
│ │Place   │ │ │ │ Multi- │ │ │ │Region  │ │
│ │Route   │ │ │ │ pliers │ │ │ │Pricing │ │
│ │Validate│ │ │ │ Range  │ │ │ │        │ │
│ └────────┘ │ └────────┘ │ │ └────────┘ │
│  (Python)  │ │ (Python)  │ │ (Node.js)  │
└──────┬─────┘ └─────┬─────┘ └──────┬─────┘
       │              │              │
       ▼              ▼              ▼
┌────────────────────────────────────────────────────┐
│                   DATA LAYER                       │
│                                                    │
│  PostgreSQL ◄──── Redis (cache) ────► MinIO (S3)  │
│  - users         - sessions          - plan images │
│  - projects      - price cache       - exports     │
│  - plans         - rate limits       - user files  │
│  - materials                                       │
│  - costs                                           │
│  - room_templates                                  │
└────────────────────────────────────────────────────┘
```

### Request Flow: Generate Plan

```
1. User fills wizard → clicks "Generate"
2. Frontend validates input → POST /api/generate/plan
3. API Gateway:
   ├── Verify JWT
   ├── Rate limit check
   ├── Validate body (Zod)
   └── Forward to Plan Engine (internal HTTP)
4. Plan Engine (Python):
   ├── Step 1: Generate room program
   ├── Step 2: Allocate zones
   ├── Step 3: Place rooms in zones
   ├── Step 4: Route corridors
   ├── Step 5: Validate plan
   └── Return PlanResult JSON
5. API Gateway:
   ├── Save PlanResult to PostgreSQL
   ├── Generate thumbnail → save to MinIO
   └── Return response to frontend
6. Frontend:
   ├── Render 2D plan on Canvas
   ├── Generate 3D massing from plan data
   └── Trigger cost estimation (POST /api/generate/cost)
```

---

## 10. Development Roadmap

### Phase 1: MVP (Months 1–3)

**Goal:** Working prototype that generates one-floor plans with cost estimation.

| Week | Task | Module |
|------|------|--------|
| 1–2 | Project setup, DB schema, auth | M8, M9 |
| 3–4 | User input wizard (web) | M1 |
| 5–7 | Plan generation engine (R+0 only) | M2 |
| 8–9 | 2D visualization (Canvas) | M5 |
| 10 | Cost estimation engine (basic) | M3 |
| 11 | Material database + seed data | M4 |
| 12 | Integration testing, bug fixes | All |

**MVP Deliverables:**
- [x] User registration + login (email)
- [x] Input wizard (land, family, budget, type)
- [x] Plan generation for R+0 (single floor)
- [x] 2D floor plan rendering
- [x] Basic cost estimation (3 tiers)
- [x] Material suggestions (national, no regional)
- [x] Save/load projects

---

### Phase 2: Enhancement (Months 4–6)

**Goal:** Multi-floor support, 3D view, mobile app, improved UX.

| Feature | Module |
|---------|--------|
| R+1 / R+2 plan generation | M2 |
| 3D massing visualization | M6 |
| React Native mobile app | Frontend |
| Regional material pricing (by wilaya) | M4 |
| PDF export (plan + cost) | M5, M3 |
| Guest mode (try before signup) | M9 |
| Arabic + French localization | Frontend |
| Project comparison (side-by-side) | M7 |

---

### Phase 3: Advanced (Months 7–12)

**Goal:** Intelligence layer, community, monetization.

| Feature | Module |
|---------|--------|
| AI-assisted plan optimization (ML fine-tuning) | M2 |
| Photo-style renders (external API integration) | M6 |
| Architect marketplace (connect users with local architects) | New Module |
| Plan sharing + community gallery | New Module |
| Contractor cost quotes (real supplier integration) | M3 |
| Push notifications (price alerts) | Backend |
| Analytics dashboard (admin) | M10 |
| Monetization: premium plans, architect referrals | Business |

---

### Phase 4: Scale (Year 2)

| Feature | Notes |
|---------|-------|
| Expand to Tunisia, Morocco | Localized rules + prices |
| Microservices migration | Split Plan/Cost engines |
| Terrain/slope analysis | GPS + elevation data |
| AR visualization | Camera-based model placement |
| Government permit pre-check | Regulatory API integration |

---

## 11. Folder Structure

```
binaa/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, register pages
│   │   │   ├── (dashboard)/          # User dashboard
│   │   │   ├── generate/             # Plan generation wizard
│   │   │   ├── project/[id]/         # Project detail view
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # Design system (buttons, inputs, cards)
│   │   │   ├── wizard/               # Multi-step input wizard
│   │   │   ├── plan-viewer/          # 2D canvas renderer
│   │   │   ├── massing-viewer/       # 3D Three.js viewport
│   │   │   └── cost-breakdown/       # Cost visualization
│   │   ├── lib/
│   │   │   ├── api.ts                # API client
│   │   │   ├── store.ts              # Zustand store
│   │   │   └── i18n.ts               # Internationalization
│   │   └── public/
│   │
│   ├── mobile/                       # React Native (Expo)
│   │   ├── screens/
│   │   ├── components/
│   │   └── navigation/
│   │
│   └── admin/                        # Admin panel (Next.js)
│       ├── app/
│       └── components/
│
├── packages/
│   ├── shared/                       # Shared types, utils, constants
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── constants/                # Room rules, material categories
│   │   └── validation/               # Zod schemas (shared FE + BE)
│   │
│   └── ui/                           # Shared UI components
│
├── services/
│   ├── api/                          # Node.js API Gateway
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/            # Auth, rate-limit, validation
│   │   │   ├── controllers/
│   │   │   └── services/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   └── plan-engine/                  # Python Plan Generation
│       ├── app/
│       │   ├── main.py               # FastAPI entry
│       │   ├── generator/
│       │   │   ├── program.py        # Room program generation
│       │   │   ├── zoning.py         # Zone allocation
│       │   │   ├── placer.py         # Room placement
│       │   │   ├── router.py         # Corridor routing
│       │   │   └── validator.py      # Plan validation
│       │   ├── cost/
│       │   │   ├── estimator.py      # Cost calculation
│       │   │   └── rates.py          # Rate definitions
│       │   ├── models/
│       │   │   ├── request.py        # Pydantic input models
│       │   │   └── result.py         # Pydantic output models
│       │   └── rules/
│       │       ├── algerian.py       # Algerian housing rules
│       │       └── room_rules.py     # Room size/constraint rules
│       ├── tests/
│       └── requirements.txt
│
├── docker-compose.yml
├── .github/workflows/
├── README.md
└── package.json                      # Monorepo root (pnpm workspaces)
```

---

> [!IMPORTANT]
> **Next Step:** After reviewing this architecture, the recommended first action is to scaffold the **monorepo structure** and implement **Module M1 (User Input Wizard)** + **Module M8 (API Gateway)** — the two endpoints of the system. This creates a working skeleton to which all other modules plug in.
