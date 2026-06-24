import sys
import math
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.models import GenerateRequest
from app.site_analysis import analyze_site
from app.structural_grid import generate_structural_grid
from app.plan_engine import generate_plan
from app.validation_engine import validate_plan

BASE_R1 = {
    "built_width_m": 10.0,
    "built_depth_m": 15.0,
    "wilaya": "31",
    "family_size": 6,
    "generations": 2,  # multigenerational -> bedroom upper floor + stair
    "has_car": True,
    "guest_frequency": "HIGH",
    "floors": 1,
    "budget": 20_000_000.0,
    "slope_category": "flat",
    "soil_category": "compact",
    "roof_type": "terrasse_plate",
    "finish_level": "standard",
    "independent_generations": False,
    "car_count": 1,
    "vrd_aep": True, "vrd_elec": True, "vrd_gaz": True, "vrd_assainissement": True,
}

BASE_R0 = {
    "built_width_m": 12.0,
    "built_depth_m": 14.0,
    "wilaya": "31",
    "family_size": 4,
    "generations": 1,
    "has_car": False,
    "guest_frequency": "LOW",
    "floors": 0,
    "budget": 15_000_000.0,
    "slope_category": "flat",
    "soil_category": "compact",
    "roof_type": "terrasse_plate",
    "finish_level": "standard",
    "independent_generations": False,
    "car_count": 0,
    "vrd_aep": True, "vrd_elec": True, "vrd_gaz": True, "vrd_assainissement": True,
}

def run_pipeline(base_dict):
    req = GenerateRequest(**base_dict)
    site = analyze_site(req)
    grid = generate_structural_grid(req)
    floor_outputs, plan_summary, gen_warnings = generate_plan(
        effective_width=site.built_width_m,
        effective_depth=site.built_depth_m,
        family_size=req.family_size,
        generations=req.generations,
        independent_generations=req.independent_generations,
        has_car=req.has_car,
        car_count=req.car_count,
        guest_frequency=req.guest_frequency,
        floors=req.floors,
        future_floors=req.floors,
        budget=req.budget,
        grid=grid,
        solar_priority="S",
        street_orientation="N",
        wilaya_name=site.wilaya_name,
        seismic_zone=site.seismic_zone,
        climate_zone=site.climate_zone,
    )
    validation = validate_plan(
        floors=floor_outputs,
        seismic_zone=site.seismic_zone,
        climate_zone=site.climate_zone,
        max_span_m=grid.max_span_m,
        has_car=req.has_car,
        guest_frequency=req.guest_frequency,
        soil_category=req.soil_category,
        slope_category=req.slope_category,
        finish_level=req.finish_level,
        budget_status="sufficient",
    )
    return floor_outputs, plan_summary, validation

# Test R+0 validation status
print("--- RUNNING R+0 VALIDATION TEST ---")
floors, summary, validation = run_pipeline(BASE_R0)
print(f"R+0 status: {validation.status}")
print(f"R+0 issues count: {len(validation.issues)}")
for issue in validation.issues:
    print(f"  [{issue.severity}] {issue.code}: {issue.message_fr}")
assert validation.status in ("GOOD", "ACCEPTABLE"), f"R+0 validation failed with status {validation.status}"
print("AC6 PASS: R+0 passes with GOOD or ACCEPTABLE status.")

# Check multi-generation R+1 statistics
print("\n--- RUNNING MULTI-GENERATION R+1 STATS TEST (10 iterations) ---")
runs = 10
bedroom_accessibility_ok = 0
wet_adjacencies_ok = 0
bedroom_clustering_ok = 0
staircase_not_street_facade = 0
window_existence_ok = 0

for i in range(runs):
    params = BASE_R1.copy()
    # Vary width and depth slightly to test robustness across sizes
    params["built_width_m"] = 9.0 + (i % 3) * 1.5
    params["built_depth_m"] = 13.0 + (i % 2) * 2.0
    
    floors, summary, validation = run_pipeline(params)
    
    # Check bedroom accessibility
    bedroom_issues = [iss for iss in validation.issues if iss.code in ("BEDROOM_UNREACHABLE", "BEDROOM_THROUGH_PUBLIC")]
    if not bedroom_issues:
        bedroom_accessibility_ok += 1
    else:
        print(f"Run {i}: accessibility issue found:")
        for iss in bedroom_issues:
            print(f"  {iss.code}: {iss.message_fr}")
        
    # Check kitchen & sdb_principale adjacency (or wc_separe & sdb_principale, etc.)
    # The requirement is: "La cuisine et la sdb_principale sont adjacentes dans au moins 60% des générations"
    cuisine = None
    sdb = None
    has_wet_adj = False
    for fl in floors:
        c = next((r for r in fl.rooms if r.room_type == "cuisine"), None)
        s = next((r for r in fl.rooms if r.room_type == "sdb_principale"), None)
        if c and s:
            from app.validation_engine import _rooms_share_wall
            if _rooms_share_wall(c, s):
                has_wet_adj = True
                break
    if has_wet_adj:
        wet_adjacencies_ok += 1
                
    # Check bedroom clustering
    isolated = False
    for fl in floors:
        fl_bedrooms = [r for r in fl.rooms if "chambre" in r.room_type]
        if len(fl_bedrooms) > 1:
            from app.validation_engine import _rooms_share_wall
            for b1 in fl_bedrooms:
                if not any(_rooms_share_wall(b1, b2) for b2 in fl_bedrooms if b1 != b2):
                    isolated = True
                    break
    if not isolated:
        bedroom_clustering_ok += 1
        
    # Check staircase not on street facade
    stair_on_facade = False
    for fl in floors:
        stair = next((r for r in fl.rooms if r.room_type == "escalier"), None)
        if stair:
            if stair.y == 0.0:
                # check if it is at the left edge or right edge
                if stair.x > 0.01 and abs(stair.x + stair.width - params["built_width_m"]) > 0.01:
                    stair_on_facade = True
    if not stair_on_facade:
        staircase_not_street_facade += 1
    else:
        print(f"Run {i}: Staircase placed on street facade center!")
        
    # Check window existence
    all_rooms_have_ext_windows = True
    for fl in floors:
        for r in fl.rooms:
            # If room has at least one exterior wall
            if r.has_exterior_wall_north or r.has_exterior_wall_south or r.has_exterior_wall_east or r.has_exterior_wall_west:
                # Must have at least one window
                r_windows = [w for w in fl.windows if w.room_type == r.room_type]
                if not r_windows:
                    all_rooms_have_ext_windows = False
                    print(f"Run {i}: Room {r.room_type} on floor {r.floor} has ext wall but no WindowOutput!")
    if all_rooms_have_ext_windows:
        window_existence_ok += 1

print(f"Bedroom accessibility count: {bedroom_accessibility_ok} / {runs} ({bedroom_accessibility_ok / runs * 100:.1f}%)")
print(f"Wet adjacency count: {wet_adjacencies_ok} / {runs} ({wet_adjacencies_ok / runs * 100:.1f}%)")
print(f"Bedroom clustering count: {bedroom_clustering_ok} / {runs} ({bedroom_clustering_ok / runs * 100:.1f}%)")
print(f"Staircase correct placement count: {staircase_not_street_facade} / {runs} ({staircase_not_street_facade / runs * 100:.1f}%)")
print(f"Window existence count: {window_existence_ok} / {runs} ({window_existence_ok / runs * 100:.1f}%)")

assert bedroom_accessibility_ok == runs, "FAIL: Not all bedrooms are accessible without traversing public zone."
assert wet_adjacencies_ok >= runs * 0.6, f"FAIL: Wet adjacency rate too low: {wet_adjacencies_ok}/{runs}"
assert bedroom_clustering_ok >= runs * 0.7, f"FAIL: Bedroom clustering rate too low: {bedroom_clustering_ok}/{runs}"
assert staircase_not_street_facade == runs, "FAIL: Staircase placed on street facade center."
assert window_existence_ok == runs, "FAIL: Not all rooms with exterior walls have windows."

print("\nALL DESIGN RULES ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
