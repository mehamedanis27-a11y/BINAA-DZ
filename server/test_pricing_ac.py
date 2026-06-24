import json
import os
import shutil
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.cost_engine import get_wilaya_rates, load_pricing_config, calculate_cost
from app.models import GenerateRequest, SiteAnalysisOutput

# Helper to build request and site mocks
def make_mocks(width, depth, floors, wilaya, budget):
    req = GenerateRequest.model_construct(
        built_width_m=width,
        built_depth_m=depth,
        wilaya=wilaya,
        floors=floors,
        budget=budget
    )
    site = SiteAnalysisOutput.model_construct(
        built_width_m=width,
        built_depth_m=depth,
        built_area_m2=width * depth,
        seismic_zone="MEDIUM",
        climate_zone="COASTAL"
    )
    return site, req

# AC1: Pour 100m² footprint, R+0, Oran: cost_min = 100×95000×1.20 = 11,400,000 DA
site_ac1, req_ac1 = make_mocks(10.0, 10.0, 0, "31", 12_000_000)
res_ac1 = calculate_cost(site_ac1, req_ac1)
assert res_ac1.cost_min == 11_400_000, f"Expected 11400000, got {res_ac1.cost_min}"
print("AC1 PASS: Oran 100m² R+0 cost_min is 11,400,000 DA")

# AC2: Pour 100m² footprint, R+1, Oran: cost_min = 200×95000×1.20 = 22,800,000 DA
site_ac2, req_ac2 = make_mocks(10.0, 10.0, 1, "31", 25_000_000)
res_ac2 = calculate_cost(site_ac2, req_ac2)
assert res_ac2.cost_min == 22_800_000, f"Expected 22800000, got {res_ac2.cost_min}"
print("AC2 PASS: Oran 100m² R+1 cost_min is 22,800,000 DA")

# AC3: Pour une wilaya inconnue "99": retourne les taux DEFAULT
rates_99 = get_wilaya_rates("99")
assert rates_99["name"] == "Wilaya Standard", f"Expected 'Wilaya Standard', got {rates_99['name']}"
assert rates_99["all_in_rate_min"] == 85000, f"Expected 85000, got {rates_99['all_in_rate_min']}"
print("AC3 PASS: Unknown wilaya 99 falls back to DEFAULT rates")

# AC4: La provision imprévus est TOUJOURS 20% (non paramétrable par l'utilisateur)
assert res_ac1.contingency_rate == 0.20, f"Expected 0.20, got {res_ac1.contingency_rate}"
assert res_ac1.breakdown["imprévus"]["min"] == round(100 * 95000 * 0.20), f"Expected 1900000, got {res_ac1.breakdown['imprévus']['min']}"
print("AC4 PASS: Contingency provision is strictly 20%")

# AC5 & AC6: Aucune surcharge sismique ou prime d'étage dans le calcul
# R+1 with high seismic zone vs standard should yield the same cost per m2 because surcharges are removed
site_seismic, req_seismic = make_mocks(10.0, 10.0, 1, "31", 25_000_000)
site_seismic.seismic_zone = "HIGH"
res_seismic = calculate_cost(site_seismic, req_seismic)
assert res_seismic.cost_min == res_ac2.cost_min, f"Seismic surcharge detected! {res_seismic.cost_min} vs {res_ac2.cost_min}"
print("AC5 & AC6 PASS: No seismic surcharge or upper floor premiums applied")

# AC7: pricing_last_updated et validation_source sont renseignés depuis pricing_config.json
config = load_pricing_config()
assert res_ac1.pricing_last_updated == config["last_updated"], f"Expected {config['last_updated']}, got {res_ac1.pricing_last_updated}"
assert res_ac1.validation_source == config["validation_source"], f"Expected {config['validation_source']}, got {res_ac1.validation_source}"
print("AC7 PASS: Metadata (last_updated, validation_source) correctly set from config")

# Modifying config without redeploying -> new rates are taken into account
config_path = os.path.join(os.path.dirname(__file__), "pricing_config.json")
backup_path = config_path + ".bak"
shutil.copy2(config_path, backup_path)

try:
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    
    cfg["wilayas"]["31"]["all_in_rate_min"] = 99999
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
        
    # Cached call still returns old rate
    rates_cached = get_wilaya_rates("31")
    assert rates_cached["all_in_rate_min"] == 95000, f"Expected cached 95000, got {rates_cached['all_in_rate_min']}"
    
    # Reload config
    load_pricing_config.cache_clear()
    
    rates_new = get_wilaya_rates("31")
    assert rates_new["all_in_rate_min"] == 99999, f"Expected reloaded 99999, got {rates_new['all_in_rate_min']}"
    print("RELOAD PASS: Config reload without redeployment successfully updates rates")

finally:
    if os.path.exists(backup_path):
        shutil.move(backup_path, config_path)
        load_pricing_config.cache_clear()
        print("Config restored and cache cleared.")

print("\nALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")
