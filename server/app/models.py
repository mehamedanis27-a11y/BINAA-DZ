"""
BINAA — Pydantic Models v3.0  (Oran launch)
Request / Response contracts for the generation pipeline.

BREAKING CHANGES FROM v2:
  - GenerateRequest: terrain_width/terrain_depth replaced by built_width_m/built_depth_m,
    street_orientation and future_floors removed entirely.
  - SiteAnalysisOutput: setback fields, solar_priority_orientation and
    dominant_summer_wind removed; effective_area_m2 renamed built_area_m2.
  - CostEstimateOutput: simplified to cost_min/max with flat breakdown dict.
  - CostBreakdownLine model removed.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Literal, Optional


# ─────────────────────────────────────────────────────────────
#  CONSTANTS — Valid input values
# ─────────────────────────────────────────────────────────────


VALID_WILAYAS = {
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
    "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
    "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
    "51", "52", "53", "54", "55", "56", "57", "58",
}

WILAYA_NAMES = {
    "01": "Adrar",        "02": "Chlef",        "03": "Laghouat",
    "04": "Oum el Bouaghi","05": "Batna",        "06": "Béjaïa",
    "07": "Biskra",       "08": "Béchar",        "09": "Blida",
    "10": "Bouira",       "11": "Tamanrasset",   "12": "Tébessa",
    "13": "Tlemcen",      "14": "Tiaret",        "15": "Tizi Ouzou",
    "16": "Alger",        "17": "Djelfa",        "18": "Jijel",
    "19": "Sétif",        "20": "Saïda",         "21": "Skikda",
    "22": "Sidi Bel Abbès","23": "Annaba",       "24": "Guelma",
    "25": "Constantine",  "26": "Médéa",         "27": "Mostaganem",
    "28": "M'Sila",       "29": "Mascara",       "30": "Ouargla",
    "31": "Oran",         "32": "El Bayadh",     "33": "Illizi",
    "34": "Bordj Bou Arréridj","35": "Boumerdès","36": "El Tarf",
    "37": "Tindouf",      "38": "Tissemsilt",    "39": "El Oued",
    "40": "Khenchela",    "41": "Souk Ahras",    "42": "Tipaza",
    "43": "Mila",         "44": "Aïn Defla",     "45": "Naâma",
    "46": "Aïn Témouchent","47": "Ghardaïa",     "48": "Relizane",
    "49": "Timimoun",     "50": "Bordj Badji Mokhtar",
    "51": "Ouled Djellal","52": "Béni Abbès",    "53": "In Salah",
    "54": "In Guezzam",   "55": "Touggourt",     "56": "Djanet",
    "57": "El M'Ghair",   "58": "El Menia",
}

# Seismic zone per wilaya — based on RPA 99 v2003 classification
# Zone I=LOW, Zone IIa=MEDIUM, Zone IIb=HIGH, Zone III=VERY_HIGH
WILAYA_SEISMIC_ZONE = {
    "01": "LOW",   "02": "HIGH",   "03": "MEDIUM", "04": "MEDIUM",
    "05": "MEDIUM","06": "HIGH",   "07": "LOW",    "08": "LOW",
    "09": "HIGH",  "10": "HIGH",   "11": "LOW",    "12": "MEDIUM",
    "13": "MEDIUM","14": "MEDIUM", "15": "HIGH",   "16": "HIGH",
    "17": "LOW",   "18": "HIGH",   "19": "MEDIUM", "20": "MEDIUM",
    "21": "HIGH",  "22": "MEDIUM", "23": "MEDIUM", "24": "MEDIUM",
    "25": "MEDIUM","26": "HIGH",   "27": "MEDIUM", "28": "LOW",
    "29": "MEDIUM","30": "LOW",    "31": "MEDIUM", "32": "LOW",
    "33": "LOW",   "34": "MEDIUM", "35": "HIGH",   "36": "MEDIUM",
    "37": "LOW",   "38": "MEDIUM", "39": "LOW",    "40": "MEDIUM",
    "41": "MEDIUM","42": "HIGH",   "43": "MEDIUM", "44": "HIGH",
    "45": "LOW",   "46": "MEDIUM", "47": "LOW",    "48": "MEDIUM",
    "49": "LOW",   "50": "LOW",    "51": "LOW",    "52": "LOW",
    "53": "LOW",   "54": "LOW",    "55": "LOW",    "56": "LOW",
    "57": "LOW",   "58": "LOW",
}

# Climate zone per wilaya
# COASTAL: northern coast  / HIGHLAND: high plains  / ARID: pre-Saharan  / SAHARAN: desert
WILAYA_CLIMATE_ZONE = {
    "01": "SAHARAN",  "02": "COASTAL",  "03": "ARID",     "04": "HIGHLAND",
    "05": "HIGHLAND", "06": "COASTAL",  "07": "ARID",     "08": "ARID",
    "09": "COASTAL",  "10": "HIGHLAND", "11": "SAHARAN",  "12": "HIGHLAND",
    "13": "COASTAL",  "14": "HIGHLAND", "15": "HIGHLAND", "16": "COASTAL",
    "17": "ARID",     "18": "COASTAL",  "19": "HIGHLAND", "20": "HIGHLAND",
    "21": "COASTAL",  "22": "HIGHLAND", "23": "COASTAL",  "24": "HIGHLAND",
    "25": "HIGHLAND", "26": "HIGHLAND", "27": "COASTAL",  "28": "ARID",
    "29": "HIGHLAND", "30": "SAHARAN",  "31": "COASTAL",  "32": "ARID",
    "33": "SAHARAN",  "34": "HIGHLAND", "35": "COASTAL",  "36": "COASTAL",
    "37": "SAHARAN",  "38": "HIGHLAND", "39": "ARID",     "40": "HIGHLAND",
    "41": "HIGHLAND", "42": "COASTAL",  "43": "HIGHLAND", "44": "HIGHLAND",
    "45": "ARID",     "46": "COASTAL",  "47": "ARID",     "48": "HIGHLAND",
    "49": "SAHARAN",  "50": "SAHARAN",  "51": "ARID",     "52": "ARID",
    "53": "SAHARAN",  "54": "SAHARAN",  "55": "ARID",     "56": "SAHARAN",
    "57": "ARID",     "58": "SAHARAN",
}




# ─────────────────────────────────────────────────────────────
#  REQUEST MODEL
# ─────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    """
    Input payload for POST /generate — v3 (Oran launch).

    Changement depuis v2: terrain_width/terrain_depth remplacés par
    built_width_m / built_depth_m (emprise bâtiment sans retraits).
    street_orientation et future_floors supprimés.
    """

    # ── EMPRISE BÂTIMENT ─────────────────────────────────
    built_width_m: float = Field(
        ..., ge=4.0,
        description="Largeur de l'emprise bâtiment en mètres (sans retraits)",
        json_schema_extra={"example": 8.0}
    )
    built_depth_m: float = Field(
        ..., ge=6.0,
        description="Profondeur de l'emprise bâtiment en mètres (sans retraits)",
        json_schema_extra={"example": 14.0}
    )
    wilaya: str = Field(
        ...,
        description="Code wilaya à 2 chiffres (01–58)",
        json_schema_extra={"example": "31"}
    )

    # ── FAMILY ───────────────────────────────────────────
    family_size: int = Field(
        ...,
        description="Nombre de membres de la famille",
        json_schema_extra={"example": 5}
    )
    generations: int = Field(
        ..., ge=1, le=3,
        description="Nombre de générations (1=nucléaire, 2=avec grands-parents)",
        json_schema_extra={"example": 1}
    )
    has_car: bool = Field(
        ...,
        description="La famille possède-t-elle une voiture? (garage requis si oui)"
    )
    guest_frequency: str = Field(
        ...,
        description="Fréquence des invités: NEVER / LOW / MEDIUM / HIGH"
    )

    # ── CONSTRUCTION ─────────────────────────────────────
    floors: int = Field(
        ...,
        description="Étages à construire maintenant (0=R+0, 1=R+1, 2=R+2)",
        json_schema_extra={"example": 1}
    )

    # ── BUDGET ───────────────────────────────────────────
    budget: float = Field(
        ...,
        description="Budget total en Dinars Algériens (DA)",
        json_schema_extra={"example": 18_000_000}
    )

    # ── OPTIONS ──────────────────────────────────────────
    slope_category: Literal["flat", "slight", "steep"] = Field(
        ..., description="Inclinaison du terrain"
    )
    soil_category: Literal["rocky", "compact", "soft", "unknown"] = Field(
        ..., description="Type de sol observé"
    )
    roof_type: Literal["terrasse_plate", "pitched"] = Field(
        ..., description="Type de toiture"
    )
    finish_level: Literal["economy", "standard", "premium"] = Field(
        ..., description="Niveau de finitions"
    )
    independent_generations: bool = Field(
        ..., description="Générations avec cuisine et entrée séparées"
    )
    car_count: int = Field(
        ..., ge=0, le=5, description="Nombre de véhicules (0=pas de garage)"
    )
    vrd_aep: bool = Field(
        ..., description="Eau potable disponible sur terrain"
    )
    vrd_elec: bool = Field(
        ..., description="Électricité Sonelgaz disponible"
    )
    vrd_gaz: bool = Field(
        ..., description="Gaz de ville disponible"
    )
    vrd_assainissement: bool = Field(
        ..., description="Réseau d'assainissement disponible"
    )
    # Budget scope booleans — sent for logging/transparency; deduction computed client-side
    budget_includes_land: bool = Field(default=False)
    budget_includes_architect: bool = Field(default=False)
    budget_includes_admin: bool = Field(default=False)
    budget_includes_furniture: bool = Field(default=False)

    # ── VALIDATORS ───────────────────────────────────────

    @field_validator("built_width_m")
    @classmethod
    def validate_built_width(cls, v):
        if v > 100.0:
            raise ValueError("La largeur de l'emprise ne peut pas dépasser 100 m")
        return round(v, 2)

    @field_validator("built_depth_m")
    @classmethod
    def validate_built_depth(cls, v):
        if v > 100.0:
            raise ValueError("La profondeur de l'emprise ne peut pas dépasser 100 m")
        return round(v, 2)

    @field_validator("wilaya")
    @classmethod
    def validate_wilaya(cls, v):
        v = str(v).zfill(2)
        if v not in VALID_WILAYAS:
            raise ValueError(f"Code wilaya invalide ({v}). Doit être entre 01 et 58.")
        return v

    @field_validator("family_size")
    @classmethod
    def validate_family_size(cls, v):
        if v < 1:
            raise ValueError("La famille doit avoir au moins 1 membre")
        if v > 20:
            raise ValueError("Maximum 20 membres")
        return v

    @field_validator("generations")
    @classmethod
    def validate_generations(cls, v):
        if v not in (1, 2, 3):
            raise ValueError("Les générations doivent être 1, 2 ou 3")
        return v

    @field_validator("guest_frequency")
    @classmethod
    def validate_guest_frequency(cls, v):
        allowed = {"NEVER", "LOW", "MEDIUM", "HIGH"}
        if v not in allowed:
            raise ValueError(f"guest_frequency doit être: {', '.join(sorted(allowed))}")
        return v

    @field_validator("floors")
    @classmethod
    def validate_floors(cls, v):
        if v not in (0, 1, 2):
            raise ValueError("Étages actuels: 0 (R+0), 1 (R+1) ou 2 (R+2)")
        return v

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v):
        if v <= 1_000_000:
            raise ValueError("Le budget doit être supérieur à 1 000 000 DA")
        if v > 500_000_000:
            raise ValueError("Le budget ne peut pas dépasser 500 000 000 DA")
        return v

    @model_validator(mode="after")
    def validate_cross_fields(self):
        """Cross-field validation: emprise minimale."""
        built_area = self.built_width_m * self.built_depth_m
        if built_area < 30:
            raise ValueError(
                f"Emprise trop petite ({built_area:.0f} m²). Minimum 30 m² requis."
            )
        return self

    @property
    def built_area(self) -> float:
        """Surface d'emprise au sol (m²)."""
        return round(self.built_width_m * self.built_depth_m, 1)

    @property
    def seismic_zone(self) -> str:
        return WILAYA_SEISMIC_ZONE.get(self.wilaya, "MEDIUM")

    @property
    def climate_zone(self) -> str:
        return WILAYA_CLIMATE_ZONE.get(self.wilaya, "COASTAL")

    @property
    def wilaya_name(self) -> str:
        return WILAYA_NAMES.get(self.wilaya, f"Wilaya {self.wilaya}")


# ─────────────────────────────────────────────────────────────
#  RESPONSE MODELS — Spatial output (new in v2)
# ─────────────────────────────────────────────────────────────

class RoomOutput(BaseModel):
    """
    A single room in the generated plan — now includes spatial coordinates.
    x, y: top-left corner of room in meters from site origin (0,0 = front-left)
    width, height: room dimensions in meters
    """
    room_type: str
    label_fr: str
    label_ar: str
    zone: str             # public | semi-public | private | service | circulation
    privacy_level: int    # 1=PUBLIC, 2=SEMI_PUBLIC, 3=PRIVATE, 4=SERVICE, 5=CIRCULATION
    area_m2: float
    floor: int
    # ── Spatial data (NEW in v2) ──
    x: float              # meters from origin (0,0 = front-left of effective buildable area)
    y: float              # meters from origin
    width: float          # meters
    height: float         # meters
    # ── Structural context ──
    has_exterior_wall_north: bool = False
    has_exterior_wall_south: bool = False
    has_exterior_wall_east: bool = False
    has_exterior_wall_west: bool = False
    # ── Notes ──
    notes: str = ""
    warnings: list[str] = []


class DoorOutput(BaseModel):
    """A door between two rooms or to exterior."""
    from_room: str
    to_room: str          # "EXTERIOR" if opening to outside
    wall_side: str        # N / S / E / W  — which wall the door is on
    x: float              # door center x in meters
    y: float              # door center y in meters
    width: float          # door width in meters (0.9 standard, 1.0 main entrance)
    swing_direction: str  # CW / CCW — clockwise or counterclockwise swing
    is_main_entrance: bool = False


class WindowOutput(BaseModel):
    room_type: str
    wall_direction: str  # N/S/E/W
    position_ratio: float  # 0.0=début, 0.5=milieu, 1.0=fin du mur
    width_m: float  # largeur fenêtre en mètres
    height_m: float  # hauteur fenêtre en mètres


class ColumnOutput(BaseModel):
    """A structural column at a grid intersection."""
    x: float         # center x of column
    y: float         # center y of column
    width: float     # column section width (m)
    depth: float     # column section depth (m)


class StructuralGridOutput(BaseModel):
    """Structural grid for renderer — exposes column positions and grid lines."""
    column_axes_x: list[float]
    column_axes_y: list[float]
    column_section: str
    max_span_m: float
    slab_thickness_cm: int
    grid_spec: str

    @property
    def num_bays_x(self) -> int:
        return len(self.column_axes_x) - 1

    @property
    def num_bays_y(self) -> int:
        return len(self.column_axes_y) - 1

    def get_bay_rect(self, bay_x: int, bay_y: int) -> tuple[float, float, float, float]:
        x_min = self.column_axes_x[bay_x]
        y_min = self.column_axes_y[bay_y]
        width = self.column_axes_x[bay_x + 1] - x_min
        height = self.column_axes_y[bay_y + 1] - y_min
        return x_min, y_min, width, height

    @property
    def x_spans(self) -> list[float]:
        return [round(self.column_axes_x[i+1] - self.column_axes_x[i], 3)
                for i in range(len(self.column_axes_x) - 1)]

    @property
    def y_spans(self) -> list[float]:
        return [round(self.column_axes_y[i+1] - self.column_axes_y[i], 3)
                for i in range(len(self.column_axes_y) - 1)]

    @property
    def column_section_val(self) -> float:
        try:
            parts = self.column_section.split("×")
            if len(parts) >= 1:
                val = float(parts[0].strip().replace("cm", ""))
                return val / 100.0
        except Exception:
            pass
        return 0.30


class FloorOutput(BaseModel):
    """All rooms on a single floor — with spatial data."""
    floor_number: int
    floor_label: str
    rooms: list[RoomOutput]
    doors: list[DoorOutput] = []
    windows: list[WindowOutput] = []
    total_room_area_m2: float
    circulation_area_m2: float
    total_floor_area_m2: float


class SiteAnalysisOutput(BaseModel):
    """Site analysis results — v3 (Oran launch). Emprise directe, sans retraits."""
    built_width_m: float = Field(..., description="Largeur emprise bâtiment (echo input)")
    built_depth_m: float = Field(..., description="Profondeur emprise bâtiment (echo input)")
    built_area_m2: float = Field(..., description="Surface emprise au sol = built_width × built_depth")
    total_built_area_m2: float = Field(..., description="Surface totale construite tous étages")
    wilaya: str
    wilaya_name: str
    seismic_zone: str = Field(..., description="Zone sismique: LOW / MEDIUM / HIGH (info uniquement)")
    climate_zone: str = Field(..., description="Zone climatique: COASTAL / HIGHLAND / ARID / SAHARAN")


class PlanSummary(BaseModel):
    """High-level plan metrics — v3 (Oran launch)."""
    built_area_m2: float = Field(..., description="Surface emprise au sol")
    total_built_area_m2: float = Field(..., description="Surface totale construite tous étages")
    floor_count: int
    bedroom_count: int
    bathroom_count: int
    seismic_zone: str
    climate_zone: str
    wilaya_name: str


class ValidationIssue(BaseModel):
    """A single architectural validation finding."""
    code: str             # e.g. 'KITCHEN_VISIBLE_FROM_ENTRANCE'
    message_fr: str       # human-readable description in French
    severity: str         # CRITICAL / HIGH / MEDIUM / LOW
    room_involved: str = ""
    suggested_fix: str = ""


class ValidationReport(BaseModel):
    """Complete validation result for the generated plan."""
    status: str           # UNBUILDABLE / PROBLEMATIC / ACCEPTABLE / GOOD
    total_issues: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    issues: list[ValidationIssue]
    passed_checks: list[str] = []     # checks that passed — for user confidence


class CostEstimateOutput(BaseModel):
    """
    Estimation de coût — v3 (Oran launch).
    Simplifié: coût min/max avec 3 lignes de breakdown.
    """
    cost_min: float = Field(..., description="Coût minimum total (structure + finitions + imprévus)")
    cost_max: float = Field(..., description="Coût maximum total (structure + finitions + imprévus)")
    budget_status: str = Field(
        ...,
        description="Statut budget: comfortable / sufficient / tight / insufficient"
    )
    built_area_total_m2: float = Field(
        ...,
        description="Surface totale construite = built_width × built_depth × (floors+1)"
    )
    rate_min_per_m2: float = Field(..., description="Taux minimum utilisé (DA/m²)")
    rate_max_per_m2: float = Field(..., description="Taux maximum utilisé (DA/m²)")
    contingency_rate: float = Field(
        default=0.20,
        description="Taux d'imprévus appliqué (toujours 20%)"
    )
    pricing_last_updated: str = Field(
        ...,
        description="Date de dernière mise à jour des prix (ex: '2025-06')"
    )
    validation_source: str = Field(
        default="",
        description="Source de validation de la tarification (ex: 'Architecte agréé')"
    )
    currency: str = Field(
        default="DZD",
        description="Devise de l'estimation"
    )
    breakdown: dict = Field(
        ...,
        description=(
            "Ventilation en 3 lignes: "
            "structure_et_finitions {min, max}, "
            "imprévus {min, max}, "
            "total {min, max}"
        )
    )


class MaterialItemOutput(BaseModel):
    category: str
    material: str
    local_availability: str = "LOCAL"   # LOCAL / IMPORTED / MIXED
    note: str = ""


class MaterialRecommendationOutput(BaseModel):
    package_level: str
    package_level_key: str
    description: str
    seismic_requirements: list[str] = []   # NEW: seismic-specific requirements
    climate_requirements: list[str] = []   # NEW: climate-specific requirements
    gros_oeuvres: list[MaterialItemOutput]
    finition: list[MaterialItemOutput]
    cost_saving_tips: list[str]


class GenerateResponseData(BaseModel):
    """Full pipeline output — plan + site + validation + cost + materials."""
    schema_version: str = "2.0"
    input_params: dict
    site_analysis: SiteAnalysisOutput
    structural_grid: StructuralGridOutput
    summary: PlanSummary
    floors: list[FloorOutput]
    validation: ValidationReport
    warnings: list[str] = []
    cost_estimate: Optional[CostEstimateOutput] = None
    material_recommendations: Optional[MaterialRecommendationOutput] = None


class GenerateResponse(BaseModel):
    """Standard success response for POST /generate."""
    status: Literal["success"] = "success"
    message: str = "Plan généré avec succès."
    data: GenerateResponseData


# ─────────────────────────────────────────────────────────────
#  ERROR MODELS (unchanged)
# ─────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    message: str
    errors: list[ErrorDetail] = []


