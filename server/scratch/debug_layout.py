import sys
sys.path.append('.')
from app.models import GenerateRequest
from app.site_analysis import analyze_site
from app.structural_grid import generate_structural_grid
from app.plan_engine import generate_plan
from app.validation_engine import validate_plan

params = {
    "built_width_m": 10.0,
    "built_depth_m": 15.0,
    "wilaya": "31",
    "family_size": 6,
    "generations": 2,
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

req = GenerateRequest(**params)
site = analyze_site(req)
grid = generate_structural_grid(req)
floors, summary, warnings = generate_plan(
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

print("Grid bays X:", len(grid.column_axes_x)-1, "Y:", len(grid.column_axes_y)-1)
for fl in floors:
    print(f"\n--- Floor {fl.floor_number} ---")
    for r in fl.rooms:
        print(f"Room: {r.room_type} (x={r.x:.1f}, y={r.y:.1f}, w={r.width:.1f}, h={r.height:.1f})")
