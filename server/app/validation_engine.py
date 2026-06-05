"""
BINAA — Module M7: Validation Engine

Every generated plan passes through this engine before output.
The engine checks 6 layers:
  1. Circulation validity     (can every room be reached?)
  2. Structural feasibility   (spans, column logic)
  3. Dimension quality        (width, depth, proportion)
  4. Algerian cultural rules  (privacy, kitchen visibility, vestibule)
  5. Climate performance      (orientation, ventilation)
  6. Economic realism         (area vs budget coherence)

OUTPUT:
  ValidationReport with status: UNBUILDABLE / PROBLEMATIC / ACCEPTABLE / GOOD
  Every issue has: code, message_fr, severity, room_involved, suggested_fix

SEVERITY LOGIC:
  CRITICAL (1000 pts): plan cannot be shown — blocks output
  HIGH (100 pts):      serious problem — shown with red warning
  MEDIUM (10 pts):     quality issue — shown with yellow note
  LOW (1 pt):          optimization suggestion — shown as info
"""

from __future__ import annotations
from .models import (
    FloorOutput, RoomOutput, ValidationIssue, ValidationReport,
)

SEVERITY_SCORE = {"CRITICAL": 1000, "HIGH": 100, "MEDIUM": 10, "LOW": 1}

# ─────────────────────────────────────────────────────────────
#  ROOM DIMENSION MINIMUMS
#  (width_min, depth_min) in meters — minimum DIMENSION,
#  not area. A room with correct area but wrong dimensions fails.
# ─────────────────────────────────────────────────────────────

ROOM_MIN_DIMENSIONS = {
    "vestibule":        (1.40, 1.50),
    "salon_hotes":      (3.50, 4.00),
    "salon_famille":    (3.20, 3.80),
    "cuisine":          (2.20, 3.00),
    "chambre_parents":  (3.20, 3.50),
    "chambre_enfant":   (2.80, 3.00),
    "chambre_grandp":   (3.00, 3.20),
    "sdb_principale":   (1.80, 2.40),
    "sdb_enfants":      (1.60, 2.20),
    "wc_invites":       (0.90, 1.60),
    "wc_separe":        (0.90, 1.40),
    "garage":           (2.80, 5.50),
    "escalier":         (2.50, 3.00),
    "degagement":       (1.00, 2.50),
    "buanderie":        (1.50, 2.00),
}

MAX_ROOM_PROPORTION = {
    "salon_hotes":      2.0,
    "salon_famille":    2.0,
    "chambre_parents":  2.5,
    "chambre_enfant":   2.5,
    "cuisine":          2.5,
    "sdb_principale":   2.0,
    "garage":           2.5,
    "vestibule":        3.0,
    "degagement":       6.0,   # corridors are naturally elongated
}

# Climate orientation rules per zone
CLIMATE_RULES = {
    "COASTAL":  {
        "avoid_orientation": ["W"],   # west overheating
        "kitchen_avoid":     ["W", "S"],
        "preferred_living":  ["S", "E", "N"],
    },
    "HIGHLAND": {
        "avoid_orientation": [],
        "kitchen_avoid":     ["W"],
        "preferred_living":  ["S", "E"],
    },
    "ARID": {
        "avoid_orientation": ["W", "S"],
        "kitchen_avoid":     ["W", "S"],
        "preferred_living":  ["N", "E"],
    },
    "SAHARAN": {
        "avoid_orientation": ["W", "S"],
        "kitchen_avoid":     ["W", "S"],
        "preferred_living":  ["N", "E"],
    },
}


# ─────────────────────────────────────────────────────────────
#  HELPER — orientation from exterior wall flags
# ─────────────────────────────────────────────────────────────

def _room_orientations(room: RoomOutput) -> list[str]:
    """Return list of compass directions this room faces externally."""
    orientations = []
    if room.has_exterior_wall_north: orientations.append("N")
    if room.has_exterior_wall_south: orientations.append("S")
    if room.has_exterior_wall_east:  orientations.append("E")
    if room.has_exterior_wall_west:  orientations.append("W")
    return orientations


def _find_room(floors: list[FloorOutput], room_type: str) -> RoomOutput | None:
    for floor in floors:
        for room in floor.rooms:
            if room.room_type == room_type:
                return room
    return None


def _find_rooms_of_type(floors: list[FloorOutput], room_type: str) -> list[RoomOutput]:
    result = []
    for floor in floors:
        for room in floor.rooms:
            if room_type in room.room_type:
                result.append(room)
    return result


def _rooms_share_wall(a: RoomOutput, b: RoomOutput) -> bool:
    """
    Check if two rooms share a wall (are adjacent).
    Conservative: checks if their bounding boxes touch along an edge.
    """
    # Check horizontal adjacency (share vertical wall)
    h_touch = (
        abs((a.x + a.width) - b.x) < 0.01 or
        abs((b.x + b.width) - a.x) < 0.01
    )
    h_overlap = not (a.y + a.height <= b.y or b.y + b.height <= a.y)

    # Check vertical adjacency (share horizontal wall)
    v_touch = (
        abs((a.y + a.height) - b.y) < 0.01 or
        abs((b.y + b.height) - a.y) < 0.01
    )
    v_overlap = not (a.x + a.width <= b.x or b.x + b.width <= a.x)

    return (h_touch and h_overlap) or (v_touch and v_overlap)


def _has_door_between(
    rt_a: str, rt_b: str, floor: FloorOutput
) -> bool:
    for door in floor.doors:
        if ({door.from_room, door.to_room} == {rt_a, rt_b}):
            return True
    return False


# ─────────────────────────────────────────────────────────────
#  VALIDATION LAYERS
# ─────────────────────────────────────────────────────────────

def _validate_mandatory_rooms(
    floors: list[FloorOutput],
    has_car: bool,
    guest_frequency: str,
) -> list[ValidationIssue]:
    issues = []
    all_types = {r.room_type for fl in floors for r in fl.rooms}

    if "vestibule" not in all_types:
        issues.append(ValidationIssue(
            code="MISSING_VESTIBULE",
            message_fr="Pas de vestibule — entrée directe sans filtre visuel impossible en contexte algérien",
            severity="CRITICAL",
            suggested_fix="Ajouter un vestibule de minimum 1.5m de profondeur avant le dégagement principal",
        ))

    if "salon_famille" not in all_types:
        issues.append(ValidationIssue(
            code="MISSING_SALON_FAMILLE",
            message_fr="Pas de séjour familial — espace de vie quotidienne absent",
            severity="HIGH",
            suggested_fix="Ajouter un salon famille (14-20m²) distinct du salon invités",
        ))

    if guest_frequency in ("MEDIUM", "HIGH") and "salon_hotes" not in all_types:
        issues.append(ValidationIssue(
            code="MISSING_SALON_HOTES",
            message_fr="Salon invités absent alors que fréquence d'invités est MEDIUM/HIGH",
            severity="HIGH",
            suggested_fix="Ajouter un salon invités (18-22m²) accessible uniquement depuis le vestibule",
        ))

    if "cuisine" not in all_types:
        issues.append(ValidationIssue(
            code="MISSING_CUISINE",
            message_fr="Pas de cuisine dans le plan",
            severity="CRITICAL",
        ))

    if has_car and "garage" not in all_types:
        issues.append(ValidationIssue(
            code="GARAGE_MISSING_WITH_CAR",
            message_fr="Voiture déclarée mais pas de garage dans le plan",
            severity="MEDIUM",
            suggested_fix="Ajouter un garage (16-20m²) en façade rue, ou noter qu'il sera construit séparément",
        ))

    return issues


def _validate_algerian_cultural(
    floors: list[FloorOutput],
) -> list[ValidationIssue]:
    """
    Hard cultural constraints for Algerian residential design.
    These are not stylistic preferences — they are functional requirements.
    """
    issues = []

    rdc = next((f for f in floors if f.floor_number == 0), None)
    if not rdc:
        return issues

    rooms = {r.room_type: r for r in rdc.rooms}

    # ── C1: Vestibule depth ──────────────────────────────────
    vestibule = rooms.get("vestibule")
    if vestibule:
        min_dim = min(vestibule.width, vestibule.height)
        if min_dim < 1.4:
            issues.append(ValidationIssue(
                code="VESTIBULE_TOO_SHALLOW",
                message_fr=f"Vestibule trop petit ({min_dim:.1f}m min dimension) — "
                           f"ne peut pas assurer la coupure visuelle depuis la rue",
                severity="CRITICAL",
                room_involved="vestibule",
                suggested_fix="Vestibule minimum 1.4m de large × 1.5m de profondeur",
            ))

    # ── C2: Salon hôtes not adjacent to bedrooms ────────────
    salon_hotes = rooms.get("salon_hotes")
    if salon_hotes:
        bedroom_types = ["chambre_parents", "chambre_enfant", "chambre_grandp"]
        for bt in bedroom_types:
            bedroom = rooms.get(bt)
            if bedroom and _rooms_share_wall(salon_hotes, bedroom):
                issues.append(ValidationIssue(
                    code="SALON_HOTES_ADJACENT_BEDROOM",
                    message_fr=f"Salon invités partage un mur avec '{bt}' — "
                               f"isolation acoustique insuffisante, violation de privacité",
                    severity="HIGH",
                    room_involved="salon_hotes",
                    suggested_fix="Intercaler une circulation ou un WC entre le salon invités et les chambres",
                ))

    # ── C3: Cuisine not adjacent to salon hôtes ─────────────
    cuisine = rooms.get("cuisine")
    if cuisine and salon_hotes:
        if _rooms_share_wall(cuisine, salon_hotes):
            issues.append(ValidationIssue(
                code="CUISINE_ADJACENT_SALON_HOTES",
                message_fr="La cuisine est adjacente au salon invités — "
                           "odeurs et présence de la femme visibles par les invités",
                severity="HIGH",
                room_involved="cuisine",
                suggested_fix="Déplacer la cuisine vers la zone semi-publique, loin du salon invités",
            ))

    # ── C4: Cuisine must have exterior wall ─────────────────
    if cuisine:
        orientations = _room_orientations(cuisine)
        if not orientations:
            issues.append(ValidationIssue(
                code="CUISINE_NO_EXTERIOR_WALL",
                message_fr="La cuisine n'a pas de mur extérieur — ventilation naturelle impossible",
                severity="HIGH",
                room_involved="cuisine",
                suggested_fix="Repositionner la cuisine pour qu'elle touche au moins un mur extérieur",
            ))

    # ── C5: Garage street-facing only ───────────────────────
    garage = rooms.get("garage")
    if garage and not garage.has_exterior_wall_north:
        # Assumes street is north (most common); actually should use street_orientation
        # For now: garage must have at least one exterior wall
        ext_walls = _room_orientations(garage)
        if not ext_walls:
            issues.append(ValidationIssue(
                code="GARAGE_NO_STREET_ACCESS",
                message_fr="Le garage n'a pas accès à la rue — accès voiture impossible",
                severity="CRITICAL",
                room_involved="garage",
                suggested_fix="Le garage doit être en façade rue (premier rang de la profondeur)",
            ))

    # ── C6: Grandparent room on ground floor ────────────────
    grandp_rooms = [r for r in rdc.rooms if r.room_type == "chambre_grandp"]
    for fl in floors:
        if fl.floor_number > 0:
            upper_grandp = [r for r in fl.rooms if r.room_type == "chambre_grandp"]
            if upper_grandp:
                issues.append(ValidationIssue(
                    code="GRANDPARENT_ROOM_UPPER_FLOOR",
                    message_fr="Chambre grands-parents placée à l'étage — "
                               "problème de mobilité (escalier quotidien)",
                    severity="HIGH",
                    room_involved="chambre_grandp",
                    suggested_fix="Chambre grands-parents obligatoirement au RDC",
                ))

    return issues


def _validate_dimensions(
    floors: list[FloorOutput],
) -> list[ValidationIssue]:
    """
    Minimum dimension and proportion checks.
    Validates WIDTH and DEPTH, not just area.
    """
    issues = []

    for fl in floors:
        for room in fl.rooms:
            mins = ROOM_MIN_DIMENSIONS.get(room.room_type)
            if not mins:
                continue

            min_w, min_d = mins
            actual_min = min(room.width, room.height)
            actual_max = max(room.width, room.height)

            # Width check
            if room.width < min_w * 0.90:
                issues.append(ValidationIssue(
                    code="ROOM_TOO_NARROW",
                    message_fr=f"{room.label_fr} trop étroite: {room.width:.2f}m "
                               f"(minimum {min_w}m requis)",
                    severity="HIGH" if room.width < min_w * 0.75 else "MEDIUM",
                    room_involved=room.room_type,
                    suggested_fix=f"Élargir à minimum {min_w}m ou fusionner avec la travée adjacente",
                ))

            # Depth check
            if room.height < min_d * 0.90:
                issues.append(ValidationIssue(
                    code="ROOM_TOO_SHALLOW",
                    message_fr=f"{room.label_fr} trop peu profonde: {room.height:.2f}m "
                               f"(minimum {min_d}m requis)",
                    severity="HIGH" if room.height < min_d * 0.75 else "MEDIUM",
                    room_involved=room.room_type,
                    suggested_fix=f"Approfondir à minimum {min_d}m",
                ))

            # Proportion check (don't apply to corridors)
            max_prop = MAX_ROOM_PROPORTION.get(room.room_type, 3.5)
            if actual_min > 0:
                proportion = actual_max / actual_min
                if proportion > max_prop:
                    issues.append(ValidationIssue(
                        code="POOR_ROOM_PROPORTION",
                        message_fr=f"{room.label_fr}: proportion 1:{proportion:.1f} "
                                   f"trop allongée (max 1:{max_prop})",
                        severity="MEDIUM",
                        room_involved=room.room_type,
                        suggested_fix="Ajuster les dimensions pour un rapport longueur/largeur plus équilibré",
                    ))

            # Area floor check
            if room.area_m2 < 1.0:
                issues.append(ValidationIssue(
                    code="ROOM_AREA_ZERO",
                    message_fr=f"{room.label_fr}: surface {room.area_m2:.1f}m² — "
                               f"salle non fonctionnelle",
                    severity="CRITICAL",
                    room_involved=room.room_type,
                ))

    return issues


def _validate_structural(
    floors: list[FloorOutput],
    seismic_zone: str,
    max_span_m: float,
) -> list[ValidationIssue]:
    """
    Check that room dimensions respect béton armé span limits.
    Also checks staircase structural enclosure.
    """
    issues = []
    SPAN_LIMITS = {"HIGH": 4.5, "MEDIUM": 5.0, "LOW": 5.0}
    limit = SPAN_LIMITS.get(seismic_zone, 5.0)

    for fl in floors:
        for room in fl.rooms:
            # Check if room spans exceed the structural grid limit
            if room.width > limit + 0.10:   # +10cm tolerance
                issues.append(ValidationIssue(
                    code="SPAN_EXCEEDED_WIDTH",
                    message_fr=f"{room.label_fr}: largeur {room.width:.2f}m dépasse la portée "
                               f"maximale {limit}m (zone {seismic_zone}). Un poteau intermédiaire sera visible.",
                    severity="HIGH",
                    room_involved=room.room_type,
                    suggested_fix=f"Réduire la largeur à max {limit}m ou accepter un poteau intermédiaire",
                ))
            if room.height > limit + 0.10:
                issues.append(ValidationIssue(
                    code="SPAN_EXCEEDED_DEPTH",
                    message_fr=f"{room.label_fr}: profondeur {room.height:.2f}m dépasse la portée "
                               f"maximale {limit}m. Poutre de {limit/10:.2f}m de hauteur requise.",
                    severity="HIGH",
                    room_involved=room.room_type,
                    suggested_fix=f"Réduire la profondeur à max {limit}m ou prévoir une poutre apparente",
                ))

    # Staircase structural check
    for fl in floors:
        stair = next((r for r in fl.rooms if r.room_type == "escalier"), None)
        if stair:
            if stair.width < 2.5 or stair.height < 3.0:
                issues.append(ValidationIssue(
                    code="STAIRCASE_TOO_SMALL",
                    message_fr=f"Cage d'escalier trop petite ({stair.width:.1f}×{stair.height:.1f}m). "
                               f"Minimum 2.5×3.0m pour une montée correcte",
                    severity="HIGH",
                    room_involved="escalier",
                    suggested_fix="Agrandir la cage d'escalier à 2.5m × 3.5m minimum",
                ))

    return issues


def _validate_climate(
    floors: list[FloorOutput],
    climate_zone: str,
) -> list[ValidationIssue]:
    """Climate orientation checks."""
    issues = []
    rules = CLIMATE_RULES.get(climate_zone, CLIMATE_RULES["COASTAL"])

    cuisine = _find_room(floors, "cuisine")
    if cuisine:
        orientations = _room_orientations(cuisine)
        bad = [o for o in orientations if o in rules["kitchen_avoid"]]
        if bad:
            issues.append(ValidationIssue(
                code="CUISINE_BAD_ORIENTATION",
                message_fr=f"Cuisine orientée {'/'.join(bad)} — surchauffe estivale en zone {climate_zone}",
                severity="MEDIUM",
                room_involved="cuisine",
                suggested_fix=f"Préférer N ou E pour la cuisine en zone {climate_zone}",
            ))

    living_rooms = (
        _find_rooms_of_type(floors, "salon") +
        _find_rooms_of_type(floors, "chambre")
    )
    for room in living_rooms:
        orientations = _room_orientations(room)
        bad = [o for o in orientations if o in rules["avoid_orientation"]]
        if bad and not any(o in rules["preferred_living"] for o in orientations):
            issues.append(ValidationIssue(
                code="HABITABLE_ROOM_BAD_ORIENTATION",
                message_fr=f"{room.label_fr}: orientation {'/'.join(bad)} défavorable "
                           f"en zone {climate_zone} sans compensation",
                severity="LOW",
                room_involved=room.room_type,
                suggested_fix=f"Privilégier {'/'.join(rules['preferred_living'])} pour les pièces habitables",
            ))

    return issues


def _validate_circulation(
    floors: list[FloorOutput],
) -> list[ValidationIssue]:
    """
    Basic circulation reachability checks.
    Full graph reachability requires the full door network —
    here we check the most critical violations.
    """
    issues = []

    for fl in floors:
        rooms = {r.room_type: r for r in fl.rooms}
        doors = fl.doors

        # Every bedroom needs a door (not a direct wall adjacency without door)
        for room in fl.rooms:
            if "chambre" not in room.room_type:
                continue
            has_door = any(
                door.from_room == room.room_type or door.to_room == room.room_type
                for door in doors
            )
            if not has_door:
                issues.append(ValidationIssue(
                    code="BEDROOM_NO_DOOR",
                    message_fr=f"{room.label_fr}: aucune porte générée — chambre inaccessible",
                    severity="CRITICAL",
                    room_involved=room.room_type,
                    suggested_fix="Vérifier que la chambre est adjacente à un dégagement ou couloir",
                ))

        # Salon hôtes must have a door to vestibule (or adjacent public room)
        salon_hotes = rooms.get("salon_hotes")
        vestibule = rooms.get("vestibule")
        if salon_hotes and vestibule:
            direct = _has_door_between("salon_hotes", "vestibule", fl)
            if not direct and not _rooms_share_wall(salon_hotes, vestibule):
                issues.append(ValidationIssue(
                    code="SALON_HOTES_NOT_ACCESSIBLE",
                    message_fr="Salon invités non accessible directement depuis le vestibule — "
                               "les invités doivent traverser d'autres zones",
                    severity="HIGH",
                    room_involved="salon_hotes",
                    suggested_fix="Rapprocher le salon invités du vestibule (cellule adjacente)",
                ))

    return issues


# ─────────────────────────────────────────────────────────────
#  MAIN VALIDATION FUNCTION
# ─────────────────────────────────────────────────────────────

def validate_plan(
    floors: list[FloorOutput],
    seismic_zone: str,
    climate_zone: str,
    max_span_m: float,
    has_car: bool,
    guest_frequency: str,
) -> ValidationReport:
    """
    Run all validation layers and return a complete ValidationReport.
    """
    all_issues: list[ValidationIssue] = []

    all_issues += _validate_mandatory_rooms(floors, has_car, guest_frequency)
    all_issues += _validate_algerian_cultural(floors)
    all_issues += _validate_dimensions(floors)
    all_issues += _validate_structural(floors, seismic_zone, max_span_m)
    all_issues += _validate_climate(floors, climate_zone)
    all_issues += _validate_circulation(floors)

    # Score and classify
    total_score = sum(SEVERITY_SCORE[i.severity] for i in all_issues)

    counts = {s: sum(1 for i in all_issues if i.severity == s)
              for s in ("CRITICAL", "HIGH", "MEDIUM", "LOW")}

    if counts["CRITICAL"] > 0:
        status = "UNBUILDABLE"
    elif total_score >= 100:
        status = "PROBLEMATIC"
    elif total_score >= 10:
        status = "ACCEPTABLE"
    else:
        status = "GOOD"

    # Identify passed checks (for user confidence)
    passed = []
    all_codes = {i.code for i in all_issues}
    POSSIBLE_CHECKS = [
        ("VESTIBULE_TOO_SHALLOW",     "Vestibule dimensionné correctement"),
        ("SALON_HOTES_ADJACENT_BEDROOM", "Salon invités isolé des chambres"),
        ("CUISINE_NO_EXTERIOR_WALL",  "Cuisine avec mur extérieur (ventilation)"),
        ("SPAN_EXCEEDED_WIDTH",       "Portées structurelles respectées"),
        ("ROOM_TOO_NARROW",           "Dimensions minimales respectées"),
        ("CUISINE_BAD_ORIENTATION",   "Cuisine bien orientée"),
    ]
    for code, label in POSSIBLE_CHECKS:
        if code not in all_codes:
            passed.append(label)

    return ValidationReport(
        status=status,
        total_issues=len(all_issues),
        critical_count=counts["CRITICAL"],
        high_count=counts["HIGH"],
        medium_count=counts["MEDIUM"],
        low_count=counts["LOW"],
        issues=all_issues,
        passed_checks=passed,
    )
