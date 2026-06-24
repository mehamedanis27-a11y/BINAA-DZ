"""
BINAA — Module M2: Architectural Plan Engine v2

This version outputs SPATIAL data — rooms with x, y, width, height
coordinates placed on the structural grid. This is the fundamental
change from v1 which only output area lists.

ALGORITHM:
  Phase 1: Build spatial program (what rooms are needed + constraints)
  Phase 2: Determine floor distribution
  Phase 3: Place rooms on structural grid cells using adjacency-aware
           greedy solver with zone + orientation scoring
  Phase 4: Generate door positions between adjacent rooms
  Phase 5: Assign exterior wall flags per room

ALGERIAN RESIDENTIAL LOGIC ENFORCED:
  - PUBLIC zone (salon hôtes + vestibule + WC invités) faces street
  - PRIVATE zone (chambres + SDB) at rear of plot or upper floors
  - Kitchen NEVER visible from entrance — placed mid-depth rear-access
  - Vestibule minimum 1.5m depth, must create sightline break
  - Garage always at street facade on ground floor
  - Staircase positioned at transition between public and private zones
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import Optional

from .models import (
    RoomOutput, FloorOutput, DoorOutput, PlanSummary,
    ValidationIssue, StructuralGridOutput, WindowOutput,
)
from .structural_grid import get_max_room_dimensions


# ─────────────────────────────────────────────────────────────
#  ROOM PROGRAM DATA
#  Min / target / max areas + minimum dimensions per room type
# ─────────────────────────────────────────────────────────────

ROOM_SPECS = {
    # room_type: (area_min, area_target, area_max, width_min, depth_min, max_proportion)
    "vestibule":        (4.0,  6.0,  10.0, 1.4,  1.5,  3.0),
    "salon_hotes":      (16.0, 22.0, 32.0, 3.5,  4.0,  2.0),
    "wc_invites":       (2.0,  2.5,   4.0, 0.9,  1.6,  2.5),
    "salon_famille":    (14.0, 20.0, 30.0, 3.2,  3.8,  2.0),
    "cuisine":          (10.0, 14.0, 20.0, 2.2,  3.0,  2.5),
    "chambre_parents":  (14.0, 18.0, 26.0, 3.2,  3.5,  2.5),
    "chambre_enfant":   (10.0, 13.0, 18.0, 2.8,  3.0,  2.5),
    "chambre_grandp":   (12.0, 14.0, 18.0, 3.0,  3.2,  2.5),
    "sdb_principale":   ( 5.0,  7.0, 12.0, 1.8,  2.4,  2.0),
    "sdb_enfants":      ( 4.5,  6.0,  9.0, 1.6,  2.2,  2.0),
    "garage":           (16.0, 20.0, 30.0, 2.8,  5.5,  2.5),
    "escalier":         (10.0, 13.0, 16.0, 2.5,  3.5,  2.0),
    "degagement":       ( 4.0,  6.0, 10.0, 1.0,  3.0,  5.0),
    "wc_separe":        ( 1.5,  2.5,  4.0, 0.9,  1.4,  2.0),
    "buanderie":        ( 3.0,  4.5,  8.0, 1.5,  2.0,  2.5),
}

LABELS = {
    "vestibule":       ("Hall d'entrée",          "مدخل"),
    "salon_hotes":     ("Salon invités (Majlis)",  "مجلس الضيوف"),
    "wc_invites":      ("WC invités",              "مرحاض الضيوف"),
    "salon_famille":   ("Séjour familial",         "غرفة المعيشة"),
    "cuisine":         ("Cuisine",                 "مطبخ"),
    "chambre_parents": ("Chambre parentale",        "غرفة الوالدين"),
    "chambre_enfant":  ("Chambre",                 "غرفة نوم"),
    "chambre_grandp":  ("Chambre (grands-parents)","غرفة الأجداد"),
    "sdb_principale":  ("Salle de bain",           "حمام رئيسي"),
    "sdb_enfants":     ("Salle de bain",           "حمام"),
    "garage":          ("Garage",                  "مرآب"),
    "escalier":        ("Escalier",                "درج"),
    "degagement":      ("Dégagement",              "ممر"),
    "wc_separe":       ("WC séparé",               "مرحاض"),
    "buanderie":       ("Buanderie",               "غرفة الغسيل"),
}

ZONE_MAP = {
    "vestibule":       ("circulation", 5),
    "salon_hotes":     ("public",      1),
    "wc_invites":      ("public",      1),
    "salon_famille":   ("semi-public", 2),
    "cuisine":         ("semi-public", 2),
    "chambre_parents": ("private",     3),
    "chambre_enfant":  ("private",     3),
    "chambre_grandp":  ("private",     3),
    "sdb_principale":  ("private",     3),
    "sdb_enfants":     ("private",     3),
    "garage":          ("service",     4),
    "escalier":        ("circulation", 5),
    "degagement":      ("circulation", 5),
    "wc_separe":       ("service",     4),
    "buanderie":       ("service",     4),
}


# ─────────────────────────────────────────────────────────────
#  SPATIAL PROGRAM BUILDER
#  Returns ordered list of (room_type, target_area) per floor
# ─────────────────────────────────────────────────────────────

MANDATORY_ROOMS = {"vestibule", "cuisine", "salon_famille"}

def build_spatial_program(
    family_size: int,
    generations: int,
    has_car: bool,
    guest_frequency: str,
    floors: int,
    future_floors: int,
    budget_factor: float,         # 0.0=minimum, 1.0=target, 1.5=generous
    effective_width: float = 10.0,
    independent_generations: bool = False,
    car_count: int = 1,
    warnings: list = None,
) -> dict:
    """
    Build ordered room programs per floor.

    Returns:
        {
          0: [(room_type, area), ...],   # RDC
          1: [(room_type, area), ...],   # R+1 (if floors >= 1)
          ...
        }
    """

    def area(room_type: str) -> float:
        mn, tg, mx, *_ = ROOM_SPECS[room_type]
        f = max(0.0, min(1.5, budget_factor))
        return round(mn + (tg - mn) * f, 1)

    extra_bedrooms = _calc_bedrooms(family_size, generations)
    sdb_counts = _calc_bathrooms(extra_bedrooms, generations, floors, independent_generations)
    has_staircase = floors > 0 or future_floors > 0
    needs_grandp_room = generations >= 2
    has_salon_hotes = guest_frequency in ("MEDIUM", "HIGH")

    # Suppress garage if plot is very narrow
    effective_garage = has_car and effective_width >= 5.5

    program: dict[int, list] = {}

    # ── GROUND FLOOR (RDC) — always present ─────────────────
    rdc = []

    # Garage — street facade, always first
    if effective_garage:
        if car_count > 0:
            garage_target_area = 20.0 if car_count == 1 else 30.0
            # Override the ROOM_SPECS area_target for garage dynamically
            rdc.append(("garage", garage_target_area))

    # Vestibule — mandatory, minimum depth enforced separately
    rdc.append(("vestibule", area("vestibule")))

    # Salon hôtes — if guests expected
    if has_salon_hotes:
        rdc.append(("salon_hotes", area("salon_hotes")))
        rdc.append(("wc_invites", area("wc_invites")))

    # WC séparé — always present
    rdc.append(("wc_separe", area("wc_separe")))

    # Kitchen — always on ground floor
    rdc.append(("cuisine", area("cuisine")))

    # Salon famille — always on ground floor
    rdc.append(("salon_famille", area("salon_famille")))

    if floors == 0:
        # ── Single floor — all private rooms on RDC ──────────
        rdc.append(("chambre_parents", area("chambre_parents")))
        if needs_grandp_room:
            rdc.append(("chambre_grandp", area("chambre_grandp")))

        for i in range(extra_bedrooms):
            rdc.append(("chambre_enfant", area("chambre_enfant")))

        for room_type, count in sdb_counts.items():
            if room_type.startswith("sdb_"):
                for _ in range(count):
                    rdc.append((room_type, area(room_type)))

        rdc.append(("degagement", area("degagement")))

        # Buanderie — standard for family_size >= 4 or multigenerational shared dwelling
        if family_size >= 4 or (generations >= 2 and not independent_generations):
            if effective_width >= 6.5:  # only if terrain is wide enough
                rdc.append(("buanderie", area("buanderie")))
            elif warnings is not None:
                warnings.append(
                    "Buanderie non générée — terrain trop étroit (largeur constructible insuffisante)."
                )

        program[0] = rdc
        return program

    else:
        # ── Multi-floor — grandparents ground, children upper ─
        if needs_grandp_room:
            rdc.append(("chambre_grandp", area("chambre_grandp")))
            rdc.append(("sdb_principale", area("sdb_principale")))

        # Staircase on RDC
        rdc.append(("escalier", area("escalier")))

        # Buanderie — standard for family_size >= 4 or multigenerational shared dwelling
        if family_size >= 4 or (generations >= 2 and not independent_generations):
            if effective_width >= 6.5:  # only if terrain is wide enough
                rdc.append(("buanderie", area("buanderie")))
            elif warnings is not None:
                warnings.append(
                    "Buanderie non générée — terrain trop étroit (largeur constructible insuffisante)."
                )

        program[0] = rdc

        # ── UPPER FLOOR(S) ────────────────────────────────────
        for floor_num in range(1, floors + 1):
            upper = []
            upper.append(("escalier", area("escalier")))   # staircase landing
            upper.append(("degagement", area("degagement")))

            # Parents bedroom on first upper floor
            if floor_num == 1:
                upper.append(("chambre_parents", area("chambre_parents")))
                upper.append(("sdb_principale", area("sdb_principale")))

            # Distribute children bedrooms across upper floors
            beds_this_floor = extra_bedrooms // floors
            if floor_num <= (extra_bedrooms % floors):
                beds_this_floor += 1

            for i in range(beds_this_floor):
                upper.append(("chambre_enfant", area("chambre_enfant")))

            # Distribute bathrooms for children
            baths_needed = sdb_counts.get("sdb_enfants", 0)
            baths_this_floor = baths_needed // floors
            if floor_num <= (baths_needed % floors):
                baths_this_floor += 1

            for i in range(baths_this_floor):
                upper.append(("sdb_enfants", area("sdb_enfants")))

            program[floor_num] = upper

        # Independent generations: add second cuisine to first upper floor
        if independent_generations and generations >= 2 and floors >= 1:
            upper_floor_key = 1
            if upper_floor_key in program:
                program[upper_floor_key].append(("cuisine", area("cuisine")))

        return program


def _calc_bedrooms(family_size: int, generations: int) -> int:
    """
    Extra bedrooms beyond parents + grandparents.
    Grandparent room is handled separately if generations >= 2.
    """
    # Subtract 2 (parents) + 2 per generation above 1 (grandparents share a room)
    children = max(0, family_size - 2 - (2 if generations >= 2 else 0))
    return max(0, math.ceil(children / 2))


def _calc_bathrooms(
    extra_bedrooms: int,
    generations: int,
    floors: int,
    independent_generations: bool = False,
) -> dict[str, int]:
    """
    Returns count dict: {sdb_principale: N, sdb_enfants: N, wc_separe: N, wc_invites: N}
    Algerian norm: 1 complete SDB per residential floor unit.
    """
    result = {"sdb_principale": 1, "sdb_enfants": 0, "wc_separe": 1, "wc_invites": 0}

    if generations >= 2:
        if independent_generations:
            # Each generation gets its own complete SDB
            result["sdb_principale"] += 1
        else:
            # Shared dwelling: grandparents on RDC get accessible bathroom
            result["sdb_principale"] = max(1, generations - 1)

    if floors >= 1 and not independent_generations:
        # Upper floor children's bathroom
        result["sdb_enfants"] = 1

    if extra_bedrooms >= 3:
        result["sdb_enfants"] = max(result["sdb_enfants"], 1)

    return result


# ─────────────────────────────────────────────────────────────
#  ROOM PLACEMENT ON STRUCTURAL GRID
#  Greedy placement with zone + orientation scoring
# ─────────────────────────────────────────────────────────────

@dataclass
class GridCell:
    """A single structural bay that can hold one room."""
    bay_x: int
    bay_y: int
    x: float
    y: float
    width: float
    height: float
    area: float
    occupied: bool = False
    room_type: Optional[str] = None
    is_rear: bool = False

    @property
    def is_street_facing(self) -> bool:
        return self.bay_y == 0  # first row = street side

    def center(self) -> tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)


def _build_grid_cells(grid: StructuralGridOutput) -> list[GridCell]:
    """Create cell objects for every structural bay."""
    cells = []
    for bx in range(grid.num_bays_x):
        for by in range(grid.num_bays_y):
            x, y, w, h = grid.get_bay_rect(bx, by)
            cell = GridCell(
                bay_x=bx, bay_y=by,
                x=x, y=y, width=w, height=h,
                area=round(w * h, 2)
            )
            cells.append(cell)

    # Mark rear cells
    max_by = max(c.bay_y for c in cells)
    for c in cells:
        if c.bay_y == max_by:
            c.is_rear = True
    return cells


def _cells_share_wall(c1: GridCell, c2: GridCell) -> bool:
    return abs(c1.bay_x - c2.bay_x) + abs(c1.bay_y - c2.bay_y) == 1


def _score_cell(
    cell: GridCell,
    room_type: str,
    placed: dict,
    grid: StructuralGridOutput,
    solar_priority: str,
    street_orientation: str,
    floor_num: int = 0,
    previous_floors_rooms: list[RoomOutput] = None,
) -> float:
    """
    Score a candidate cell for a given room type.
    Higher = better placement.
    Returns -999999 if placement is invalid.
    """
    if cell.occupied:
        return -999999

    # Règle 4: Proportion constraint
    specs = ROOM_SPECS.get(room_type)
    if specs and len(specs) >= 6:
        max_ratio = specs[5]
        cell_min = min(cell.width, cell.height)
        cell_max = max(cell.width, cell.height)
        if cell_min > 0:
            ratio = cell_max / cell_min
            if ratio > max_ratio:
                return -999999

    # Règle 7: Exterior wall requirements during placement
    is_north = cell.bay_y == 0
    is_south = cell.bay_y == grid.num_bays_y - 1
    is_west = cell.bay_x == 0
    is_east = cell.bay_x == grid.num_bays_x - 1
    has_exterior = is_north or is_south or is_east or is_west
    if room_type in ("cuisine", "salon_famille") or room_type.startswith("chambre_"):
        if not has_exterior:
            return -999999

    # Règle 5: Staircase vertical alignment
    if room_type == "escalier" and floor_num > 0 and previous_floors_rooms:
        prev_esc = next((r for r in previous_floors_rooms if r.room_type == "escalier"), None)
        if prev_esc:
            if not (abs(cell.x - prev_esc.x) < 0.01 and abs(cell.y - prev_esc.y) < 0.01):
                return -999999

    zone, privacy = ZONE_MAP.get(room_type, ("service", 4))
    num_y_bays = grid.num_bays_y

    # ── Zone scoring (y-axis = depth from street) ────────────
    # PUBLIC: must be in first 1/3 of depth (near street)
    # PRIVATE: must be in last 1/2 of depth (rear)
    # SERVICE: acceptable anywhere
    # CIRCULATION: flexible

    depth_fraction = cell.bay_y / max(num_y_bays - 1, 1)  # 0=street, 1=rear

    if zone == "public":
        if depth_fraction > 0.45:
            return -999999   # Public rooms must not be at rear
        zone_score = 80 - depth_fraction * 100

    elif zone in ("private",):
        if depth_fraction < 0.35 and num_y_bays > 2:
            return -999999   # Private rooms must not be at street
        zone_score = depth_fraction * 80

    elif zone == "semi-public":
        # Middle zone preferred
        mid_dist = abs(depth_fraction - 0.5)
        zone_score = 50 - mid_dist * 60

    elif zone == "service":
        zone_score = 20  # neutral

    else:  # circulation
        zone_score = 10

    # ── Special placement rules ──────────────────────────────

    # Garage: must be street-facing AND x-edge (left or right)
    if room_type == "garage":
        if not cell.is_street_facing:
            return -999999
        # Prefer edge bays (x=0 or x=last)
        max_bx = grid.num_bays_x - 1
        if cell.bay_x in (0, max_bx):
            zone_score += 50

    # Vestibule: must be street-facing, prefer center-x
    if room_type == "vestibule":
        if not cell.is_street_facing:
            return -999999
        center_bx = grid.num_bays_x // 2
        zone_score += 30 - abs(cell.bay_x - center_bx) * 15

    # Escalier: prefer center x, mid depth
    if room_type == "escalier":
        center_bx = grid.num_bays_x // 2
        center_by = num_y_bays // 2
        zone_score += 20 - abs(cell.bay_x - center_bx) * 5 \
                         - abs(cell.bay_y - center_by) * 5

    # Cuisine: must NOT be at street (visibility constraint)
    if room_type == "cuisine":
        if cell.is_street_facing:
            return -999999   # Cultural constraint: kitchen not visible from street
        zone_score += depth_fraction * 20

    # Salon hôtes: must be near vestibule
    if room_type == "salon_hotes" and placed.get("vestibule"):
        vest_cell = placed["vestibule"][0]
        dist = abs(cell.bay_x - vest_cell.bay_x) + abs(cell.bay_y - vest_cell.bay_y)
        if dist > 2:
            zone_score -= dist * 15
        else:
            zone_score += 30

    # Kitchen: should be adjacent to salon famille
    if room_type == "cuisine" and placed.get("salon_famille"):
        sf_cell = placed["salon_famille"][0]
        dist = abs(cell.bay_x - sf_cell.bay_x) + abs(cell.bay_y - sf_cell.bay_y)
        zone_score += max(0, 25 - dist * 10)

    # Degagement: should be adjacent to escalier
    if room_type == "degagement" and placed.get("escalier"):
        esc_cells = placed["escalier"]
        min_dist = min(abs(cell.bay_x - ec.bay_x) + abs(cell.bay_y - ec.bay_y) for ec in esc_cells)
        if min_dist == 1:
            zone_score += 40

    # Circulation adjacency for non-circulation rooms
    if zone in ("private", "public", "semi-public", "service"):
        circ_cells = []
        for k in ["degagement", "escalier", "vestibule"]:
            if placed.get(k):
                circ_cells.extend(placed[k])
        if circ_cells:
            min_dist = min(abs(cell.bay_x - cc.bay_x) + abs(cell.bay_y - cc.bay_y) for cc in circ_cells)
            if min_dist == 1:
                zone_score += 35

    # ── Règle 2: Wet rooms clustering ─────────────────────────
    wet_bonus = 0
    if room_type == "cuisine" and placed.get("sdb_principale"):
        if any(_cells_share_wall(cell, oc) for oc in placed["sdb_principale"]):
            wet_bonus += 25
    elif room_type == "sdb_principale" and placed.get("cuisine"):
        if any(_cells_share_wall(cell, oc) for oc in placed["cuisine"]):
            wet_bonus += 25

    if room_type == "wc_separe" and placed.get("sdb_principale"):
        if any(_cells_share_wall(cell, oc) for oc in placed["sdb_principale"]):
            wet_bonus += 20
    elif room_type == "sdb_principale" and placed.get("wc_separe"):
        if any(_cells_share_wall(cell, oc) for oc in placed["wc_separe"]):
            wet_bonus += 20

    if room_type == "cuisine" and placed.get("wc_invites"):
        if any(_cells_share_wall(cell, oc) for oc in placed["wc_invites"]):
            wet_bonus += 15
    elif room_type == "wc_invites" and placed.get("cuisine"):
        if any(_cells_share_wall(cell, oc) for oc in placed["wc_invites"]):
            wet_bonus += 15

    # ── Règle 3: Bedroom clustering ───────────────────────────
    bedroom_bonus = 0
    if room_type.startswith("chambre_"):
        placed_bedrooms = []
        for k, v in placed.items():
            if k.startswith("chambre_"):
                placed_bedrooms.extend(v)
        if placed_bedrooms:
            if any(_cells_share_wall(cell, oc) for oc in placed_bedrooms):
                bedroom_bonus += 30
            else:
                bedroom_bonus -= 40

    # ── Règle 5: Staircase scoring rules ──────────────────────
    stair_bonus = 0
    if room_type == "escalier":
        # +40 pts si placé dans la zone de transition public→privé (profondeur 40-60%)
        if 0.40 <= depth_fraction <= 0.60:
            stair_bonus += 40
        # +30 pts si adjacent au dégagement
        if placed.get("degagement"):
            if any(_cells_share_wall(cell, dc) for dc in placed["degagement"]):
                stair_bonus += 30

    if room_type == "degagement" and placed.get("escalier"):
        if any(_cells_share_wall(cell, ec) for ec in placed["escalier"]):
            stair_bonus += 30

    # -20 pts si éloigné de plus de 3m de toutes les chambres (sur l'étage supérieur)
    if room_type.startswith("chambre_") and floor_num > 0 and placed.get("escalier"):
        cell_cx = cell.x + cell.width / 2
        cell_cy = cell.y + cell.height / 2
        min_dist = 99999.0
        for ec in placed["escalier"]:
            ec_cx = ec.x + ec.width / 2
            ec_cy = ec.y + ec.height / 2
            dist = math.sqrt((cell_cx - ec_cx)**2 + (cell_cy - ec_cy)**2)
            if dist < min_dist:
                min_dist = dist
        if min_dist > 3.0:
            stair_bonus -= 20

    zone_score += wet_bonus + bedroom_bonus + stair_bonus

    # ── Area fit score ────────────────────────────────────────
    specs = ROOM_SPECS.get(room_type)
    if specs:
        area_min, area_target, area_max, *_ = specs
        if cell.area < area_min * 0.75:
            return -999999   # Cell too small even for reduced room
        area_ratio = cell.area / area_target
        area_score = 30 - abs(1.0 - area_ratio) * 30
    else:
        area_score = 0

    return zone_score + area_score


def place_rooms_on_grid(
    program_floor: list[tuple[str, float]],
    grid: StructuralGridOutput,
    floor_num: int,
    solar_priority: str,
    street_orientation: str,
    previous_floors_rooms: list[RoomOutput] = None,
) -> tuple[list[RoomOutput], list[DoorOutput], list[str]]:
    """
    Place rooms for one floor onto the structural grid.

    Returns:
        (rooms, doors, warnings)
    """
    cells = _build_grid_cells(grid)
    placed: dict[str, list[GridCell]] = {}   # room_type → list[GridCell]
    unplaced: list[str] = []
    warnings: list[str] = []

    # Sort by placement priority: most constrained first
    PLACEMENT_ORDER = [
        "garage", "vestibule", "escalier", "salon_hotes", "wc_invites",
        "salon_famille", "cuisine", "degagement", "chambre_grandp",
        "chambre_parents", "chambre_enfant", "sdb_principale", "wc_separe",
        "sdb_enfants", "buanderie",
    ]
    program_dict = dict(program_floor)
    sorted_rooms = sorted(
        program_floor,
        key=lambda x: PLACEMENT_ORDER.index(x[0]) if x[0] in PLACEMENT_ORDER else 99
    )

    # Place each room
    for room_type, target_area in sorted_rooms:
        best_cell = None
        best_score = -999999

        for cell in cells:
            if cell.occupied:
                continue
            score = _score_cell(
                cell, room_type, placed, grid, solar_priority, street_orientation,
                floor_num=floor_num, previous_floors_rooms=previous_floors_rooms
            )
            if score > best_score:
                best_score = score
                best_cell = cell

        if best_cell is None or best_score <= -999999:
            # Could not place — add warning, skip
            unplaced.append(room_type)
            warnings.append(
                f"⚠ Impossible de placer '{LABELS.get(room_type, (room_type,))[0]}' "
                f"— terrain trop petit ou contraintes trop strictes"
            )
            continue

        best_cell.occupied = True
        best_cell.room_type = room_type
        if room_type not in placed:
            placed[room_type] = []
        placed[room_type].append(best_cell)

    # Build RoomOutput objects with coordinates
    rooms: list[RoomOutput] = []
    placed_instances = {k: list(v) for k, v in placed.items()}
    for room_type, target_area in sorted_rooms:
        if room_type in unplaced:
            continue
        cell = placed_instances[room_type].pop(0)
        zone_name, privacy_lvl = ZONE_MAP.get(room_type, ("service", 4))
        label_fr, label_ar = LABELS.get(room_type, (room_type, room_type))

        # Determine actual area (cell area, clamped to min/max)
        specs = ROOM_SPECS.get(room_type)
        if specs:
            area_min, _, area_max, *_ = specs
            actual_area = round(max(area_min, min(area_max, cell.area)), 1)
        else:
            actual_area = round(cell.area, 1)

        # Exterior wall flags
        is_north = cell.bay_y == 0
        is_south = cell.bay_y == grid.num_bays_y - 1
        is_west = cell.bay_x == 0
        is_east = cell.bay_x == grid.num_bays_x - 1

        rooms.append(RoomOutput(
            room_type=room_type,
            label_fr=label_fr,
            label_ar=label_ar,
            zone=zone_name,
            privacy_level=privacy_lvl,
            area_m2=actual_area,
            floor=floor_num,
            x=round(cell.x, 3),
            y=round(cell.y, 3),
            width=round(cell.width, 3),
            height=round(cell.height, 3),
            has_exterior_wall_north=is_north,
            has_exterior_wall_south=is_south,
            has_exterior_wall_east=is_east,
            has_exterior_wall_west=is_west,
            notes=_generate_note(room_type, cell, grid),
        ))

    # Generate doors between adjacent placed rooms
    doors = _generate_doors(placed, grid)

    return rooms, doors, warnings


def _generate_note(room_type: str, cell: GridCell, grid: StructuralGridOutput) -> str:
    """Generate a short architectural note for a room."""
    notes = {
        "vestibule": "Filtrage visuel — seuil d'entrée privé",
        "salon_hotes": "Zone invités — accessible sans traverser zone familiale",
        "cuisine": "Cuisine — mur extérieur pour ventilation naturelle",
        "garage": "Accès rue — porte sectionnelle ou battante",
        "escalier": "Cage d'escalier — structure fermée 4 côtés",
        "chambre_grandp": "Chambre RDC — mobilité facilitée, accès SDB direct",
    }
    return notes.get(room_type, "")


def _generate_doors(
    placed: dict[str, list[GridCell]],
    grid: StructuralGridOutput,
) -> list[DoorOutput]:
    """
    Generate door positions between adjacent placed rooms.
    Two rooms are adjacent if their cells share a wall (differ by 1 bay
    in exactly one axis).
    """
    doors = []
    room_list = []
    for rt, cells in placed.items():
        for cell in cells:
            room_list.append((rt, cell))

    for i, (rt_a, cell_a) in enumerate(room_list):
        for rt_b, cell_b in room_list[i+1:]:
            dx = abs(cell_a.bay_x - cell_b.bay_x)
            dy = abs(cell_a.bay_y - cell_b.bay_y)

            if dx + dy != 1:
                continue  # Not adjacent

            # Apply NO-DOOR rules (Algerian privacy)
            if _no_door_between(rt_a, rt_b):
                continue

            # Determine shared wall side and door position
            if dx == 1:  # side by side (x)
                if cell_a.bay_x < cell_b.bay_x:
                    # Door on east wall of a (= west wall of b)
                    door_x = cell_a.x + cell_a.width
                    door_y = round((cell_a.y + cell_a.height / 2), 3)
                    wall_side = "E"
                else:
                    door_x = cell_b.x + cell_b.width
                    door_y = round((cell_b.y + cell_b.height / 2), 3)
                    wall_side = "E"
            else:  # dy == 1 — one behind the other (y)
                if cell_a.bay_y < cell_b.bay_y:
                    door_x = round((cell_a.x + cell_a.width / 2), 3)
                    door_y = cell_a.y + cell_a.height
                    wall_side = "S"
                else:
                    door_x = round((cell_b.x + cell_b.width / 2), 3)
                    door_y = cell_b.y + cell_b.height
                    wall_side = "S"

            # Door width by type
            door_width = 1.0 if rt_a == "vestibule" or rt_b == "vestibule" else 0.9
            if "wc" in rt_a or "wc" in rt_b or "sdb" in rt_a or "sdb" in rt_b:
                door_width = 0.8

            doors.append(DoorOutput(
                from_room=rt_a,
                to_room=rt_b,
                wall_side=wall_side,
                x=round(door_x, 3),
                y=round(door_y, 3),
                width=door_width,
                swing_direction="CW",
                is_main_entrance=(rt_a == "vestibule" or rt_b == "vestibule"),
            ))

    return doors


NO_DOOR_PAIRS = {
    # These room pairs must NEVER have a direct door
    frozenset({"salon_hotes", "cuisine"}),
    frozenset({"salon_hotes", "chambre_parents"}),
    frozenset({"salon_hotes", "chambre_enfant"}),
    frozenset({"salon_hotes", "chambre_grandp"}),
    frozenset({"salon_hotes", "sdb_principale"}),
    frozenset({"salon_hotes", "sdb_enfants"}),
    frozenset({"salon_hotes", "degagement"}),
    frozenset({"chambre_parents", "chambre_enfant"}),  # no bedroom-through-bedroom
    frozenset({"chambre_parents", "chambre_grandp"}),
    frozenset({"chambre_enfant", "chambre_enfant"}),
    frozenset({"escalier", "chambre_parents"}),
    frozenset({"escalier", "chambre_enfant"}),
    frozenset({"escalier", "chambre_grandp"}),
}

def _no_door_between(rt_a: str, rt_b: str) -> bool:
    return frozenset({rt_a, rt_b}) in NO_DOOR_PAIRS


# ─────────────────────────────────────────────────────────────
#  MAIN GENERATION FUNCTION
# ─────────────────────────────────────────────────────────────

def generate_plan(
    effective_width: float,
    effective_depth: float,
    family_size: int,
    generations: int,
    has_car: bool,
    guest_frequency: str,
    floors: int,
    future_floors: int,
    budget: float,
    grid: StructuralGridOutput,
    solar_priority: str,
    street_orientation: str,
    wilaya_name: str,
    seismic_zone: str,
    climate_zone: str,
    independent_generations: bool = False,
    car_count: int = 1,
) -> tuple[list[FloorOutput], PlanSummary, list[str]]:
    """
    Main plan generation function.

    Returns:
        (floor_outputs, plan_summary, global_warnings)
    """
    warnings: list[str] = []

    # ── Budget factor ─────────────────────────────────────
    # Based on budget per m² vs. realistic Algerian rates
    total_floors = 1 + floors
    estimated_area = effective_width * effective_depth * total_floors
    budget_per_m2 = budget / max(estimated_area, 1)
    # Calibrated to Algerian 2025-2026 market:
    # 80,000 DA/m² = standard quality → factor 1.0
    # 60,000 DA/m² = economy → factor 0.0
    budget_factor = max(0.0, min(1.5, (budget_per_m2 - 60_000) / 40_000))

    # ── Build spatial program ─────────────────────────────
    program = build_spatial_program(
        family_size, generations, has_car, guest_frequency,
        floors, future_floors, budget_factor, effective_width,
        independent_generations=independent_generations,
        car_count=car_count,
        warnings=warnings,
    )

    # ── Place rooms per floor ─────────────────────────────
    floor_outputs: list[FloorOutput] = []
    all_placed_rooms: list[RoomOutput] = []
    total_bedroom_count = 0
    total_bathroom_count = 0

    for floor_num in range(total_floors):
        floor_program = program.get(floor_num, [])

        if not floor_program:
            continue

        rooms, doors, floor_warnings = place_rooms_on_grid(
            floor_program, grid, floor_num,
            solar_priority, street_orientation,
            previous_floors_rooms=all_placed_rooms
        )
        warnings.extend(floor_warnings)
        all_placed_rooms.extend(rooms)

        # Area summary
        room_area = round(sum(r.area_m2 for r in rooms), 1)
        circ_rooms = [r for r in rooms if r.zone == "circulation"]
        circ_area = round(sum(r.area_m2 for r in circ_rooms), 1)
        floor_total = round(effective_width * effective_depth, 1)

        # Count bedrooms and bathrooms
        total_bedroom_count += sum(
            1 for r in rooms if "chambre" in r.room_type
        )
        total_bathroom_count += sum(
            1 for r in rooms if "sdb" in r.room_type
        )

        # Generate windows for this floor's rooms
        floor_windows = _generate_windows_for_rooms(rooms)

        floor_outputs.append(FloorOutput(
            floor_number=floor_num,
            floor_label="RDC" if floor_num == 0 else f"R+{floor_num}",
            rooms=rooms,
            doors=doors,
            windows=floor_windows,
            total_room_area_m2=room_area,
            circulation_area_m2=circ_area,
            total_floor_area_m2=floor_total,
            effective_width_m=round(effective_width, 2),
            effective_depth_m=round(effective_depth, 2),
        ))

    # ── Plan summary ───────────────────────────────────────
    total_built = round(effective_width * effective_depth * total_floors, 1)

    summary = PlanSummary(
        built_area_m2=round(effective_width * effective_depth, 1),
        total_built_area_m2=total_built,
        floor_count=total_floors,
        bedroom_count=total_bedroom_count,
        bathroom_count=total_bathroom_count,
        seismic_zone=seismic_zone,
        climate_zone=climate_zone,
        wilaya_name=wilaya_name,
    )

    if future_floors > floors:
        warnings.append(
            f"⚙ Pré-dimensionnement R+{future_floors}: poteaux "
            f"{grid.column_section}, "
            f"dalle {grid.slab_thickness_cm}cm, "
            f"hauteur libre minimum {2.90}m requis."
        )

    # Check for silently dropped mandatory rooms
    placed_types = {room.room_type for floor in floor_outputs for room in floor.rooms}
    for mandatory in MANDATORY_ROOMS:
        if mandatory not in placed_types:
            label = LABELS.get(mandatory, (mandatory, mandatory))[0]
            warnings.append(
                f"Avertissement — La {label} n'a pas pu être placée sur ce terrain. "
                f"Le programme est incomplet. Réduisez le nombre d'étages ou la taille du programme."
            )

    return floor_outputs, summary, warnings


def _generate_windows_for_rooms(rooms: list[RoomOutput]) -> list[WindowOutput]:
    windows = []
    for room in rooms:
        ext_walls = []
        if room.has_exterior_wall_north: ext_walls.append("N")
        if room.has_exterior_wall_south: ext_walls.append("S")
        if room.has_exterior_wall_east:  ext_walls.append("E")
        if room.has_exterior_wall_west:  ext_walls.append("W")
        
        if not ext_walls:
            if room.room_type == "sdb_principale":
                if "ventilation forcée requise" not in room.warnings:
                    room.warnings.append("ventilation forcée requise")
            continue
            
        # Select first exterior wall
        wall = ext_walls[0]
        w_len = room.width if wall in ("N", "S") else room.height
        
        if room.room_type.startswith("chambre_"):
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.5,
                width_m=1.2,
                height_m=1.2
            ))
        elif room.room_type == "salon_hotes":
            if w_len >= 4.0:
                windows.append(WindowOutput(
                    room_type=room.room_type,
                    wall_direction=wall,
                    position_ratio=0.3,
                    width_m=1.5,
                    height_m=1.2
                ))
                windows.append(WindowOutput(
                    room_type=room.room_type,
                    wall_direction=wall,
                    position_ratio=0.7,
                    width_m=1.5,
                    height_m=1.2
                ))
            else:
                windows.append(WindowOutput(
                    room_type=room.room_type,
                    wall_direction=wall,
                    position_ratio=0.5,
                    width_m=1.5,
                    height_m=1.2
                ))
        elif room.room_type == "salon_famille":
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.5,
                width_m=1.5,
                height_m=1.2
            ))
        elif room.room_type == "cuisine":
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.3,
                width_m=0.9,
                height_m=1.2
            ))
        elif room.room_type == "sdb_principale":
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.5,
                width_m=0.6,
                height_m=0.6
            ))
        elif room.room_type == "vestibule":
            # high window (height=0.4m)
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.5,
                width_m=0.6,
                height_m=0.4
            ))
        else:
            # Default window for other rooms with exterior walls
            if "wc" in room.room_type or "sdb" in room.room_type:
                width_m, height_m = 0.6, 0.6
            else:
                width_m, height_m = 0.9, 1.2
            windows.append(WindowOutput(
                room_type=room.room_type,
                wall_direction=wall,
                position_ratio=0.5,
                width_m=width_m,
                height_m=height_m
            ))
    return windows


def build_circulation_graph(rooms: list[RoomOutput], doors: list[DoorOutput]) -> dict:
    """
    Build a connectivity graph:
    - Nodes: each placed room (unique key based on type, floor, coordinates)
    - Edges: two rooms are connected if they share a wall AND a door between them is generated
    """
    def get_node_key(r: RoomOutput) -> str:
        return f"{r.room_type}_f{r.floor}_{r.x:.2f}_{r.y:.2f}"

    adj = {get_node_key(r): set() for r in rooms}

    # Connect stairs between adjacent floors
    stair_by_floor = {}
    for r in rooms:
        if r.room_type == "escalier":
            stair_by_floor[r.floor] = r
    for f, esc in stair_by_floor.items():
        if f + 1 in stair_by_floor:
            k1 = get_node_key(esc)
            k2 = get_node_key(stair_by_floor[f + 1])
            adj[k1].add(k2)
            adj[k2].add(k1)

    # Match doors
    for d in doors:
        if d.to_room == "EXTERIOR":
            continue
        candidates = []
        for r in rooms:
            if r.room_type in (d.from_room, d.to_room):
                if r.x - 0.05 <= d.x <= r.x + r.width + 0.05 and r.y - 0.05 <= d.y <= r.y + r.height + 0.05:
                    candidates.append(r)
        
        by_floor = {}
        for r in candidates:
            by_floor.setdefault(r.floor, []).append(r)
        
        for f, f_rooms in by_floor.items():
            from_candidates = [r for r in f_rooms if r.room_type == d.from_room]
            to_candidates = [r for r in f_rooms if r.room_type == d.to_room]
            if from_candidates and to_candidates:
                for r1 in from_candidates:
                    for r2 in to_candidates:
                        k1 = get_node_key(r1)
                        k2 = get_node_key(r2)
                        adj[k1].add(k2)
                        adj[k2].add(k1)

    return {k: list(v) for k, v in adj.items()}
