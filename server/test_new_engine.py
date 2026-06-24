"""
Quick test: verify the new plan engine produces correctly-sized rooms.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.models import GenerateRequest, StructuralGridOutput
from app.structural_grid import generate_structural_grid
from app.plan_engine import generate_plan, ROOM_SPECS

# Test case: Run 4
req = GenerateRequest(
    built_width_m=10.5,
    built_depth_m=13.0,
    wilaya="31",
    family_size=6,
    generations=2,
    has_car=True,
    guest_frequency="HIGH",
    floors=1,
    budget=20_000_000,
    slope_category="flat",
    soil_category="compact",
    roof_type="terrasse_plate",
    finish_level="standard",
    independent_generations=False,
    car_count=1,
    vrd_aep=True,
    vrd_elec=True,
    vrd_gaz=True,
    vrd_assainissement=True,
)

grid = generate_structural_grid(req)
print(f"Grid: {grid.num_bays_x}x{grid.num_bays_y} bays")
print(f"  X axes: {grid.column_axes_x}")
print(f"  Y axes: {grid.column_axes_y}")
print(f"  X spans: {grid.x_spans}")
print(f"  Y spans: {grid.y_spans}")
print()

floors, summary, warnings = generate_plan(
    effective_width=10.5,
    effective_depth=13.0,
    family_size=6,
    generations=2,
    has_car=True,
    guest_frequency="HIGH",
    floors=1,
    future_floors=1,
    budget=20_000_000,
    grid=grid,
    solar_priority="S",
    street_orientation="N",
    wilaya_name="Oran",
    seismic_zone="MEDIUM",
    climate_zone="COASTAL",
)

print(f"=== RESULTS ===")
print(f"Floors: {len(floors)}")
print(f"Bedrooms: {summary.bedroom_count}, Bathrooms: {summary.bathroom_count}")
print()

for floor in floors:
    print(f"\n--- {floor.floor_label} ({len(floor.rooms)} rooms, {len(floor.doors)} doors) ---")
    for room in floor.rooms:
        specs = ROOM_SPECS.get(room.room_type, {})
        area_range = specs.get("area", (0, 0, 0))
        status = "OK" if area_range[0] <= room.area_m2 <= area_range[2] else "WARN"
        print(f"  [{status}] {room.label_fr:30s}  {room.width:.1f}m x {room.height:.1f}m = {room.area_m2:5.1f} m2  (spec: {area_range[0]}-{area_range[2]} m2)  pos=({room.x:.1f}, {room.y:.1f})")

    for door in floor.doors:
        print(f"  DOOR: {door.from_room} -> {door.to_room} at ({door.x:.1f}, {door.y:.1f}) wall={door.wall_side}")

print(f"\n=== WARNINGS ({len(warnings)}) ===")
for w in warnings:
    print(f"  {w}")

# Verify KEY success criteria
print("\n=== KEY CHECKS ===")
all_rooms = [r for f in floors for r in f.rooms]

# 1. WC rooms should be small (< 5 m2)
wc_rooms = [r for r in all_rooms if "wc" in r.room_type]
for r in wc_rooms:
    ok = r.area_m2 < 5.0
    print(f"  {'PASS' if ok else 'FAIL'}: {r.label_fr} area={r.area_m2} m2 (should be < 5 m2)")

# 2. Salon should be large (> 15 m2)
salon_rooms = [r for r in all_rooms if "salon" in r.room_type]
for r in salon_rooms:
    ok = r.area_m2 > 15.0
    print(f"  {'PASS' if ok else 'FAIL'}: {r.label_fr} area={r.area_m2} m2 (should be > 15 m2)")

# 3. Garage depth should be >= 5.0m
garage_rooms = [r for r in all_rooms if r.room_type == "garage"]
for r in garage_rooms:
    depth = max(r.width, r.height)
    ok = depth >= 5.0
    print(f"  {'PASS' if ok else 'FAIL'}: {r.label_fr} depth={depth:.1f}m (should be >= 5.0m)")

# 4. No overlapping rooms per floor
for floor in floors:
    for i, a in enumerate(floor.rooms):
        for b in floor.rooms[i+1:]:
            overlap_x = not (a.x + a.width <= b.x + 0.01 or b.x + b.width <= a.x + 0.01)
            overlap_y = not (a.y + a.height <= b.y + 0.01 or b.y + b.height <= a.y + 0.01)
            if overlap_x and overlap_y:
                print(f"  FAIL: {a.label_fr} overlaps {b.label_fr}")

print("\n  NO OVERLAPS: ", end="")
overlap_found = False
for floor in floors:
    for i, a in enumerate(floor.rooms):
        for b in floor.rooms[i+1:]:
            ox = not (a.x + a.width <= b.x + 0.01 or b.x + b.width <= a.x + 0.01)
            oy = not (a.y + a.height <= b.y + 0.01 or b.y + b.height <= a.y + 0.01)
            if ox and oy:
                overlap_found = True
print("PASS" if not overlap_found else "FAIL")

# 5. Different rooms have different sizes
sizes = set()
for r in all_rooms:
    sizes.add(round(r.area_m2, 0))
print(f"  VARIETY: {len(sizes)} different room sizes out of {len(all_rooms)} rooms {'PASS' if len(sizes) >= 3 else 'FAIL'}")
