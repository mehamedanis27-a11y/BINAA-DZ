"""
BINAA — Module M3: Structural Grid Engine

Generates the shared béton armé portique structural grid.
All floors share exactly the same column positions.
Simplified version: no seismic surcharge, standard RPA 99 specs.
"""

from __future__ import annotations
import math
from .models import StructuralGridOutput, GenerateRequest

STANDARD_GRID_SPEC = {
    "column_section_cm": 30,       # Section colonne 30×30 cm
    "preferred_span_m": 4.0,       # Portée préférentielle 4.0m
    "max_span_m": 4.5,             # Portée maximale absolue
    "beam_depth_ratio": 1/10,      # Profondeur poutre = portée / 10
    "slab_thickness_cm": 15,       # Épaisseur dalle standard
}


def generate_structural_grid(request: GenerateRequest) -> StructuralGridOutput:
    """
    Generate a single, shared structural grid for the building.
    
    Columns are evenly distributed and aligned across all floors.
    """
    preferred_span = STANDARD_GRID_SPEC["preferred_span_m"]
    max_span = STANDARD_GRID_SPEC["max_span_m"]
    
    # Real dimensions from request
    width = request.built_width_m
    depth = request.built_depth_m
    
    # Calculate number of bays (evenly distributed)
    num_bays_x = math.ceil(width / preferred_span)
    num_bays_y = math.ceil(depth / preferred_span)
    
    # Position of column axes (evenly spaced, starting at 0.0, ending at width/depth)
    span_x = width / num_bays_x
    span_y = depth / num_bays_y
    
    column_axes_x = [round(i * span_x, 3) for i in range(num_bays_x + 1)]
    column_axes_y = [round(j * span_y, 3) for j in range(num_bays_y + 1)]
    
    return StructuralGridOutput(
        column_axes_x=column_axes_x,
        column_axes_y=column_axes_y,
        column_section="30×30 cm",
        max_span_m=max_span,
        slab_thickness_cm=STANDARD_GRID_SPEC["slab_thickness_cm"],
        grid_spec="Standard RPA 99"
    )


def get_max_room_dimensions(grid: StructuralGridOutput) -> dict:
    """
    Returns the maximum usable room dimensions from the structural grid.
    """
    max_x_bay = max(grid.x_spans)
    max_y_bay = max(grid.y_spans)
    col = grid.column_section_val  # 0.30 meters

    return {
        "max_clear_width_1bay": round(max_x_bay - col, 2),
        "max_clear_depth_1bay": round(max_y_bay - col, 2),
        "max_clear_width_2bay": round(max_x_bay * 2 - col * 3, 2),
        "max_clear_depth_2bay": round(max_y_bay * 2 - col * 3, 2),
        "column_section": col,
        "beam_depth": round(max(max_x_bay, max_y_bay) * STANDARD_GRID_SPEC["beam_depth_ratio"], 3),
        "note": (
            f"Portée max {max_x_bay:.1f}m × {max_y_bay:.1f}m. "
            f"Poteaux 30×30cm."
        )
    }


def test_run():
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    req = GenerateRequest.model_construct(
        built_width_m=10.0,
        built_depth_m=15.0,
        wilaya="31",
        floors=1,
        budget=15_000_000,
    )
    
    grid = generate_structural_grid(req)
    print("\n" + "═" * 55)
    print("  TEST SHARING STRUCTURAL GRID (Method 01)")
    print("─" * 55)
    print(f"  Column Axes X: {grid.column_axes_x}")
    print(f"  Column Axes Y: {grid.column_axes_y}")
    print(f"  Spans X: {grid.x_spans}")
    print(f"  Spans Y: {grid.y_spans}")
    print(f"  Grid Spec: {grid.grid_spec} | Section: {grid.column_section}")
    print(f"  Slab Thickness: {grid.slab_thickness_cm}cm")
    print(f"  Max Span: {grid.max_span_m:.2f}m")

    dims = get_max_room_dimensions(grid)
    print(f"  Max clear room (1 bay): {dims['max_clear_width_1bay']}m × {dims['max_clear_depth_1bay']}m")


if __name__ == "__main__":
    test_run()
