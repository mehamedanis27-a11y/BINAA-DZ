"""
BINAA — Module M8: Cost Engine v2

CRITICAL FIXES FROM v1:
  1. Per-wilaya rates (58 wilayas, 4 rate tiers)
  2. Seismic surcharge restored (+10% to +22% on gros oeuvre)
  3. Mandatory 20% contingency as explicit line item
  4. Correct upper floor premium (22%, was 15%)
  5. Foundation differentiation (seismic zone × floor count)
  6. Haouch/boundary wall calculated by perimeter, not area
  7. Budget gap calculated and surfaced to user
  8. Structural pre-commitment cost for future floors

RATE BASIS:
  2025-2026 Algerian market survey (Oran, Alger, Constantine,
  Sétif, Annaba, Béjaïa, Tlemcen, Blida, Ouargla cross-referenced).
  All rates in DA/m².
"""

from __future__ import annotations
from .models import (
    CostEstimateOutput, CostBreakdownLine,
    WILAYA_NAMES, WILAYA_SEISMIC_ZONE,
)


# ─────────────────────────────────────────────────────────────
#  WILAYA COST RATES  (DA/m², 2025-2026)
#  Format: go_min, go_max, fin_std_min, fin_std_max
#  go  = gros oeuvre (structure + maçonnerie + couverture)
#  fin = finition standard (enduit, carrelage, menuiserie, plomberie, elect.)
# ─────────────────────────────────────────────────────────────

WILAYA_COST_RATES: dict[str, dict] = {

    # ── TIER 1: ALGER & immediate périphérie (highest costs) ──
    "16": {"go_min": 88_000, "go_max": 118_000, "fin_min": 45_000, "fin_max": 68_000},  # Alger
    "35": {"go_min": 82_000, "go_max": 108_000, "fin_min": 42_000, "fin_max": 62_000},  # Boumerdès
    "42": {"go_min": 80_000, "go_max": 105_000, "fin_min": 40_000, "fin_max": 60_000},  # Tipaza
    "09": {"go_min": 78_000, "go_max": 102_000, "fin_min": 38_000, "fin_max": 58_000},  # Blida

    # ── TIER 2: Major regional cities ──────────────────────────
    "31": {"go_min": 76_000, "go_max":  98_000, "fin_min": 36_000, "fin_max": 55_000},  # Oran
    "25": {"go_min": 68_000, "go_max":  90_000, "fin_min": 33_000, "fin_max": 50_000},  # Constantine
    "23": {"go_min": 70_000, "go_max":  92_000, "fin_min": 34_000, "fin_max": 52_000},  # Annaba
    "06": {"go_min": 72_000, "go_max":  95_000, "fin_min": 35_000, "fin_max": 53_000},  # Béjaïa
    "15": {"go_min": 70_000, "go_max":  93_000, "fin_min": 34_000, "fin_max": 52_000},  # Tizi Ouzou
    "19": {"go_min": 65_000, "go_max":  86_000, "fin_min": 31_000, "fin_max": 48_000},  # Sétif
    "13": {"go_min": 66_000, "go_max":  88_000, "fin_min": 32_000, "fin_max": 49_000},  # Tlemcen
    "05": {"go_min": 62_000, "go_max":  82_000, "fin_min": 30_000, "fin_max": 46_000},  # Batna

    # ── TIER 3: Secondary cities, northern interior ─────────────
    "02": {"go_min": 64_000, "go_max":  84_000, "fin_min": 30_000, "fin_max": 46_000},  # Chlef
    "22": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 45_000},  # Sidi Bel Abbès
    "26": {"go_min": 65_000, "go_max":  86_000, "fin_min": 31_000, "fin_max": 47_000},  # Médéa
    "27": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 44_000},  # Mostaganem
    "34": {"go_min": 63_000, "go_max":  83_000, "fin_min": 30_000, "fin_max": 45_000},  # Bordj Bou Arréridj
    "21": {"go_min": 66_000, "go_max":  87_000, "fin_min": 32_000, "fin_max": 48_000},  # Skikda
    "43": {"go_min": 64_000, "go_max":  85_000, "fin_min": 31_000, "fin_max": 47_000},  # Mila
    "44": {"go_min": 64_000, "go_max":  84_000, "fin_min": 30_000, "fin_max": 46_000},  # Aïn Defla
    "46": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 44_000},  # Aïn Témouchent
    "48": {"go_min": 61_000, "go_max":  81_000, "fin_min": 29_000, "fin_max": 43_000},  # Relizane
    "29": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 44_000},  # Mascara
    "20": {"go_min": 60_000, "go_max":  80_000, "fin_min": 28_000, "fin_max": 43_000},  # Saïda
    "14": {"go_min": 60_000, "go_max":  80_000, "fin_min": 28_000, "fin_max": 42_000},  # Tiaret
    "38": {"go_min": 60_000, "go_max":  80_000, "fin_min": 28_000, "fin_max": 42_000},  # Tissemsilt
    "04": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 44_000},  # Oum el Bouaghi
    "24": {"go_min": 62_000, "go_max":  82_000, "fin_min": 29_000, "fin_max": 44_000},  # Guelma
    "36": {"go_min": 63_000, "go_max":  84_000, "fin_min": 30_000, "fin_max": 45_000},  # El Tarf
    "41": {"go_min": 62_000, "go_max":  83_000, "fin_min": 29_000, "fin_max": 44_000},  # Souk Ahras
    "18": {"go_min": 65_000, "go_max":  86_000, "fin_min": 31_000, "fin_max": 47_000},  # Jijel
    "10": {"go_min": 65_000, "go_max":  86_000, "fin_min": 31_000, "fin_max": 47_000},  # Bouira
    "28": {"go_min": 58_000, "go_max":  78_000, "fin_min": 27_000, "fin_max": 41_000},  # M'Sila
    "12": {"go_min": 60_000, "go_max":  80_000, "fin_min": 28_000, "fin_max": 42_000},  # Tébessa
    "40": {"go_min": 60_000, "go_max":  79_000, "fin_min": 28_000, "fin_max": 42_000},  # Khenchela
    "03": {"go_min": 58_000, "go_max":  77_000, "fin_min": 26_000, "fin_max": 40_000},  # Laghouat
    "17": {"go_min": 57_000, "go_max":  76_000, "fin_min": 26_000, "fin_max": 39_000},  # Djelfa

    # ── TIER 4: Arid/Saharan — transport premium ───────────────
    "30": {"go_min": 78_000, "go_max": 105_000, "fin_min": 35_000, "fin_max": 52_000},  # Ouargla
    "07": {"go_min": 72_000, "go_max":  96_000, "fin_min": 32_000, "fin_max": 48_000},  # Biskra
    "08": {"go_min": 80_000, "go_max": 108_000, "fin_min": 36_000, "fin_max": 54_000},  # Béchar
    "39": {"go_min": 75_000, "go_max": 100_000, "fin_min": 33_000, "fin_max": 50_000},  # El Oued
    "47": {"go_min": 72_000, "go_max":  96_000, "fin_min": 32_000, "fin_max": 48_000},  # Ghardaïa
    "32": {"go_min": 76_000, "go_max": 102_000, "fin_min": 33_000, "fin_max": 50_000},  # El Bayadh
    "45": {"go_min": 72_000, "go_max":  96_000, "fin_min": 31_000, "fin_max": 47_000},  # Naâma
    "11": {"go_min": 92_000, "go_max": 125_000, "fin_min": 38_000, "fin_max": 58_000},  # Tamanrasset
    "33": {"go_min": 95_000, "go_max": 130_000, "fin_min": 40_000, "fin_max": 60_000},  # Illizi
    "37": {"go_min": 98_000, "go_max": 135_000, "fin_min": 42_000, "fin_max": 62_000},  # Tindouf
    "01": {"go_min": 90_000, "go_max": 122_000, "fin_min": 38_000, "fin_max": 57_000},  # Adrar
    "49": {"go_min": 88_000, "go_max": 118_000, "fin_min": 37_000, "fin_max": 56_000},  # Timimoun
    "50": {"go_min": 96_000, "go_max": 130_000, "fin_min": 40_000, "fin_max": 60_000},  # Bordj Badji Mokhtar
    "51": {"go_min": 82_000, "go_max": 110_000, "fin_min": 35_000, "fin_max": 53_000},  # Ouled Djellal
    "52": {"go_min": 88_000, "go_max": 118_000, "fin_min": 37_000, "fin_max": 56_000},  # Béni Abbès
    "53": {"go_min": 90_000, "go_max": 122_000, "fin_min": 38_000, "fin_max": 57_000},  # In Salah
    "54": {"go_min": 96_000, "go_max": 130_000, "fin_min": 40_000, "fin_max": 60_000},  # In Guezzam
    "55": {"go_min": 78_000, "go_max": 105_000, "fin_min": 34_000, "fin_max": 51_000},  # Touggourt
    "56": {"go_min": 95_000, "go_max": 128_000, "fin_min": 40_000, "fin_max": 59_000},  # Djanet
    "57": {"go_min": 76_000, "go_max": 102_000, "fin_min": 33_000, "fin_max": 50_000},  # El M'Ghair
    "58": {"go_min": 78_000, "go_max": 105_000, "fin_min": 34_000, "fin_max": 51_000},  # El Menia

    # ── FALLBACK ───────────────────────────────────────────────
    "DEFAULT": {"go_min": 68_000, "go_max": 92_000, "fin_min": 32_000, "fin_max": 48_000},
}


# ─────────────────────────────────────────────────────────────
#  SEISMIC SURCHARGE ON GROS OEUVRE
#  Source: RPA 99 v2003 — additional structural requirements
#  Column upgrade + stirrup density + engineer consultation fee
# ─────────────────────────────────────────────────────────────

SEISMIC_SURCHARGE = {
    "HIGH":   0.22,   # +22%: column upgrade 25→35cm + stirrups + engineer mandatory
    "MEDIUM": 0.10,   # +10%: column upgrade 25→30cm + standard stirrups
    "LOW":    0.00,   # no additional cost
}

# Upper floor premium — béton armé multi-floor construction
# Includes: pumping, scaffolding, formwork, upper-level delivery
UPPER_FLOOR_PREMIUM = 0.22   # +22% per upper floor (was 0.15 in v1 — wrong)

# Mandatory contingency — Algerian construction reality
CONTINGENCY_RATE = 0.20      # 20% — non-negotiable

# Haouch / clôture — boundary wall per linear meter
HAOUCH_WALL_COST_PER_ML = {
    "LOW": 18_000,
    "MEDIUM": 22_000,
    "HIGH": 28_000,
}   # DA per linear meter of boundary wall (béton + hourdis + enduit)

# Structural pre-commitment (future floor preparation)
# Extra cost in Phase 1 to allow R+1 later
FUTURE_PROOFING_RATE = 0.10  # +10% on gros oeuvre for future floor structural upgrade

# ── v2.1 NEW CONSTANTS ───────────────────────────────────────

FINISH_RATE_MULTIPLIERS: dict[str, float] = {
    "economy":  0.70,
    "standard": 1.00,
    "premium":  1.60,
}

FOUNDATION_SOIL_MULTIPLIERS: dict[str, float] = {
    "rocky":   1.00,
    "compact": 1.20,
    "soft":    1.80,
    "unknown": 1.80,
}

SLOPE_SUPPLEMENT_DA: dict[str, tuple[int, int]] = {
    "flat":   (0, 0),
    "slight": (300_000, 800_000),
    "steep":  (800_000, 2_500_000),
}

ROOF_RATE_DA_PER_M2: dict[str, tuple[int, int]] = {
    "terrasse_plate": (450, 700),
    "pitched":        (1_500, 3_500),
}

VRD_CONNECTION_COSTS_DA: dict[str, tuple[int, int]] = {
    "aep":            (80_000,  150_000),
    "elec":           (80_000,  200_000),
    "gaz":            (60_000,  120_000),
    "assainissement": (80_000,  250_000),
}

PLOMBERIE_RATE_PER_WET_ROOM: dict[str, tuple[int, int]] = {
    "economy":  (200_000, 300_000),
    "standard": (300_000, 450_000),
    "premium":  (450_000, 800_000),
}

PRICE_DATA_DATE = "Juin 2026"


# ─────────────────────────────────────────────────────────────
#  FOUNDATION COST SUPPLEMENT
#  Added ON TOP of gros oeuvre for specific conditions
# ─────────────────────────────────────────────────────────────

def _foundation_supplement(
    footprint_m2: float,
    seismic_zone: str,
    floors: int,
    soil_category: str = "compact",
) -> tuple[int, int, str]:
    """
    Returns (min_supplement, max_supplement, note) for foundation.
    This is added to the gros oeuvre cost.
    """
    # Base: semelles isolées (isolated footings) — standard Algerian
    base_rate = 8_000  # DA/m² of footprint

    # Seismic: requires longrine de fondation (tie beams between footings)
    if seismic_zone == "HIGH":
        base_rate += 5_000   # tie beams + deeper foundations
        note = "Longrine de fondation + semelles élargies (zone sismique haute)"
    elif seismic_zone == "MEDIUM":
        base_rate += 2_500
        note = "Longrine de fondation (zone sismique moyenne)"
    else:
        note = "Semelles isolées standard"

    # Multi-floor: wider footings for load
    if floors >= 2:
        base_rate += 3_000
        note += " — semelles R+2 élargies"
    elif floors >= 1:
        base_rate += 1_500

    soil_mult = FOUNDATION_SOIL_MULTIPLIERS.get(soil_category, 1.20)
    foundation_type_note = {
        "rocky":   "Semelles isolées sur roche",
        "compact": "Semelles isolées + longrines",
        "soft":    "Radier général requis — sol meuble",
        "unknown": "Radier général (sol inconnu — conservatif)",
    }.get(soil_category, "Semelles isolées")
    if soil_category == "unknown":
        note += " — Étude géotechnique recommandée avant terrassement"
    note = foundation_type_note + " — " + note

    min_supp = int(footprint_m2 * base_rate * 0.90 * soil_mult)
    max_supp = int(footprint_m2 * base_rate * 1.20 * soil_mult)

    return min_supp, max_supp, note


# ─────────────────────────────────────────────────────────────
#  MAIN COST CALCULATION
# ─────────────────────────────────────────────────────────────

def calculate_cost(
    footprint_m2: float,
    floors: int,
    future_floors: int,
    wilaya: str,
    seismic_zone: str,
    budget: float,
    terrain_width: float = 0.0,
    terrain_depth: float = 0.0,
    finish_level: str = "standard",
    soil_category: str = "compact",
    slope_category: str = "flat",
    roof_type: str = "terrasse_plate",
    vrd_aep: bool = True,
    vrd_elec: bool = True,
    vrd_gaz: bool = True,
    vrd_assainissement: bool = True,
    wet_rooms: int = 3,
) -> CostEstimateOutput:
    """
    Calculate a realistic construction cost estimate.

    Args:
        footprint_m2:    Effective buildable footprint (m²)
        floors:          Number of floors being built (0=RDC only, 1=R+1...)
        future_floors:   Future floors planned (0=none)
        wilaya:          2-digit wilaya code
        seismic_zone:    HIGH / MEDIUM / LOW
        budget:          User's total budget in DA
        terrain_width:   For haouch perimeter calculation
        terrain_depth:   For haouch perimeter calculation

    Returns:
        CostEstimateOutput with full breakdown.
    """
    rates = WILAYA_COST_RATES.get(wilaya, WILAYA_COST_RATES["DEFAULT"])
    wilaya_name = WILAYA_NAMES.get(wilaya, f"Wilaya {wilaya}")
    seismic_surcharge = SEISMIC_SURCHARGE[seismic_zone]

    total_floors = 1 + floors   # total levels (RDC + étages)
    total_area = footprint_m2 * total_floors

    breakdown: list[CostBreakdownLine] = []

    # ── 1. FONDATIONS ─────────────────────────────────────────
    found_min, found_max, found_note = _foundation_supplement(
        footprint_m2, seismic_zone, floors, soil_category
    )
    breakdown.append(CostBreakdownLine(
        label_fr="Fondations",
        area_m2=footprint_m2,
        rate_da_per_m2=int(found_min / max(footprint_m2, 1)),
        amount_min=found_min,
        amount_max=found_max,
        note=found_note,
    ))

    # ── 2. GROS OEUVRE — RDC ──────────────────────────────────
    go_min_adj = int(rates["go_min"] * (1 + seismic_surcharge))
    go_max_adj = int(rates["go_max"] * (1 + seismic_surcharge))

    go_rdc_min = int(footprint_m2 * go_min_adj)
    go_rdc_max = int(footprint_m2 * go_max_adj)
    breakdown.append(CostBreakdownLine(
        label_fr="Gros œuvre — RDC (structure + maçonnerie)",
        area_m2=footprint_m2,
        rate_da_per_m2=go_min_adj,
        amount_min=go_rdc_min,
        amount_max=go_rdc_max,
        note=f"Zone sismique {seismic_zone} — surcharge +{int(seismic_surcharge*100)}% incluse",
    ))

    # ── 3. GROS OEUVRE — ÉTAGES ───────────────────────────────
    go_upper_min = go_upper_max = 0
    if floors > 0:
        upper_rate_min = int(go_min_adj * (1 + UPPER_FLOOR_PREMIUM))
        upper_rate_max = int(go_max_adj * (1 + UPPER_FLOOR_PREMIUM))
        go_upper_min = int(footprint_m2 * upper_rate_min * floors)
        go_upper_max = int(footprint_m2 * upper_rate_max * floors)
        breakdown.append(CostBreakdownLine(
            label_fr=f"Gros œuvre — {floors} étage(s) supérieur(s)",
            area_m2=footprint_m2 * floors,
            rate_da_per_m2=upper_rate_min,
            amount_min=go_upper_min,
            amount_max=go_upper_max,
            note=f"+{int(UPPER_FLOOR_PREMIUM*100)}% prime étage (pompage, coffrage, échafaudage)",
        ))

    # ── 4. PRÉ-ENGAGEMENT STRUCTUREL (futurs étages) ──────────
    future_cost_min = future_cost_max = 0
    if future_floors > floors:
        future_cost_min = int(footprint_m2 * go_min_adj * FUTURE_PROOFING_RATE)
        future_cost_max = int(footprint_m2 * go_max_adj * FUTURE_PROOFING_RATE)
        breakdown.append(CostBreakdownLine(
            label_fr=f"Pré-engagement structurel R+{future_floors}",
            area_m2=footprint_m2,
            rate_da_per_m2=int(go_min_adj * FUTURE_PROOFING_RATE),
            amount_min=future_cost_min,
            amount_max=future_cost_max,
            note="Surdimensionnement poteaux + dalle 20cm + réservations (maintenant obligatoire pour extension future)",
        ))

    # ── SLOPE / TERRASSEMENT SUPPLEMENT ──────────────────────
    slope_min, slope_max = SLOPE_SUPPLEMENT_DA.get(slope_category, (0, 0))
    if slope_min > 0:
        breakdown.append(CostBreakdownLine(
            label_fr="Terrassement / Soutènement",
            area_m2=footprint_m2,
            rate_da_per_m2=int(slope_min / max(footprint_m2, 1)),
            amount_min=slope_min,
            amount_max=slope_max,
            note={
                "slight": "Légère pente — terrassement + murs de soutènement légers",
                "steep":  "Forte pente — murs de soutènement + excavation importante",
            }.get(slope_category, ""),
        ))

    # ── 5. FINITION ───────────────────────────────────────────
    finish_mult = FINISH_RATE_MULTIPLIERS.get(finish_level, 1.00)
    fin_min = int(total_area * rates["fin_min"] * finish_mult)
    fin_max = int(total_area * rates["fin_max"] * finish_mult)
    breakdown.append(CostBreakdownLine(
        label_fr=f"Finition {finish_level} ({total_area:.0f} m²)",
        area_m2=total_area,
        rate_da_per_m2=rates["fin_min"],
        amount_min=fin_min,
        amount_max=fin_max,
        note="Enduit, carrelage, menuiserie, plomberie, électricité, peinture",
    ))

    # ── 6. CLÔTURE / HAOUCH ───────────────────────────────────
    perimeter_ml = 0.0
    if terrain_width > 0 and terrain_depth > 0:
        perimeter_ml = 2 * (terrain_width + terrain_depth)
    else:
        # Estimate from footprint
        side = footprint_m2 ** 0.5
        perimeter_ml = 4 * side * 1.3  # rough estimate

    wall_rate = HAOUCH_WALL_COST_PER_ML.get(seismic_zone, 22_000)
    haouch_min = int(perimeter_ml * wall_rate * 0.85)
    haouch_max = int(perimeter_ml * wall_rate * 1.15)
    breakdown.append(CostBreakdownLine(
        label_fr=f"Clôture / Haouch ({perimeter_ml:.0f} ml de périmètre)",
        area_m2=0,
        rate_da_per_m2=wall_rate,
        rate_unit="ml",
        amount_min=haouch_min,
        amount_max=haouch_max,
        note="Mur de clôture béton + hourdis + enduit + portail",
    ))

    # ── TOITURE ───────────────────────────────────────────────
    roof_rate_min, roof_rate_max = ROOF_RATE_DA_PER_M2.get(roof_type, (450, 700))
    roof_min = int(footprint_m2 * roof_rate_min)
    roof_max = int(footprint_m2 * roof_rate_max)
    roof_label = "Toiture / Étanchéité" if roof_type == "terrasse_plate" else "Toiture / Charpente"
    roof_note = {
        "terrasse_plate": "Étanchéité bicouche + isolation thermique + chape de pente",
        "pitched":        "Charpente bois + couverture tuiles + zinguerie",
    }.get(roof_type, "")
    breakdown.append(CostBreakdownLine(
        label_fr=roof_label,
        area_m2=footprint_m2,
        rate_da_per_m2=roof_rate_min,
        amount_min=roof_min,
        amount_max=roof_max,
        note=roof_note,
    ))

    # ── VRD / RACCORDEMENTS ───────────────────────────────────
    vrd_total_min = vrd_total_max = 0
    missing_networks: list[str] = []
    for network, (cost_min, cost_max), is_connected, label in [
        ("aep",            VRD_CONNECTION_COSTS_DA["aep"],            vrd_aep,            "Eau potable (AEP)"),
        ("elec",           VRD_CONNECTION_COSTS_DA["elec"],           vrd_elec,           "Électricité Sonelgaz"),
        ("gaz",            VRD_CONNECTION_COSTS_DA["gaz"],            vrd_gaz,            "Gaz de ville"),
        ("assainissement", VRD_CONNECTION_COSTS_DA["assainissement"], vrd_assainissement, "Assainissement"),
    ]:
        if not is_connected:
            vrd_total_min += cost_min
            vrd_total_max += cost_max
            missing_networks.append(label)

    if vrd_total_min > 0:
        vrd_note = "Raccordements à prévoir: " + ", ".join(missing_networks)
        if not vrd_assainissement:
            vrd_note += ". Fosse septique requise si réseau d'assainissement absent."
        breakdown.append(CostBreakdownLine(
            label_fr="Raccordements VRD",
            area_m2=0,
            rate_da_per_m2=0,
            amount_min=vrd_total_min,
            amount_max=vrd_total_max,
            note=vrd_note,
        ))

    # ── PLOMBERIE SANITAIRES ──────────────────────────────────
    plomb_rate_min, plomb_rate_max = PLOMBERIE_RATE_PER_WET_ROOM.get(finish_level, (300_000, 450_000))
    plomb_min = wet_rooms * plomb_rate_min
    plomb_max = wet_rooms * plomb_rate_max
    breakdown.append(CostBreakdownLine(
        label_fr=f"Plomberie sanitaires ({wet_rooms} pièces humides)",
        area_m2=0,
        rate_da_per_m2=0,
        amount_min=plomb_min,
        amount_max=plomb_max,
        note=f"Cuisine + SDB + WC — niveau {finish_level}. Tuyauterie PPR + appareils sanitaires.",
    ))
    # Reduce finition min/max by 15% to avoid double-counting plomberie
    # (plomberie was previously absorbed into the finition aggregate rate)
    fin_min = int(fin_min * 0.85)
    fin_max = int(fin_max * 0.85)
    # Update the finition breakdown line that was already appended
    for line in breakdown:
        if line.label_fr.startswith("Finition"):
            line.amount_min = fin_min
            line.amount_max = fin_max
            break

    # ── 7. SOUS-TOTAL ──────────────────────────────────────────
    subtotal_min = (found_min + slope_min + go_rdc_min + go_upper_min +
                    future_cost_min + fin_min + haouch_min +
                    roof_min + vrd_total_min + plomb_min)
    subtotal_max = (found_max + slope_max + go_rdc_max + go_upper_max +
                    future_cost_max + fin_max + haouch_max +
                    roof_max + vrd_total_max + plomb_max)

    # ── 8. IMPRÉVUS (CONTINGENCY) — MANDATORY ─────────────────
    contingency_min = int(subtotal_min * CONTINGENCY_RATE)
    contingency_max = int(subtotal_max * CONTINGENCY_RATE)
    breakdown.append(CostBreakdownLine(
        label_fr="Imprévus (20%) — OBLIGATOIRE",
        rate_da_per_m2=0,
        amount_min=contingency_min,
        amount_max=contingency_max,
        note="Algérie: inflation matériaux, problèmes de chantier, modifications en cours. NON OPTIONNEL.",
    ))

    # ── 9. TOTAUX FINAUX ───────────────────────────────────────
    total_min = subtotal_min + contingency_min
    total_max = subtotal_max + contingency_max

    cost_per_m2_min = int(total_min / max(total_area, 1))
    cost_per_m2_max = int(total_max / max(total_area, 1))

    # ── 10. SEISMIC SURCHARGE SUMMARY ─────────────────────────
    # How much extra the user pays because of seismic zone
    seismic_amount = int(
        (go_rdc_min + go_upper_min) * seismic_surcharge / (1 + seismic_surcharge)
    )

    # ── 11. BUDGET STATUS ──────────────────────────────────────
    budget_gap, budget_status, budget_message = _evaluate_budget(
        budget, total_min, total_max, wilaya_name
    )

    return CostEstimateOutput(
        estimated_min_da=total_min,
        estimated_max_da=total_max,
        cost_per_m2_min=cost_per_m2_min,
        cost_per_m2_max=cost_per_m2_max,
        total_built_m2=total_area,
        breakdown=breakdown,
        contingency_da=contingency_min,
        seismic_surcharge_da=seismic_amount,
        budget_status=budget_status,
        budget_message=budget_message,
        budget_gap_da=budget_gap,
        wilaya_name=wilaya_name,
        seismic_zone=seismic_zone,
        rates_note=f"Taux {wilaya_name} 2025-2026 — zone sismique {seismic_zone}",
        price_data_date=PRICE_DATA_DATE,
    )


def _evaluate_budget(
    budget: float,
    total_min: int,
    total_max: int,
    wilaya_name: str,
) -> tuple[int, str, str]:
    """Returns (gap_da, status_key, message_fr)."""

    if budget >= total_max:
        gap = 0
        status = "comfortable"
        msg = (f"Budget confortable. Vous disposez d'une marge de "
               f"{int(budget - total_max):,} DA après la fourchette haute.")

    elif budget >= total_min:
        gap = 0
        status = "sufficient"
        msg = (f"Budget suffisant pour la fourchette basse. "
               f"Attention: la fourchette haute dépasse votre budget de "
               f"{int(total_max - budget):,} DA. Marge de sécurité recommandée.")

    elif budget >= total_min * 0.80:
        gap = int(total_min - budget)
        status = "tight"
        msg = (f"Budget insuffisant de {gap:,} DA par rapport à la fourchette minimale. "
               f"Réduisez le programme (superficie, finitions) ou augmentez le budget "
               f"avant de commencer.")

    else:
        gap = int(total_min - budget)
        status = "insufficient"
        msg = (f"Budget très insuffisant. Il manque {gap:,} DA pour atteindre "
               f"la fourchette minimale à {wilaya_name}. "
               f"Ce projet n'est pas réalisable avec ce budget. "
               f"Envisagez: R+0 seulement, terrain moins cher, ou report du projet.")

    return gap, status, msg


# ─────────────────────────────────────────────────────────────
#  TEST RUN
# ─────────────────────────────────────────────────────────────

def test_run():
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    # Karim: Oran, 70m² footprint, R+1, future R+2, 15M DA budget
    result = calculate_cost(
        footprint_m2=70.0,
        floors=1,
        future_floors=2,
        wilaya="31",
        seismic_zone="MEDIUM",
        budget=15_000_000,
        terrain_width=10.0,
        terrain_depth=15.0,
    )

    print(f"\n{'═'*55}")
    print(f"  ESTIMATION COÛT — {result.wilaya_name}")
    print(f"  Zone sismique: {result.seismic_zone}")
    print(f"{'─'*55}")
    for line in result.breakdown:
        print(f"  {line.label_fr:<45} "
              f"{line.amount_min:>12,} → {line.amount_max:>12,} DA")
    print(f"{'─'*55}")
    print(f"  TOTAL ESTIMÉ:  {result.estimated_min_da:>12,} → "
          f"{result.estimated_max_da:>12,} DA")
    print(f"  Coût/m²:       {result.cost_per_m2_min:>12,} → "
          f"{result.cost_per_m2_max:>12,} DA/m²")
    print(f"  Surcharge sismique: {result.seismic_surcharge_da:,} DA")
    print(f"  Imprévus (20%):     {result.contingency_da:,} DA")
    print(f"\n  Budget utilisateur: {15_000_000:,} DA")
    print(f"  Statut: {result.budget_status.upper()}")
    print(f"  {result.budget_message}")


if __name__ == "__main__":
    test_run()
