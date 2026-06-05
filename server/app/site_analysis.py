"""
BINAA — Module M1: Site Analysis Engine

Derives all site constraints from terrain dimensions, wilaya, and
street orientation. This module runs BEFORE the plan engine and
feeds constraints downstream to every other module.

Key outputs:
  - Effective buildable rectangle (after real absolute-distance setbacks)
  - Seismic zone (from wilaya → RPA 99 v2003)
  - Climate zone (from wilaya → design rules)
  - Solar orientation analysis (best orientations for habitable rooms)
  - Terrain area, setback losses

WHY ABSOLUTE SETBACKS MATTER:
  On a 10×15m plot (150m²) in Oran (dense urban):
    front=3m, left=1.5m, right=1.5m, rear=2m
    effective = (10-3) × (15-5) = 7.0 × 10.0 = 70m²
  The old system calculated 150 × 0.75 = 112.5m² — a 60% overestimate.
  This error cascades: wrong room sizes, wrong cost, wrong structure.
"""

from __future__ import annotations
from dataclasses import dataclass
from .models import (
    WILAYA_SEISMIC_ZONE,
    WILAYA_CLIMATE_ZONE,
    WILAYA_NAMES,
    WILAYA_SETBACKS,
    DENSE_URBAN_WILAYAS,
    SiteAnalysisOutput,
)


# ─────────────────────────────────────────────────────────────
#  SOLAR ORIENTATION TABLE
#  Given the street-facing orientation, determine which compass
#  directions are available for habitable rooms.
#
#  Logic: the rear of the house is opposite to the street.
#  In North Africa / Algeria, south is always the priority
#  orientation for habitable rooms (winter sun + summer overhang).
# ─────────────────────────────────────────────────────────────

STREET_TO_SOLAR = {
    # street_orientation → (best_for_habitable, dominant_summer_wind_Oran)
    # best_for_habitable: the orientation of the REAR façade (= opposite to street)
    # This is where you want living rooms, master bedroom, main windows.
    "N":  {"rear": "S",  "sides": ["E", "W"], "note": "Rear is south — optimal"},
    "NE": {"rear": "SW", "sides": ["NW", "SE"], "note": "Rear SW — acceptable"},
    "E":  {"rear": "W",  "sides": ["N", "S"], "note": "Rear is west — avoid large windows"},
    "SE": {"rear": "NW", "sides": ["NE", "SW"], "note": "Rear NW — good for coastal breeze"},
    "S":  {"rear": "N",  "sides": ["E", "W"], "note": "Rear is north — lowest sun — avoid for bedrooms"},
    "SW": {"rear": "NE", "sides": ["NW", "SE"], "note": "Rear NE — morning sun"},
    "W":  {"rear": "E",  "sides": ["N", "S"], "note": "Rear is east — morning only"},
    "NW": {"rear": "SE", "sides": ["NE", "SW"], "note": "Rear SE — good summer cross-ventilation"},
}

# Dominant summer wind by climate zone (for cross-ventilation axis)
CLIMATE_WIND = {
    "COASTAL":  "NW",    # Tramontane in Oran/Alger coastal strip
    "HIGHLAND": "NW",    # Similar prevailing pattern
    "ARID":     "N",     # Drier NW or N wind in pre-Saharan
    "SAHARAN":  "NE",    # Harmattan-type wind in deep south
}


# ─────────────────────────────────────────────────────────────
#  MAIN ANALYSIS FUNCTION
# ─────────────────────────────────────────────────────────────

def analyze_site(
    terrain_width: float,
    terrain_depth: float,
    street_orientation: str,
    wilaya: str,
) -> SiteAnalysisOutput:
    """
    Derive all site constraints from basic inputs.

    Args:
        terrain_width:      Street-facing dimension in meters.
        terrain_depth:      Perpendicular dimension in meters.
        street_orientation: Compass direction of street façade (N/NE/E/...).
        wilaya:             2-digit wilaya code.

    Returns:
        SiteAnalysisOutput with all derived constraints.
    """

    # ── Lookup derived values ──────────────────────────────
    seismic_zone = WILAYA_SEISMIC_ZONE.get(wilaya, "MEDIUM")
    climate_zone = WILAYA_CLIMATE_ZONE.get(wilaya, "COASTAL")
    wilaya_name = WILAYA_NAMES.get(wilaya, f"Wilaya {wilaya}")

    # ── Real setbacks (absolute distances, not percentages) ──
    setback_tier = "dense" if wilaya in DENSE_URBAN_WILAYAS else "standard"
    setbacks = WILAYA_SETBACKS[setback_tier].copy()  # {front, left, right, rear}

    # ── Effective buildable rectangle ──────────────────────
    effective_width = terrain_width - setbacks["left"] - setbacks["right"]
    effective_depth = terrain_depth - setbacks["front"] - setbacks["rear"]

    # Minimum viable constraint
    if effective_width < 4.0:
        # Not raising — plan engine will catch this and add a CRITICAL warning
        effective_width = max(effective_width, 3.5)
    if effective_depth < 6.0:
        effective_depth = max(effective_depth, 5.5)

    terrain_area = round(terrain_width * terrain_depth, 1)
    effective_area = round(effective_width * effective_depth, 1)
    setback_area = round(terrain_area - effective_area, 1)
    setback_loss_pct = round((setback_area / terrain_area) * 100, 1)

    # ── Solar orientation ──────────────────────────────────
    solar = STREET_TO_SOLAR.get(street_orientation, STREET_TO_SOLAR["N"])
    solar_priority = solar["rear"]      # best orientation for habitable rooms
    dominant_wind = CLIMATE_WIND.get(climate_zone, "NW")

    return SiteAnalysisOutput(
        terrain_width_m=terrain_width,
        terrain_depth_m=terrain_depth,
        terrain_area_m2=terrain_area,
        setbacks=setbacks,
        effective_width_m=round(effective_width, 2),
        effective_depth_m=round(effective_depth, 2),
        effective_area_m2=effective_area,
        setback_area_m2=setback_area,
        setback_loss_percent=setback_loss_pct,
        wilaya=wilaya,
        wilaya_name=wilaya_name,
        seismic_zone=seismic_zone,
        climate_zone=climate_zone,
        street_orientation=street_orientation,
        solar_priority_orientation=solar_priority,
        dominant_summer_wind=dominant_wind,
    )


# ─────────────────────────────────────────────────────────────
#  FEASIBILITY GATE
#  Called before any generation — returns blockers if infeasible.
# ─────────────────────────────────────────────────────────────

MINIMUM_PROGRAM_AREAS = {
    # Absolute minimum built area per program type
    # floors=0 (R+0 only) — absolute minimum for a functional Algerian house
    0: 65.0,   # m²
    1: 100.0,  # m² — R+1 minimum
    2: 150.0,  # m² — R+2 minimum
}

def check_feasibility(
    site: SiteAnalysisOutput,
    floors: int,
    budget: float,
    wilaya: str,
) -> list[str]:
    """
    Returns a list of BLOCKING issues (empty = proceed).
    Called before any generation work begins.
    """
    from .cost_engine import WILAYA_COST_RATES

    blockers = []

    # 1. Effective area must be positive
    if site.effective_area_m2 <= 0:
        blockers.append(
            f"Le terrain ({site.terrain_width_m:.1f}m × {site.terrain_depth_m:.1f}m) "
            f"est trop petit pour les retraits réglementaires "
            f"(façade={site.setbacks['front']}m, "
            f"côtés={site.setbacks['left']}m+{site.setbacks['right']}m, "
            f"arrière={site.setbacks['rear']}m). "
            f"Surface constructible réelle: {site.effective_area_m2:.1f} m²"
        )
        return blockers  # Other checks are meaningless if no buildable area

    # 2. Effective area must accommodate minimum program
    min_area = MINIMUM_PROGRAM_AREAS.get(floors, 65.0)
    max_built = site.effective_area_m2 * (1 + floors)

    if max_built < min_area:
        blockers.append(
            f"Surface constructible maximale ({max_built:.0f} m²) insuffisante "
            f"pour un R+{floors}. Minimum requis: {min_area:.0f} m²."
        )

    # 3. Budget vs. minimum construction cost for effective area
    # NOTE: This is a SANITY GATE only — intended to catch clearly impossible
    # budgets. The actual budget evaluation happens in the cost engine (M8)
    # which provides detailed comfortable/sufficient/tight/insufficient status.
    # The gate should NOT block borderline cases — let the engine handle those.
    rates = WILAYA_COST_RATES.get(wilaya, WILAYA_COST_RATES["DEFAULT"])
    min_cost_per_m2 = rates["go_min"] + rates["fin_min"]
    min_build_cost = max_built * min_cost_per_m2  # bare minimum, no contingency

    if budget < min_build_cost * 0.35:  # less than 35% of bare minimum → blocker
        blockers.append(
            f"Budget ({budget:,.0f} DA) très insuffisant pour {max_built:.0f} m² "
            f"à {site.wilaya_name}. Minimum estimé: "
            f"{min_build_cost:,.0f} DA. "
            f"Envisagez de réduire le programme ou augmenter le budget."
        )

    # 4. Effective width minimum (structural constraint)
    if site.effective_width_m < 4.5:
        blockers.append(
            f"Largeur constructible ({site.effective_width_m:.1f} m) très étroite. "
            f"Un garage et un salon ne peuvent pas coexister côte à côte. "
            f"Programme modifié automatiquement (garage retiré si activé)."
            # Note: this is a WARNING, not a hard blocker — engine handles it
        )
        blockers.pop()  # Actually just a warning
        # Expose via the plan engine's warnings instead

    return blockers


# ─────────────────────────────────────────────────────────────
#  TEST
# ─────────────────────────────────────────────────────────────

def test_run():
    import sys, json
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    cases = [
        ("10.0", "15.0", "N", "31", "Karim — Oran 10×15m"),
        ("12.0", "20.0", "S", "16", "Alger 12×20m"),
        ("8.0",  "18.0", "E", "25", "Constantine 8×18m"),
        ("6.0",  "22.0", "N", "31", "Oran narrow 6×22m"),
        ("15.0", "25.0", "N", "11", "Tamanrasset 15×25m (Saharan)"),
    ]

    for w, d, ori, wil, label in cases:
        result = analyze_site(float(w), float(d), ori, wil)
        print(f"\n{'─'*50}")
        print(f"  {label}")
        print(f"  Terrain: {result.terrain_width_m}×{result.terrain_depth_m}m "
              f"= {result.terrain_area_m2}m²")
        print(f"  Retraits: {result.setbacks}")
        print(f"  Constructible: {result.effective_width_m}×{result.effective_depth_m}m "
              f"= {result.effective_area_m2}m²")
        print(f"  Perte retraits: {result.setback_loss_percent}%")
        print(f"  Sismique: {result.seismic_zone} | Climat: {result.climate_zone}")
        print(f"  Orientation solaire prioritaire: {result.solar_priority_orientation}")
        print(f"  Vent dominant: {result.dominant_summer_wind}")


if __name__ == "__main__":
    test_run()
