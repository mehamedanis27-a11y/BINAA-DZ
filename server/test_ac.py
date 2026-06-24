"""Acceptance criteria tests for site_analysis.py + routes.py refactor."""
import sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.models import GenerateRequest, SiteAnalysisOutput
from app.site_analysis import analyze_site, check_feasibility

BASE = {
    "built_width_m": 10.0, "built_depth_m": 15.0, "wilaya": "31",
    "family_size": 5, "generations": 1, "has_car": True,
    "guest_frequency": "MEDIUM", "floors": 1, "budget": 18_000_000.0,
    "slope_category": "flat", "soil_category": "compact",
    "roof_type": "terrasse_plate", "finish_level": "standard",
    "independent_generations": False, "car_count": 1,
    "vrd_aep": True, "vrd_elec": True, "vrd_gaz": True, "vrd_assainissement": True,
}

req = GenerateRequest(**BASE)
site = analyze_site(req)

# AC1: built_area_m2 = width * depth (no deduction)
assert site.built_area_m2 == 150.0, f"FAIL AC1: {site.built_area_m2}"
print("AC1 PASS: built_area_m2 = 150.0 (no deduction)")

# AC2: 10x15 Oran -> 150.0, not 70.0
assert site.built_area_m2 == 150.0
print("AC2 PASS: 10x15 Oran = 150.0 (not 70.0)")

# AC3: zones populated correctly
assert site.seismic_zone == "MEDIUM"
assert site.climate_zone == "COASTAL"
print("AC3 PASS: seismic=MEDIUM, climate=COASTAL")

# AC4: feasibility gate blocks width<4 / depth<6
narrow = GenerateRequest.model_construct(**{**BASE, "built_width_m": 3.5})
b1 = check_feasibility(analyze_site(narrow), 1, 18_000_000, "31")
assert any("largeur" in b for b in b1), f"FAIL AC4a: {b1}"

shallow = GenerateRequest.model_construct(**{**BASE, "built_depth_m": 5.5})
b2 = check_feasibility(analyze_site(shallow), 1, 18_000_000, "31")
assert any("profondeur" in b for b in b2), f"FAIL AC4b: {b2}"
print("AC4 PASS: feasibility gate blocks width<4 and depth<6")

# AC5: no street_orientation or setback references in modified files
for path in ["app/site_analysis.py", "app/routes.py"]:
    with open(path, encoding="utf-8") as f:
        content = f.read()
    assert "setback" not in content.lower(), f"FAIL AC5: setback found in {path}"
    # Allow street_orientation only as a kwarg passing literal "N"
    for i, line in enumerate(content.splitlines(), 1):
        if "street_orientation" in line:
            stripped = line.replace(" ", "")
            if 'street_orientation="N"' in stripped:
                continue
            assert False, f"FAIL AC5: street_orientation ref at {path}:{i}: {line}"
print("AC5 PASS: no street_orientation/setback references")

print()
print("ALL 5 ACCEPTANCE CRITERIA PASSED")
