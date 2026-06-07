"""
BINAA — Module M4: Material Recommendation Engine

Suggests locally available Algerian construction materials
based on the user's budget status from M3.

═══════════════════════════════════════════════════════
ALGERIAN MATERIAL MARKET — DESIGN RATIONALE
═══════════════════════════════════════════════════════

Algeria has a well-established local construction material
industry. Key suppliers and material types:

STRUCTURE:
- Cement: Lafarge Algérie, GICA group (local production)
- Steel rebar: TOSYALI (Oran), ArcelorMittal Annaba
- Aggregate: Locally quarried sand and gravel

WALLS:
- Red hollow brick (Brique creuse): Dominant wall material
  across all of Algeria. Manufactured locally everywhere.
- Parpaing (concrete block): Used for foundations and load-
  bearing walls in some regions.

FINISHING:
- Ceramic tiles: Imported (Spain, Turkey, Italy) or local
  (Groupe Céramique Algérie — Magra, Saïda).
- Plaster: Knauf Algérie, local gypsum plaster.
- Doors: Local MDF/HDF or imported Turkish solid wood.

BUDGET LOGIC:
- "insufficient": User can't cover minimum costs → Economy
  package with the cheapest viable local materials.
- "sufficient": User covers minimum but not maximum → Standard
  package with good quality local materials.
- "comfortable": User covers the maximum estimate → Premium
  package with imported/high-end options.

═══════════════════════════════════════════════════════
"""

from __future__ import annotations
from .models import MaterialRecommendationOutput, MaterialItemOutput


# ──────────────────────────────────────────────────────
#  MATERIAL DATABASE — Algerian Market
# ──────────────────────────────────────────────────────

MATERIAL_PACKAGES = {
    # ─── ECONOMY PACKAGE ─────────────────────────────
    "economy": {
        "package_level": "Économique",
        "package_level_key": "economy",
        "description": "Matériaux locaux standards — le meilleur rapport qualité/prix.",
        "gros_oeuvres": [
            {
                "category": "Fondation",
                "material": "Semelles filantes en béton armé (dosage 350 kg/m³)",
                "note": "Standard pour R+0 et R+1 en sol stable",
            },
            {
                "category": "Structure",
                "material": "Ossature poteaux-poutres en béton armé standard",
                "note": "Acier HA (TOSYALI/ArcelorMittal Annaba), ciment CPA 42.5 (GICA)",
            },
            {
                "category": "Plancher",
                "material": "Plancher en corps creux (hourdis 16+4 ou 20+5)",
                "note": "Hourdis en béton + dalle de compression",
            },
            {
                "category": "Maçonnerie",
                "material": "Brique creuse rouge 8 trous (simple paroi)",
                "note": "Épaisseur 10 ou 15 cm — production locale",
            },
            {
                "category": "Étanchéité",
                "material": "Chape d'étanchéité bitumineuse standard (40/16)",
                "note": "Appliquée sur toiture-terrasse",
            },
        ],
        "finition": [
            {
                "category": "Enduit extérieur",
                "material": "Monocouche ciment blanc (enduit projeté)",
                "note": "Application mécanique — économique et rapide",
            },
            {
                "category": "Enduit intérieur",
                "material": "Enduit plâtre traditionnel (Djir) en 2 couches",
                "note": "Plâtre local — finition lissée à la main",
            },
            {
                "category": "Sol",
                "material": "Carrelage céramique local (dalle de sol 30×30 ou 40×40)",
                "note": "Production locale (Magra, Saïda) — gamme économique",
            },
            {
                "category": "Peinture",
                "material": "Peinture vinylique intérieure + acrylique extérieure",
                "note": "Marques locales (ENAP, Oxyplast)",
            },
            {
                "category": "Menuiserie",
                "material": "Portes intérieures MDF pressé + huisseries métalliques",
                "note": "Porte d'entrée en acier blindé basique",
            },
            {
                "category": "Fenêtres",
                "material": "Fenêtres PVC simple vitrage (profil local)",
                "note": "Moins cher que l'aluminium",
            },
            {
                "category": "Plomberie",
                "material": "Tuyauterie PPR + robinetterie standard (importation turque)",
                "note": "Installation basique mais fonctionnelle",
            },
            {
                "category": "Électricité",
                "material": "Câblage cuivre section standard + tableau Legrand basique",
                "note": "Interrupteurs et prises gamme économique",
            },
        ],
    },

    # ─── STANDARD PACKAGE ────────────────────────────
    "standard": {
        "package_level": "Standard",
        "package_level_key": "standard",
        "description": "Bon équilibre qualité/durabilité — matériaux semi-premium.",
        "gros_oeuvres": [
            {
                "category": "Fondation",
                "material": "Semelles filantes renforcées ou radier général (selon étude de sol)",
                "note": "Conformité parasismique RPA 2003",
            },
            {
                "category": "Structure",
                "material": "Ossature BA parasismique renforcée (poteaux + voiles)",
                "note": "Acier HA conforme RPA + ciment CRS (résistant aux sulfates)",
            },
            {
                "category": "Plancher",
                "material": "Plancher corps creux 20+5 avec nervures renforcées",
                "note": "Ou dalle pleine pour portées importantes",
            },
            {
                "category": "Maçonnerie",
                "material": "Double cloison brique (10+5+10) avec lame d'air ou polystyrène",
                "note": "Isolation thermique conforme DTR C3-2 — double paroi",
            },
            {
                "category": "Étanchéité",
                "material": "Étanchéité multicouche (primaire + 2 couches bitume élastomère)",
                "note": "Garantie 10 ans — protection anti-UV",
            },
        ],
        "finition": [
            {
                "category": "Enduit extérieur",
                "material": "Enduit monocouche gratté ou lissé (finition décorative)",
                "note": "Avec traitement hydrofuge",
            },
            {
                "category": "Enduit intérieur",
                "material": "Enduit plâtre mécanique + bandes BA13 joints invisibles",
                "note": "Finition lisse qualité peinture",
            },
            {
                "category": "Sol",
                "material": "Grès cérame rectifié 60×60 (importation espagnole ou turque)",
                "note": "Salon et séjour en grès poli, chambres en semi-mat",
            },
            {
                "category": "Peinture",
                "material": "Peinture acrylique lavable (Jotun, Valentine, ou Seigneurie)",
                "note": "2 couches + sous-couche d'accrochage",
            },
            {
                "category": "Menuiserie",
                "material": "Portes intérieures HDF alvéolaire + chambranles bois",
                "note": "Porte d'entrée blindée certifiée (3 points)",
            },
            {
                "category": "Fenêtres",
                "material": "Fenêtres aluminium à rupture de pont thermique + double vitrage",
                "note": "Volets roulants aluminium motorisés",
            },
            {
                "category": "Plomberie",
                "material": "Tuyauterie multicouche + robinetterie chromée (Grohe/Ideal Standard)",
                "note": "Chauffe-eau solaire ou électrique 200L",
            },
            {
                "category": "Électricité",
                "material": "Câblage cuivre renforcé + tableau Schneider/Legrand complet",
                "note": "Interrupteurs Legrand Mosaic + spots LED encastrés",
            },
            {
                "category": "Faux plafond",
                "material": "Faux plafond BA13 (placoplatre) avec gorges lumineuses",
                "note": "Dans séjour, salon et Majlis",
            },
        ],
    },

    # ─── PREMIUM PACKAGE ─────────────────────────────
    "premium": {
        "package_level": "Premium",
        "package_level_key": "premium",
        "description": "Matériaux haut de gamme — confort et esthétique maximale.",
        "gros_oeuvres": [
            {
                "category": "Fondation",
                "material": "Radier général ou pieux selon étude géotechnique",
                "note": "Étude de sol obligatoire + conformité parasismique totale",
            },
            {
                "category": "Structure",
                "material": "Ossature BA haute performance + voiles de contreventement",
                "note": "Béton auto-plaçant (BAP), contrôle qualité par laboratoire",
            },
            {
                "category": "Plancher",
                "material": "Dalle pleine ou prédalle avec isolation phonique intégrée",
                "note": "Sous-couche acoustique entre étages",
            },
            {
                "category": "Maçonnerie",
                "material": "Double cloison avec isolation polystyrène extrudé 5cm + vide d'air",
                "note": "Performance thermique optimale — été frais, hiver chaud",
            },
            {
                "category": "Étanchéité",
                "material": "Étanchéité PVC ou EPDM + isolation thermique toiture (polyuréthane projeté)",
                "note": "Toiture inversée haute performance",
            },
        ],
        "finition": [
            {
                "category": "Enduit extérieur",
                "material": "Enduit décoratif taloché + parement pierre (façade principale)",
                "note": "Pierre naturelle locale ou reconstituée",
            },
            {
                "category": "Enduit intérieur",
                "material": "Enduit plâtre projeté + finition stucco ou tadelakt (Majlis)",
                "note": "Finition artisanale dans les pièces de réception",
            },
            {
                "category": "Sol",
                "material": "Grès cérame grand format 80×80 ou 120×60 (Porcelanosa, Marazzi)",
                "note": "Marbre naturel dans le Majlis et hall d'entrée",
            },
            {
                "category": "Peinture",
                "material": "Peinture premium lavable + effets décoratifs (Seigneurie, Dulux)",
                "note": "Stuc vénitien ou enduit décoratif dans le Majlis",
            },
            {
                "category": "Menuiserie",
                "material": "Portes intérieures bois massif (hêtre ou chêne) sur mesure",
                "note": "Porte d'entrée blindée haute sécurité (5 points + biométrie)",
            },
            {
                "category": "Fenêtres",
                "material": "Baies coulissantes aluminium grand format + triple vitrage",
                "note": "Volets roulants motorisés + domotique",
            },
            {
                "category": "Plomberie",
                "material": "Tuyauterie multicouche + robinetterie design (Hansgrohe, Roca)",
                "note": "Système solaire thermique + réservoir 300L + surpresseur",
            },
            {
                "category": "Électricité",
                "material": "Installation domotique complète (Legrand MyHome ou Schneider Wiser)",
                "note": "Éclairage LED architectural + prises USB intégrées",
            },
            {
                "category": "Faux plafond",
                "material": "Faux plafond design multi-niveaux avec éclairage indirect intégré",
                "note": "Toutes les pièces — gorges LED RGB dans le séjour",
            },
            {
                "category": "Climatisation",
                "material": "Système gainable centralisé (Carrier, Daikin)",
                "note": "Pré-installation complète avec gaines dissimulées",
            },
        ],
    },
}


# ──────────────────────────────────────────────────────
#  COST-SAVING TIPS — Context-aware advice
# ──────────────────────────────────────────────────────

COST_SAVING_TIPS = {
    "insufficient": [
        "Construisez le gros œuvre complet (structure + toiture) et retardez la finition "
        "des étages supérieurs. Vous pourrez les finir progressivement.",
        "Optez pour un plancher corps creux au lieu d'une dalle pleine — "
        "c'est 20 à 30% moins cher à surface égale.",
        "Utilisez la brique creuse 8 trous en simple paroi pour les cloisons intérieures "
        "et gardez la double cloison uniquement pour les murs extérieurs.",
        "Négociez l'achat de ciment et acier en gros lot directement auprès des "
        "distributeurs GICA — les prix baissent significativement en vrac.",
    ],
    "sufficient": [
        "Investissez dans la double cloison avec isolation — les économies de chauffage "
        "et climatisation rentabilisent le surcoût en 3-4 ans.",
        "Privilégiez le grès cérame local de bonne qualité plutôt que l'importé — "
        "le rapport qualité/prix est souvent meilleur.",
        "Installez un chauffe-eau solaire dès la construction — c'est beaucoup moins "
        "cher qu'en rénovation.",
    ],
    "comfortable": [
        "Avec un budget confortable, investissez dans l'isolation thermique premium — "
        "c'est un investissement à long terme pour le confort.",
        "Considérez la pré-installation de la climatisation gainable même si vous "
        "ne la connectez pas immédiatement — les gaines sont impossibles à ajouter après.",
        "Optez pour des fenêtres à rupture de pont thermique avec double vitrage — "
        "obligatoires dans la nouvelle réglementation thermique algérienne.",
    ],
}


# ──────────────────────────────────────────────────────
#  MAIN RECOMMENDATION FUNCTION
# ──────────────────────────────────────────────────────

def get_material_recommendations(
    budget_status: str,
    total_floor_area_m2: float = 0,
    seismic_zone: str = "MEDIUM",
    climate_zone: str = "COASTAL",
    wilaya: str = "31",
    finish_level: str = "standard",
) -> MaterialRecommendationOutput:
    """
    Return material recommendations based on budget status and finish level.

    v2.1: Added finish_level cross-reference with budget_status.
    Returns typed MaterialRecommendationOutput.

    Args:
        budget_status:      One of "insufficient", "tight", "sufficient", "comfortable".
        total_floor_area_m2: Total built area for context-aware tips.
        seismic_zone:       HIGH / MEDIUM / LOW (from wilaya).
        climate_zone:       COASTAL / HIGHLAND / ARID / SAHARAN.
        wilaya:             2-digit wilaya code.
        finish_level:       One of "economy", "standard", "premium".
    """

    # Map budget status → initial package key
    if budget_status == "comfortable":
        package_key = "premium"
    elif budget_status == "sufficient":
        package_key = "standard"
    else:
        package_key = "economy"

    # Cross-reference budget_status with finish_level
    finish_tier_map = {"economy": 0, "standard": 1, "premium": 2}
    budget_tier_map = {"insufficient": 0, "tight": 0, "sufficient": 1, "comfortable": 2}
    finish_tier = finish_tier_map.get(finish_level, 1)
    budget_tier = budget_tier_map.get(budget_status, 1)

    # Use the requested finish level — override budget-based package
    package_key = ["economy", "standard", "premium"][finish_tier]

    package = MATERIAL_PACKAGES[package_key]

    # Select cost-saving tips
    tips_key = budget_status if budget_status in COST_SAVING_TIPS else "insufficient"
    tips = COST_SAVING_TIPS[tips_key]

    # Pick 2 tips maximum (keep response concise)
    selected_tips = tips[:2]

    # Warn if finish level exceeds budget
    if finish_tier > budget_tier:
        selected_tips.insert(0,
            f"Finitions {finish_level} demandées mais budget {budget_status} — "
            f"priorisez les finitions haut de gamme dans les espaces de vie principaux "
            f"(salon, chambre parentale) et économisez sur les espaces secondaires."
        )

    # Add area-specific tip if house is large
    if total_floor_area_m2 > 400 and budget_status != "comfortable":
        selected_tips.append(
            f"Pour une maison de {total_floor_area_m2:.0f} m², envisagez de construire "
            f"par tranches : finissez le RDC entièrement, puis les étages progressivement."
        )

    # Build seismic-specific requirements note
    seismic_reqs = []
    if seismic_zone == "HIGH":
        seismic_reqs = [
            "Poteaux minimum 35×35cm — zone sismique haute (RPA 99 v2003)",
            "Longrines de fondation obligatoires entre tous les poteaux",
            "Étriers rapprochés à 10cm dans les zones nodales (nœuds poteaux-poutres)",
            "Consultation ingénieur de structure obligatoire avant démarrage",
        ]
    elif seismic_zone == "MEDIUM":
        seismic_reqs = [
            "Poteaux minimum 30×30cm — zone sismique moyenne",
            "Longrines de fondation recommandées",
        ]

    # Build climate-specific requirements note
    climate_reqs = []
    if climate_zone == "SAHARAN":
        climate_reqs = [
            "Murs épais (40cm minimum) pour inertie thermique — zone saharienne",
            "Toiture avec isolation renforcée (laine de roche ou polystyrène 10cm)",
            "Protections solaires obligatoires sur façades S et O",
        ]
    elif climate_zone == "ARID":
        climate_reqs = [
            "Isolation thermique recommandée en toiture",
            "Protections solaires sur façades S et O",
        ]
    elif climate_zone == "HIGHLAND":
        climate_reqs = [
            "Double vitrage recommandé — hivers froids en zone haute plaine",
            "Isolation des murs extérieurs conseillée",
        ]

    return MaterialRecommendationOutput(
        package_level=package["package_level"],
        package_level_key=package["package_level_key"],
        description=package["description"],
        gros_oeuvres=[
            MaterialItemOutput(**item) for item in package["gros_oeuvres"]
        ],
        finition=[
            MaterialItemOutput(**item) for item in package["finition"]
        ],
        seismic_requirements=seismic_reqs,
        climate_requirements=climate_reqs,
        cost_saving_tips=selected_tips,
    )


# ──────────────────────────────────────────────────────
#  TEST RUN
# ──────────────────────────────────────────────────────

def test_run():
    """Run: py -m app.material_engine"""
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 60)
    print("  BINAA -- Material Recommendation Engine -- Test Run")
    print("=" * 60)

    for status in ["insufficient", "sufficient", "comfortable"]:
        print(f"\n{'-' * 60}")
        print(f"  Budget status: {status}")
        print(f"{'-' * 60}")

        result = get_material_recommendations(
            budget_status=status,
            total_floor_area_m2=250,
            seismic_zone="HIGH",
            climate_zone="COASTAL",
            wilaya="31",
        )

        print(f"  Package: {result['package_level']}")
        print(f"  {result['description']}")
        print(f"\n  Gros Oeuvres ({len(result['gros_oeuvres'])} items):")
        for item in result["gros_oeuvres"]:
            print(f"    [{item['category']}] {item['material']}")

        print(f"\n  Finition ({len(result['finition'])} items):")
        for item in result["finition"]:
            print(f"    [{item['category']}] {item['material']}")

        if result["seismic_requirements"]:
            print(f"\n  Sismique ({len(result['seismic_requirements'])} requis):")
            for req in result["seismic_requirements"]:
                print(f"    - {req}")

        print(f"\n  Tips:")
        for tip in result["cost_saving_tips"]:
            print(f"    > {tip}")

    print(f"\n{'=' * 60}")
    print("  All test cases completed.")
    print("=" * 60)


if __name__ == "__main__":
    test_run()
