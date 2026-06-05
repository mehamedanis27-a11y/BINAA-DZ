"""
BINAA — Module M3: Structural Grid Engine

Generates the béton armé portique structural grid BEFORE any room
placement. Every room in the plan must fit within the grid.

ENGINEERING BASIS:
  Algerian construction uses reinforced concrete frames (ossature
  poteaux-poutres) with brick infill walls. The column grid is the
  primary structural decision; it determines:

    1. Maximum clear span between columns (≤5m béton armé residential)
    2. Column section size (scaled to seismic zone and future floors)
    3. Beam depth (span ÷ 10 — conservative for residential)
    4. Slab thickness (150mm current, 200mm if future upper floor)

  RPA 99 v2003 (Algerian seismic code) requirements:
    HIGH zone:   min column 350×350mm, tighter stirrups, shorter spans
    MEDIUM zone: min column 300×300mm
    LOW zone:    min column 250×250mm

  For BINAA, any future_floors > current_floors triggers:
    - Column section upgrade (+50mm)
    - Slab upgrade (150→200mm)
    - Minimum ceiling height 2.90m (for future staircase connection)
"""

from __future__ import annotations
from dataclasses import dataclass, field
import math
from .models import StructuralGridOutput, ColumnOutput


# ─────────────────────────────────────────────────────────────
#  SEISMIC STRUCTURAL SPECIFICATIONS
#  Source: RPA 99 v2003 + common Algerian practice
# ─────────────────────────────────────────────────────────────

SEISMIC_SPECS = {
    "HIGH": {
        "column_section": 0.35,     # meters (square section)
        "preferred_span": 3.5,      # meters
        "max_span": 4.5,            # meters (hard limit)
        "min_span": 2.5,
        "beam_depth_ratio": 1 / 10, # beam_depth = span × ratio
    },
    "MEDIUM": {
        "column_section": 0.30,
        "preferred_span": 4.0,
        "max_span": 5.0,
        "min_span": 2.5,
        "beam_depth_ratio": 1 / 10,
    },
    "LOW": {
        "column_section": 0.25,
        "preferred_span": 4.5,
        "max_span": 5.0,
        "min_span": 2.5,
        "beam_depth_ratio": 1 / 12,
    },
}

# Additional column section for future floor pre-commitment
FUTURE_FLOOR_COLUMN_UPGRADE = 0.05   # +50mm per future floor planned

# Slab thickness in meters
SLAB_THICKNESS = {
    "current_only": 0.15,
    "with_future_floor": 0.20,
}

# Minimum ceiling height
MIN_CEILING_HEIGHT = {
    "standard": 2.70,
    "with_future_stair": 2.90,
}


# ─────────────────────────────────────────────────────────────
#  INTERNAL DATA STRUCTURE
# ─────────────────────────────────────────────────────────────

@dataclass
class StructuralGrid:
    """
    The structural grid — internal representation used by the plan engine.
    Exported to StructuralGridOutput for the API response.
    """
    x_lines: list[float]        # x-coordinates of grid lines (meters)
    y_lines: list[float]        # y-coordinates of grid lines (meters)
    column_section: float       # column side dimension (m) — square section
    beam_depth: float           # beam depth (m)
    slab_thickness: float       # slab thickness (m)
    seismic_zone: str
    future_floors: int
    effective_width: float
    effective_depth: float

    @property
    def x_spans(self) -> list[float]:
        return [round(self.x_lines[i+1] - self.x_lines[i], 3)
                for i in range(len(self.x_lines) - 1)]

    @property
    def y_spans(self) -> list[float]:
        return [round(self.y_lines[i+1] - self.y_lines[i], 3)
                for i in range(len(self.y_lines) - 1)]

    @property
    def max_span(self) -> float:
        return max(max(self.x_spans), max(self.y_spans))

    @property
    def num_bays_x(self) -> int:
        return len(self.x_lines) - 1

    @property
    def num_bays_y(self) -> int:
        return len(self.y_lines) - 1

    @property
    def column_positions(self) -> list[tuple[float, float]]:
        """All (x, y) column center positions."""
        return [(x, y) for x in self.x_lines for y in self.y_lines]

    def get_bay_rect(self, bay_x: int, bay_y: int) -> tuple[float, float, float, float]:
        """Returns (x_min, y_min, width, height) for a structural bay."""
        x_min = self.x_lines[bay_x]
        y_min = self.y_lines[bay_y]
        width = self.x_lines[bay_x + 1] - x_min
        height = self.y_lines[bay_y + 1] - y_min
        return x_min, y_min, width, height

    def to_output(self) -> StructuralGridOutput:
        """Convert to API response format."""
        columns = [
            ColumnOutput(x=x, y=y, width=self.column_section, depth=self.column_section)
            for x, y in self.column_positions
        ]
        return StructuralGridOutput(
            x_lines=self.x_lines,
            y_lines=self.y_lines,
            columns=columns,
            column_section_m=self.column_section,
            beam_depth_m=round(self.beam_depth, 3),
            slab_thickness_m=self.slab_thickness,
            max_span_m=self.max_span,
            seismic_zone=self.seismic_zone,
        )


# ─────────────────────────────────────────────────────────────
#  GRID LINE GENERATOR
# ─────────────────────────────────────────────────────────────

def _generate_grid_lines(
    total_length: float,
    preferred_span: float,
    max_span: float,
    min_span: float,
) -> list[float]:
    """
    Generate grid line positions that divide total_length into bays.

    Strategy:
      1. Start with preferred_span
      2. If total doesn't divide evenly, adjust last bay
      3. Last bay must not exceed max_span or be below min_span
      4. If last bay would be too small, absorb into previous bay

    Args:
        total_length:   Total dimension to span (effective_width or effective_depth)
        preferred_span: Target bay size (seismic-dependent)
        max_span:       Hard maximum bay size (béton armé limit)
        min_span:       Hard minimum (functional minimum for usable rooms)

    Returns:
        List of grid line positions starting at 0.0, ending at total_length.
    """
    if total_length <= max_span:
        # Single bay — no intermediate columns needed
        return [0.0, round(total_length, 3)]

    lines = [0.0]
    remaining = total_length
    pos = 0.0

    while remaining > max_span:
        step = preferred_span
        # Don't overshoot
        if remaining - step < min_span:
            # Remaining after this step would be too small — extend this step
            step = remaining - min_span
            if step > max_span:
                step = max_span

        pos = round(pos + step, 3)
        lines.append(pos)
        remaining = round(total_length - pos, 3)

    # Add the final line
    if round(total_length - lines[-1], 3) > 0:
        lines.append(round(total_length, 3))

    # Validate all spans
    for i in range(len(lines) - 1):
        span = round(lines[i+1] - lines[i], 3)
        if span > max_span:
            # Force split this span
            mid = round(lines[i] + span / 2, 3)
            lines.insert(i + 1, mid)

    return sorted(set(round(x, 3) for x in lines))


# ─────────────────────────────────────────────────────────────
#  MAIN GRID GENERATION FUNCTION
# ─────────────────────────────────────────────────────────────

def generate_structural_grid(
    effective_width: float,
    effective_depth: float,
    seismic_zone: str,
    floors: int,
    future_floors: int,
) -> StructuralGrid:
    """
    Generate the structural grid for a building.

    This must be called BEFORE room placement. The grid defines the
    spatial framework within which all rooms must be placed.

    Args:
        effective_width:  Buildable width after setbacks (meters)
        effective_depth:  Buildable depth after setbacks (meters)
        seismic_zone:     HIGH / MEDIUM / LOW (from wilaya)
        floors:           Floors being built now (0, 1, 2)
        future_floors:    Floors planned for future (0, 1, 2, 3)

    Returns:
        StructuralGrid with column positions and structural specs.
    """
    specs = SEISMIC_SPECS[seismic_zone]

    # ── Column section ──────────────────────────────────────
    base_section = specs["column_section"]
    planned_total_floors = max(floors, future_floors)
    column_section = base_section + (FUTURE_FLOOR_COLUMN_UPGRADE
                                     if future_floors > floors else 0)
    column_section = round(column_section, 2)

    # ── Preferred span: slightly tighter for high floor count ──
    preferred_span = specs["preferred_span"]
    if planned_total_floors >= 2:
        preferred_span = max(specs["min_span"], preferred_span - 0.25)

    # ── Generate grid lines ──────────────────────────────────
    x_lines = _generate_grid_lines(
        effective_width,
        preferred_span,
        specs["max_span"],
        specs["min_span"],
    )
    y_lines = _generate_grid_lines(
        effective_depth,
        preferred_span,
        specs["max_span"],
        specs["min_span"],
    )

    # ── Beam depth (based on largest span) ──────────────────
    max_x_span = max(x_lines[i+1] - x_lines[i] for i in range(len(x_lines)-1))
    max_y_span = max(y_lines[i+1] - y_lines[i] for i in range(len(y_lines)-1))
    max_span = max(max_x_span, max_y_span)
    beam_depth = round(max_span * specs["beam_depth_ratio"], 3)

    # ── Slab thickness ───────────────────────────────────────
    slab_thickness = (SLAB_THICKNESS["with_future_floor"]
                      if future_floors > floors
                      else SLAB_THICKNESS["current_only"])

    return StructuralGrid(
        x_lines=x_lines,
        y_lines=y_lines,
        column_section=column_section,
        beam_depth=beam_depth,
        slab_thickness=slab_thickness,
        seismic_zone=seismic_zone,
        future_floors=future_floors,
        effective_width=effective_width,
        effective_depth=effective_depth,
    )


# ─────────────────────────────────────────────────────────────
#  ROOM DIMENSION CONSTRAINT DERIVATION
#  Given a structural grid, what are the maximum room dimensions?
# ─────────────────────────────────────────────────────────────

def get_max_room_dimensions(grid: StructuralGrid) -> dict:
    """
    Returns the maximum usable room dimensions from the structural grid.

    A room can span at most 1 structural bay (without an interior column)
    or 2 bays (with one interior column that will appear in the room).

    Returns:
        dict with max_clear_width and max_clear_depth
        (1 bay = clear span; 2 bays = includes interior column)
    """
    max_x_bay = max(grid.x_spans)
    max_y_bay = max(grid.y_spans)
    col = grid.column_section

    return {
        "max_clear_width_1bay": round(max_x_bay - col, 2),
        "max_clear_depth_1bay": round(max_y_bay - col, 2),
        "max_clear_width_2bay": round(max_x_bay * 2 - col * 3, 2),
        "max_clear_depth_2bay": round(max_y_bay * 2 - col * 3, 2),
        "column_section": col,
        "beam_depth": grid.beam_depth,
        "note": (
            f"Portée max {max_x_bay:.1f}m × {max_y_bay:.1f}m. "
            f"Poteaux {int(col*100)}×{int(col*100)}cm. "
            f"Poutre {int(grid.beam_depth*100)}cm de hauteur."
        )
    }


# ─────────────────────────────────────────────────────────────
#  TEST RUN
# ─────────────────────────────────────────────────────────────

def test_run():
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    cases = [
        (7.0, 10.0, "MEDIUM", 1, 0, "Karim Oran 7×10m, R+1, no future"),
        (7.0, 10.0, "MEDIUM", 1, 2, "Karim Oran 7×10m, R+1, future R+2"),
        (8.0, 12.0, "HIGH",   0, 1, "HIGH seismic 8×12m, R+0, future R+1"),
        (10.0, 16.0, "LOW",   2, 0, "LOW seismic 10×16m, R+2"),
    ]

    for ew, ed, sz, fl, ffl, label in cases:
        print(f"\n{'─'*55}")
        print(f"  {label}")
        grid = generate_structural_grid(ew, ed, sz, fl, ffl)

        print(f"  Grid X: {grid.x_lines}  (spans: {grid.x_spans})")
        print(f"  Grid Y: {grid.y_lines}  (spans: {grid.y_spans})")
        print(f"  Columns: {len(grid.column_positions)} @ "
              f"{int(grid.column_section*100)}×{int(grid.column_section*100)}cm")
        print(f"  Beam depth: {int(grid.beam_depth*100)}cm | "
              f"Slab: {int(grid.slab_thickness*100)}cm")
        print(f"  Max span: {grid.max_span:.2f}m")

        dims = get_max_room_dimensions(grid)
        print(f"  Max clear room (1 bay): "
              f"{dims['max_clear_width_1bay']}m × {dims['max_clear_depth_1bay']}m")


if __name__ == "__main__":
    test_run()
