"""
BINAA — API Routes v2

Pipeline execution order (MUST NOT be changed):
  M0: Feasibility gate
  M1: Site analysis
  M3: Structural grid
  M2: Plan generation (uses grid)
  M7: Validation
  M8: Cost estimate
  Output assembly

Each module receives the output of the previous as input.
No module can override constraints set by an earlier module.
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .models import (
    GenerateRequest, GenerateResponse, GenerateResponseData,
    ErrorResponse, ErrorDetail,
)
from .site_analysis import analyze_site, check_feasibility
from .structural_grid import generate_structural_grid
from .plan_engine import generate_plan
from .validation_engine import validate_plan
from .cost_engine import calculate_cost
from .material_engine import get_material_recommendations

router = APIRouter()


@router.get("/admin/reload-pricing", summary="Recharger les taux de construction")
async def reload_pricing():
    from .cost_engine import load_pricing_config
    load_pricing_config.cache_clear()
    config = load_pricing_config()
    return {
        "status": "success", 
        "message": "Configuration pricing rechargée", 
        "version": config.get("version"),
        "last_updated": config.get("last_updated")
    }

@router.post(
    "/generate",
    response_model=GenerateResponse,
    summary="Générer un plan architectural",
    description=(
        "Pipeline complet: analyse de terrain → grille structurelle → "
        "programme spatial → placement des pièces → validation → coût."
    ),
)
async def generate_plan_endpoint(request: GenerateRequest):
    """
    Main generation endpoint.
    Executes the 8-module pipeline in strict order.
    """

    # ── M0 + M1: SITE ANALYSIS ──
    site = analyze_site(request)

    blockers = check_feasibility(
        site,
        request.floors,
        request.budget,
        request.wilaya,
    )

    if blockers:
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                message="Projet non faisable avec ces paramètres",
                errors=[
                    ErrorDetail(field="general", message=b)
                    for b in blockers
                ],
            ).model_dump(),
        )

    # ── M3: STRUCTURAL GRID ───────────────────────────────────
    grid = generate_structural_grid(request)

    # ── M2: PLAN GENERATION ───────────────────────────────────
    floor_outputs, plan_summary, gen_warnings = generate_plan(
        effective_width=site.built_width_m,
        effective_depth=site.built_depth_m,
        family_size=request.family_size,
        generations=request.generations,
        independent_generations=request.independent_generations,
        has_car=request.has_car,
        car_count=request.car_count,
        guest_frequency=request.guest_frequency,
        floors=request.floors,
        future_floors=request.floors,
        budget=request.budget,
        grid=grid,
        solar_priority="S",
        street_orientation="N",
        wilaya_name=site.wilaya_name,
        seismic_zone=site.seismic_zone,
        climate_zone=site.climate_zone,
    )

    # Patch summary fields that need site data
    plan_summary.built_area_m2 = site.built_area_m2

    # ── M8: COST ENGINE ───────────────────────────────────────
    cost_estimate = calculate_cost(
        site_analysis=site,
        request=request,
    )

    # ── M7: VALIDATION ────────────────────────────────────────
    validation = validate_plan(
        floors=floor_outputs,
        seismic_zone=site.seismic_zone,
        climate_zone=site.climate_zone,
        max_span_m=grid.max_span_m,
        has_car=request.has_car,
        guest_frequency=request.guest_frequency,
        soil_category=request.soil_category,
        slope_category=request.slope_category,
        finish_level=request.finish_level,
        budget_status=cost_estimate.budget_status,
    )

    # Block output on UNBUILDABLE (only critical failures)
    if validation.status == "UNBUILDABLE":
        # We still return the plan so the frontend can show what's wrong,
        # but add a top-level warning and set HTTP 207 (multi-status)
        pass  # Handled in response — frontend shows red overlay

    # ── MATERIALS ─────────────────────────────────────────────
    materials = get_material_recommendations(
        budget_status=cost_estimate.budget_status,
        total_floor_area_m2=plan_summary.total_built_area_m2,
        seismic_zone=site.seismic_zone,
        climate_zone=site.climate_zone,
        wilaya=request.wilaya,
        finish_level=request.finish_level,
    )

    # ── ASSEMBLE RESPONSE ─────────────────────────────────────
    response_data = GenerateResponseData(
        input_params=request.model_dump(),
        site_analysis=site,
        structural_grid=grid,
        summary=plan_summary,
        floors=floor_outputs,
        validation=validation,
        warnings=gen_warnings,
        cost_estimate=cost_estimate,
        material_recommendations=materials,
    )

    http_status = 207 if validation.status == "UNBUILDABLE" else 200
    msg = {
        "GOOD":        "Plan généré avec succès.",
        "ACCEPTABLE":  "Plan généré avec quelques avertissements mineurs.",
        "PROBLEMATIC": "Plan généré — problèmes significatifs détectés. Révision recommandée.",
        "UNBUILDABLE": "Plan généré mais NON CONSTRUCTIBLE — violations critiques à corriger.",
    }.get(validation.status, "Plan généré.")

    return JSONResponse(
        status_code=http_status,
        content=GenerateResponse(
            status="success",
            message=msg,
            data=response_data,
        ).model_dump(),
    )


@router.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0", "system": "BINAA Architectural Engine"}


@router.get("/wilayas")
async def get_wilayas():
    """Return all 58 wilayas with codes and derived properties."""
    from .models import WILAYA_NAMES, WILAYA_SEISMIC_ZONE, WILAYA_CLIMATE_ZONE
    return {
        code: {
            "name": name,
            "seismic_zone": WILAYA_SEISMIC_ZONE.get(code, "MEDIUM"),
            "climate_zone": WILAYA_CLIMATE_ZONE.get(code, "COASTAL"),
        }
        for code, name in WILAYA_NAMES.items()
    }
