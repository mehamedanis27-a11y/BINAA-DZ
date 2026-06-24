"""
BINAA — Module M1: Site Analysis Engine (Oran launch)

Derives site parameters directly from built dimensions and wilaya.
Emprise bâtiment fournie directement par l'utilisateur.
"""

from __future__ import annotations
from .models import (
    WILAYA_SEISMIC_ZONE,
    WILAYA_CLIMATE_ZONE,
    WILAYA_NAMES,
    SiteAnalysisOutput,
    GenerateRequest,
)

def analyze_site(request: GenerateRequest) -> SiteAnalysisOutput:
    """
    Analyze site and construct SiteAnalysisOutput from request.
    """
    built_area_m2 = round(request.built_width_m * request.built_depth_m, 2)
    total_built_area_m2 = round(built_area_m2 * (request.floors + 1), 2)
    
    seismic_zone = WILAYA_SEISMIC_ZONE.get(request.wilaya, "MEDIUM")
    climate_zone = WILAYA_CLIMATE_ZONE.get(request.wilaya, "COASTAL")
    wilaya_name = WILAYA_NAMES.get(request.wilaya, f"Wilaya {request.wilaya}")

    return SiteAnalysisOutput(
        built_width_m=request.built_width_m,
        built_depth_m=request.built_depth_m,
        built_area_m2=built_area_m2,
        total_built_area_m2=total_built_area_m2,
        wilaya=request.wilaya,
        wilaya_name=wilaya_name,
        seismic_zone=seismic_zone,
        climate_zone=climate_zone,
    )

def check_feasibility(
    site: SiteAnalysisOutput,
    floors: int,
    budget: float,
    wilaya: str,
) -> list[str]:
    """
    Returns a list of blocking issues (empty = proceed).
    Feasibility gate using Oran-based cost estimation and minimum program areas.
    """


    blockers = []

    # 1. Gate blocker if width < 4 or depth < 6
    if site.built_width_m < 4.0:
        blockers.append(f"La largeur de l'emprise ({site.built_width_m:.1f} m) est inférieure au minimum de 4.0 m.")
    if site.built_depth_m < 6.0:
        blockers.append(f"La profondeur de l'emprise ({site.built_depth_m:.1f} m) est inférieure au minimum de 6.0 m.")

    # 2. Built area must accommodate minimum program configuration
    # R+0: 40m², R+1: 60m², R+2: 80m²
    min_area = {0: 40.0, 1: 60.0, 2: 80.0}.get(floors, 40.0)
    if site.built_area_m2 < min_area:
        blockers.append(
            f"Surface d'emprise ({site.built_area_m2:.1f} m²) insuffisante pour un R+{floors}. "
            f"Minimum requis: {min_area:.0f} m²."
        )

    # 3. Budget vs minimum construction cost
    # using minimum Oran rate (wilaya 31) * built_area * (floors + 1) * 1.20
    from .cost_engine import get_wilaya_rates, load_pricing_config
    
    oran_rates = get_wilaya_rates("31")
    oran_min_rate = oran_rates["all_in_rate_min"]
    
    config = load_pricing_config()
    contingency_rate = config.get("contingency_rate", 0.20)
    
    total_levels = floors + 1
    cost_minimum_estimate = oran_min_rate * site.built_area_m2 * total_levels * (1 + contingency_rate)

    if budget < cost_minimum_estimate:
        blockers.append(
            f"Budget ({budget:,.0f} DA) insuffisant. Le coût minimum estimé "
            f"pour cette configuration ({site.built_area_m2:.0f} m² en R+{floors}) "
            f"est de {cost_minimum_estimate:,.0f} DA (incluant {int(contingency_rate*100)}% d'imprévus)."
        )

    return blockers
