"""
BINAA — Module M8: Cost Engine v3 (Oran launch)

Simplified pricing engine using external pricing_config.json.
Implemented using Method 01 (all-in rate * total area).
"""

from __future__ import annotations
import json
import os
from functools import lru_cache

from .models import CostEstimateOutput, WILAYA_NAMES, SiteAnalysisOutput, GenerateRequest


@lru_cache(maxsize=1)
def load_pricing_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "pricing_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_wilaya_rates(wilaya_code: str) -> dict:
    config = load_pricing_config()
    wilayas = config["wilayas"]
    return wilayas.get(wilaya_code, wilayas["DEFAULT"])


def evaluate_budget(budget: float, cost_min: float, cost_max: float) -> dict:
    """
    Evaluate user budget against estimated construction costs.
    Returns budget status, shortfall, margin, and coverage percentage.
    """
    if budget >= cost_max:
        status = "comfortable"
    elif budget >= cost_min:
        status = "sufficient"
    elif budget >= cost_min * 0.80:
        status = "tight"
    else:
        status = "insufficient"

    shortfall_da = max(0.0, cost_min - budget)
    margin_da = max(0.0, budget - cost_max)
    coverage_pct = round((budget / cost_min) * 100, 1) if cost_min > 0 else 100.0

    return {
        "status": status,
        "shortfall_da": shortfall_da,
        "margin_da": margin_da,
        "coverage_pct": coverage_pct,
    }


def calculate_cost(
    site_analysis: SiteAnalysisOutput,
    request: GenerateRequest
) -> CostEstimateOutput:
    """
    Calculate estimated construction cost using Method 01 (all-in rate * total area).
    No seismic surcharges, no floor premiums, no foundation premiums.
    """
    # 1. Surface totale construite
    total_built_area = (
        request.built_width_m *
        request.built_depth_m *
        (request.floors + 1)
    )

    # 2. Taux depuis pricing_config.json
    rates = get_wilaya_rates(request.wilaya)
    config = load_pricing_config()
    contingency = rates.get("contingency_rate", config.get("contingency_rate", 0.20))

    # 3. Calcul simple
    base_min = total_built_area * rates["all_in_rate_min"]
    base_max = total_built_area * rates["all_in_rate_max"]
    cost_min = round(base_min * (1 + contingency))
    cost_max = round(base_max * (1 + contingency))

    # 4. Ventilation simplifiée (3 lignes)
    contingency_amount_min = round(base_min * contingency)
    contingency_amount_max = round(base_max * contingency)

    breakdown = {
        "structure_et_finitions": {
            "min": round(base_min),
            "max": round(base_max),
            "description": "Gros œuvre + finitions (tout compris)"
        },
        "imprévus": {
            "min": contingency_amount_min,
            "max": contingency_amount_max,
            "description": "Provision imprévus 20% — obligatoire Algérie"
        },
        "total": {
            "min": cost_min,
            "max": cost_max
        }
    }

    # 5. Évaluation budget
    budget_eval = evaluate_budget(request.budget, cost_min, cost_max)

    return CostEstimateOutput(
        cost_min=cost_min,
        cost_max=cost_max,
        currency="DZD",
        built_area_total_m2=total_built_area,
        rate_min_per_m2=rates["all_in_rate_min"],
        rate_max_per_m2=rates["all_in_rate_max"],
        contingency_rate=contingency,
        budget_status=budget_eval["status"],
        breakdown=breakdown,
        pricing_last_updated=config.get("last_updated", "N/A"),
        validation_source=config.get("validation_source", "")
    )


def test_run():
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    req = GenerateRequest.model_construct(
        built_width_m=10.0,
        built_depth_m=10.0,
        wilaya="31",
        family_size=5,
        generations=1,
        has_car=True,
        guest_frequency="MEDIUM",
        floors=0,  # R+0 -> floors = 0
        budget=12_000_000.0,
    )
    site = SiteAnalysisOutput.model_construct(
        built_width_m=10.0,
        built_depth_m=10.0,
        built_area_m2=100.0,
        seismic_zone="MEDIUM",
        climate_zone="COASTAL",
    )
    result = calculate_cost(site, req)

    print(f"\n{'═'*55}")
    print(f"  TEST METHOD 01 — Oran R+0 (100m²)")
    print(f"{'─'*55}")
    print(f"  TOTAL ESTIMÉ:  {result.cost_min:>12,} → {result.cost_max:>12,} DA")
    print(f"  Budget: {req.budget:,} DA")
    print(f"  Statut: {result.budget_status.upper()}")
    print(f"  Validation: {result.validation_source}")
    print(f"  Mise à jour: {result.pricing_last_updated}")


if __name__ == "__main__":
    test_run()
