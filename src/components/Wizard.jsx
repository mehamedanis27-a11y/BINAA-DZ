import React, { useState, useCallback } from 'react'
import ResultsScreen from './ResultsScreen'
import TopAppBar from './TopAppBar'
import NavSidebar from './NavSidebar'
import { SVGDefs, IconR0, IconR1, IconR2, IconFlat, IconSteep, IconRock, IconUnknown, IconRoofFlat, IconRoofTiled } from './VisualIcons'
import BottomTabBar from './BottomTabBar'

/* ============================================================
   Wizard — BINAA User Input Wizard (Architectural-Tech UI)

   6-step wizard collecting terrain, budget, volume, family,
   finitions, and summary before submitting to POST /api/v1/generate.
   ============================================================ */

const STEPS = [
  { id: 'land',      label: 'Surface & Localisation',   description: 'Renseignez les dimensions de votre emprise bâtiment et la localisation.' },
  { id: 'budget',    label: 'Budget global',            description: 'Indiquez votre enveloppe financière globale en Dinars Algériens.' },
  { id: 'volume',    label: 'Volume & Structure',       description: 'Définissez le nombre d\'étages et le type de toiture.' },
  { id: 'family',    label: 'Famille & Privacité',      description: 'Adaptez le plan à la structure et aux besoins de votre famille.' },
  { id: 'finitions', label: 'Finitions',                description: 'Choisissez le niveau de qualité des matériaux et finitions.' },
  { id: 'summary',   label: 'Récapitulatif',            description: 'Vérifiez attentivement avant de lancer le calcul.' },
]

const FLOOR_OPTIONS = [
  { value: 0, label: 'R+0', description: 'Rez-de-chaussée uniquement', subtitle: 'Idéal pour plain-pied', icon: 'home' },
  { value: 1, label: 'R+1', description: '1 étage supplémentaire',      subtitle: 'Maison familiale',    icon: 'apartment' },
  { value: 2, label: 'R+2', description: '2 étages supplémentaires',    subtitle: 'Grande famille',      icon: 'domain' },
]

/* ── All 58 Algerian wilayas ── */
const WILAYAS = [
  { code: '01', name: 'Adrar' },
  { code: '02', name: 'Chlef' },
  { code: '03', name: 'Laghouat' },
  { code: '04', name: 'Oum El Bouaghi' },
  { code: '05', name: 'Batna' },
  { code: '06', name: 'Béjaïa' },
  { code: '07', name: 'Biskra' },
  { code: '08', name: 'Béchar' },
  { code: '09', name: 'Blida' },
  { code: '10', name: 'Bouira' },
  { code: '11', name: 'Tamanrasset' },
  { code: '12', name: 'Tébessa' },
  { code: '13', name: 'Tlemcen' },
  { code: '14', name: 'Tiaret' },
  { code: '15', name: 'Tizi Ouzou' },
  { code: '16', name: 'Alger' },
  { code: '17', name: 'Djelfa' },
  { code: '18', name: 'Jijel' },
  { code: '19', name: 'Sétif' },
  { code: '20', name: 'Saïda' },
  { code: '21', name: 'Skikda' },
  { code: '22', name: 'Sidi Bel Abbès' },
  { code: '23', name: 'Annaba' },
  { code: '24', name: 'Guelma' },
  { code: '25', name: 'Constantine' },
  { code: '26', name: 'Médéa' },
  { code: '27', name: 'Mostaganem' },
  { code: '28', name: "M'Sila" },
  { code: '29', name: 'Mascara' },
  { code: '30', name: 'Ouargla' },
  { code: '31', name: 'Oran' },
  { code: '32', name: 'El Bayadh' },
  { code: '33', name: 'Illizi' },
  { code: '34', name: 'Bordj Bou Arréridj' },
  { code: '35', name: 'Boumerdès' },
  { code: '36', name: 'El Tarf' },
  { code: '37', name: 'Tindouf' },
  { code: '38', name: 'Tissemsilt' },
  { code: '39', name: 'El Oued' },
  { code: '40', name: 'Khenchela' },
  { code: '41', name: 'Souk Ahras' },
  { code: '42', name: 'Tipaza' },
  { code: '43', name: 'Mila' },
  { code: '44', name: 'Aïn Defla' },
  { code: '45', name: 'Naâma' },
  { code: '46', name: 'Aïn Témouchent' },
  { code: '47', name: 'Ghardaïa' },
  { code: '48', name: 'Relizane' },
  { code: '49', name: 'Timimoun' },
  { code: '50', name: 'Bordj Badji Mokhtar' },
  { code: '51', name: 'Ouled Djellal' },
  { code: '52', name: 'Béni Abbès' },
  { code: '53', name: 'In Salah' },
  { code: '54', name: 'In Guezzam' },
  { code: '55', name: 'Touggourt' },
  { code: '56', name: 'Djanet' },
  { code: '57', name: "El M'Ghair" },
  { code: '58', name: 'El Menia' },
]

/* ── Validation rules ── */
const VALIDATION = {
  built_width_m: {
    min: 4, max: 100,
    messages: {
      required: 'Veuillez entrer la largeur du bâtiment',
      min: 'La largeur minimum est de 4 mètres',
      max: 'La largeur ne peut pas dépasser 100 m',
    }
  },
  built_depth_m: {
    min: 6, max: 100,
    messages: {
      required: 'Veuillez entrer la profondeur du bâtiment',
      min: 'La profondeur minimum est de 6 mètres',
      max: 'La profondeur ne peut pas dépasser 100 m',
    }
  },
  wilaya: {
    messages: { required: 'Veuillez sélectionner votre wilaya' }
  },
  budget: {
    min: 1_000_001, max: 500_000_000,
    messages: {
      required: 'Veuillez entrer votre budget',
      min: 'Le budget doit être supérieur à 1 000 000 DA',
      max: 'Le budget ne peut pas dépasser 500 000 000 DA',
    }
  },
  floors: { messages: { required: 'Veuillez choisir le nombre d\'étages' } },
  family_size: {
    min: 1, max: 20,
    messages: {
      required: 'Veuillez entrer le nombre de membres',
      min: 'Minimum 1 membre',
      max: 'Maximum 20 membres',
    }
  },
}

const SEISMIC_ZONES = {
  '16':{ zone:'III',  label:'Forte',    cls:'badge-seismic-high'   },
  '09':{ zone:'III',  label:'Forte',    cls:'badge-seismic-high'   },
  '35':{ zone:'III',  label:'Forte',    cls:'badge-seismic-high'   },
  '42':{ zone:'III',  label:'Forte',    cls:'badge-seismic-high'   },
  '15':{ zone:'III',  label:'Forte',    cls:'badge-seismic-high'   },
  '06':{ zone:'IIb',  label:'Moyenne+', cls:'badge-seismic-medium' },
  '10':{ zone:'IIb',  label:'Moyenne+', cls:'badge-seismic-medium' },
  '18':{ zone:'IIb',  label:'Moyenne+', cls:'badge-seismic-medium' },
  '02':{ zone:'IIb',  label:'Moyenne+', cls:'badge-seismic-medium' },
  '21':{ zone:'IIb',  label:'Moyenne+', cls:'badge-seismic-medium' },
  '31':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '25':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '19':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '05':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '13':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '22':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '26':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '27':{ zone:'IIa',  label:'Moyenne',  cls:'badge-seismic-medium' },
  '01':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '07':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '11':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '30':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '37':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '08':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
  '17':{ zone:'I',    label:'Faible',   cls:'badge-seismic-low'    },
}
const getSeismic = (code) =>
  SEISMIC_ZONES[code] || { zone: 'IIa', label: 'Moyenne', cls: 'badge-seismic-medium' }

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_URL  = `${API_BASE}/api/v1/generate`

function formatNumber(num) {
  if (!num && num !== 0) return ''
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function parseFormattedNumber(str) {
  return parseInt(str.replace(/\s/g, ''), 10) || 0
}
function parseFloat2(str) {
  const v = parseFloat(str)
  return isNaN(v) ? 0 : v
}

/* ── Reusable sub-components (unchanged) ── */
function SectionLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
      {children}
    </label>
  )
}

function ErrorMsg({ message }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 text-danger text-sm mt-2 animate-error-shake">
      <span className="material-symbols-outlined text-base">warning</span>
      {message}
    </div>
  )
}

function Hint({ icon, children }) {
  return (
    <div className="flex items-start gap-2 text-muted text-xs mt-3">
      <span className="material-symbols-outlined text-primary text-base mt-0.5">{icon || 'info'}</span>
      <span>{children}</span>
    </div>
  )
}

/* ============================================================
   WIZARD COMPONENT
   ============================================================ */
export default function Wizard({ onNavigate, lang, onLangChange }) {
  const [currentStep, setCurrentStep]   = useState(0)
  const [formData, setFormData]         = useState({
    built_width_m: '',
    built_depth_m: '',
    wilaya:        '',
    slope_category: 'flat',
    soil_category: 'compact',
    budget:      '',
    budget_includes_land: false,
    budget_includes_architect: false,
    budget_includes_admin: false,
    budget_includes_furniture: false,
    floors:      null,
    roof_type: 'terrasse_plate',
    family_size: '5',
    generations: 1,
    independent_generations: false,
    has_car: true,
    car_count: 1,
    guest_frequency: 'HIGH',
    finish_level: 'standard',
    vrd_aep: true,
    vrd_elec: true,
    vrd_gaz: true,
    vrd_assainissement: true,
  })
  const [errors, setErrors]             = useState({})
  const [status, setStatus]             = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [planData, setPlanData]         = useState(null)

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  /* ── validateStep — validates all fields per step ── */
  const validateStep = useCallback((stepIndex) => {
    const stepErrors = {}
    switch (stepIndex) {

      /* Step 0 validation: built dimensions + wilaya + terrain fields */
      case 0: {
        const w = parseFloat2(formData.built_width_m)
        const d = parseFloat2(formData.built_depth_m)

        if (!w)
          stepErrors.built_width_m = VALIDATION.built_width_m.messages.required
        else if (w < VALIDATION.built_width_m.min)
          stepErrors.built_width_m = VALIDATION.built_width_m.messages.min
        else if (w > VALIDATION.built_width_m.max)
          stepErrors.built_width_m = VALIDATION.built_width_m.messages.max

        if (!d)
          stepErrors.built_depth_m = VALIDATION.built_depth_m.messages.required
        else if (d < VALIDATION.built_depth_m.min)
          stepErrors.built_depth_m = VALIDATION.built_depth_m.messages.min
        else if (d > VALIDATION.built_depth_m.max)
          stepErrors.built_depth_m = VALIDATION.built_depth_m.messages.max

        if (!formData.wilaya)
          stepErrors.wilaya = VALIDATION.wilaya.messages.required

        if (!formData.slope_category)
          stepErrors.slope_category = "Sélectionnez l'état du terrain"
        if (!formData.soil_category)
          stepErrors.soil_category = "Sélectionnez le type de sol"

        break
      }

      case 1: {
        const val = typeof formData.budget === 'string'
          ? parseFormattedNumber(formData.budget)
          : formData.budget
        if (!val) stepErrors.budget = VALIDATION.budget.messages.required
        else if (val < VALIDATION.budget.min) stepErrors.budget = VALIDATION.budget.messages.min
        else if (val > VALIDATION.budget.max) stepErrors.budget = VALIDATION.budget.messages.max
        break
      }
      case 2: {
        if (formData.floors === null || formData.floors === undefined)
          stepErrors.floors = VALIDATION.floors.messages.required
        break
      }
      case 3: {
        const val = typeof formData.family_size === 'string'
          ? parseFormattedNumber(formData.family_size)
          : formData.family_size
        if (!val) stepErrors.family_size = VALIDATION.family_size.messages.required
        else if (val < VALIDATION.family_size.min) stepErrors.family_size = VALIDATION.family_size.messages.min
        else if (val > VALIDATION.family_size.max) stepErrors.family_size = VALIDATION.family_size.messages.max
        if (!formData.guest_frequency)
          stepErrors.guest_frequency = "Sélectionnez la fréquence des invités"
        if (formData.has_car === null)
          stepErrors.has_car = "Indiquez si vous avez un véhicule"
        if (!formData.generations)
          stepErrors.generations = "Sélectionnez le nombre de générations"
        break
      }
      case 4: {
        if (!formData.finish_level)
          stepErrors.finish_level = "Sélectionnez le niveau de finitions"
        break
      }
    }
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }, [formData])

  const goNext  = useCallback(() => {
    if (currentStep < STEPS.length - 1 && validateStep(currentStep))
      setCurrentStep(prev => prev + 1)
  }, [currentStep, validateStep])

  const goBack  = useCallback(() => {
    if (currentStep > 0) { setCurrentStep(prev => prev - 1); setErrors({}) }
  }, [currentStep])

  const goToStep = useCallback((step) => { setCurrentStep(step); setErrors({}) }, [])

  /* Compute the net construction budget after deducting scope items */
  const computeConstructionBudget = useCallback(() => {
    const raw = typeof formData.budget === 'string'
      ? parseFormattedNumber(formData.budget)
      : formData.budget
    if (!raw) return 0
    let deduction = 0
    if (formData.budget_includes_land)      deduction += raw * 0.40
    if (formData.budget_includes_architect) deduction += raw * 0.03
    if (formData.budget_includes_admin)     deduction += raw * 0.03
    if (formData.budget_includes_furniture) deduction += raw * 0.08
    return Math.max(raw - deduction, 0)
  }, [formData])

  /* Payload builds complete input object for POST /api/v1/generate */
  const buildPayload = useCallback(() => ({
    built_width_m:       parseFloat2(formData.built_width_m),
    built_depth_m:       parseFloat2(formData.built_depth_m),
    wilaya:              formData.wilaya,
    slope_category:      formData.slope_category     || 'flat',
    soil_category:       formData.soil_category      || 'compact',
    vrd_aep:             formData.vrd_aep,
    vrd_elec:            formData.vrd_elec,
    vrd_gaz:             formData.vrd_gaz,
    vrd_assainissement:  formData.vrd_assainissement,
    budget:              computeConstructionBudget(),
    budget_includes_land:      formData.budget_includes_land,
    budget_includes_architect: formData.budget_includes_architect,
    budget_includes_admin:     formData.budget_includes_admin,
    budget_includes_furniture: formData.budget_includes_furniture,
    floors:              formData.floors,
    roof_type:           formData.roof_type          || 'terrasse_plate',
    family_size:         typeof formData.family_size === 'string'
                           ? parseFormattedNumber(formData.family_size)
                           : formData.family_size,
    generations:         formData.generations        ?? 1,
    independent_generations: formData.independent_generations ?? false,
    guest_frequency:     formData.guest_frequency    || 'MEDIUM',
    has_car:             formData.has_car             ?? true,
    car_count:           formData.car_count           ?? 1,
    finish_level:        formData.finish_level        || 'standard',
  }), [formData, computeConstructionBudget])

  /* ── handleSubmit: unchanged ── */
  const handleSubmit = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    setPlanData(null)
    const payload    = buildPayload()
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 422 && errorData.errors?.length > 0) {
          const fieldMessages = {}
          errorData.errors.forEach(err => {
            const fieldLabel = {
              finish_level:        'Niveau de finitions',
              slope_category:      'État du terrain',
              soil_category:       'Type de sol',
              guest_frequency:     'Fréquence des invités',
              has_car:             'Véhicule',
              generations:         'Nombre de générations',
              roof_type:           'Type de toiture',
              built_width_m:       'Largeur bâtiment',
              built_depth_m:       'Profondeur bâtiment',
              wilaya:              'Wilaya',
              budget:              'Budget',
              floors:              'Étages',
              family_size:         'Taille de la famille',
            }[err.field] || err.field
            fieldMessages[err.field] = `${fieldLabel}: ${err.message}`
          })
          setErrors(fieldMessages)
          setStatus('error')
          setErrorMessage(`${errorData.errors.length} champ(s) invalide(s). Vérifiez le formulaire.`)
        } else {
          setStatus('error')
          setErrorMessage(errorData.message || 'Une erreur est survenue. Veuillez réessayer.')
        }
        return
      }
      const result = await response.json()
      setPlanData(result.data)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err.name === 'AbortError'
          ? 'La requête a expiré (30 secondes). Vérifiez votre connexion et réessayez.'
          : err.message === 'Failed to fetch'
          ? `Impossible de contacter le serveur. Vérifiez que le backend est démarré sur ${API_BASE}.`
          : err.message || 'Une erreur inattendue est survenue.'
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }, [buildPayload])

  const startNewProject = useCallback(() => {
    setFormData({
      built_width_m: '',
      built_depth_m: '',
      wilaya:        '',
      slope_category: 'flat',
      soil_category: 'compact',
      budget:      '',
      budget_includes_land: false,
      budget_includes_architect: false,
      budget_includes_admin: false,
      budget_includes_furniture: false,
      floors:      null,
      roof_type: 'terrasse_plate',
      family_size: '5',
      generations: 1,
      independent_generations: false,
      has_car: true,
      car_count: 1,
      guest_frequency: 'HIGH',
      finish_level: 'standard',
      vrd_aep: true,
      vrd_elec: true,
      vrd_gaz: true,
      vrd_assainissement: true,
    })
    setCurrentStep(0)
    setStatus(null)
    setErrorMessage('')
    setPlanData(null)
  }, [])

  const dismissError = useCallback(() => { setStatus(null); setErrorMessage('') }, [])

  /* ── Derived display values ── */
  const widthValue   = parseFloat2(formData.built_width_m)
  const depthValue   = parseFloat2(formData.built_depth_m)
  const builtArea    = widthValue > 0 && depthValue > 0
    ? (widthValue * depthValue).toFixed(1)
    : null
  const budgetValue  = typeof formData.budget === 'string'
    ? parseFormattedNumber(formData.budget)
    : formData.budget
  const familyValue  = typeof formData.family_size === 'string'
    ? parseFormattedNumber(formData.family_size)
    : formData.family_size
  const floorLabel   = FLOOR_OPTIONS.find(o => o.value === formData.floors)
  const wilayaLabel  = WILAYAS.find(w => w.code === formData.wilaya)
  const progressPercent = (currentStep / (STEPS.length - 1)) * 100

  if (status === 'success' && planData) {
    return (
      <ResultsScreen
        planData={planData}
        userBudget={budgetValue}
        onNewProject={startNewProject}
        onNavigate={onNavigate}
        lang={lang}
        onLangChange={onLangChange}
      />
    )
  }

      /* ════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════ */
  return (
    <div className="min-h-dvh bg-bg-base flex flex-col text-text-primary">
      <SVGDefs />
      <TopAppBar activePage="wizard" onNavigate={onNavigate} authenticated={true} lang={lang} onLangChange={onLangChange} />
      <NavSidebar activePage="wizard" onNavigate={onNavigate} onNewEstimation={startNewProject} />
      
      <div className="flex-1 w-full pb-32 flex justify-center items-start px-4 layout-content layout-sidebar-offset">
        <main className="w-full max-w-3xl mt-6 bg-bg-surface border border-border-subtle rounded-2xl p-6 lg:p-10 shadow-xl relative flex flex-col animate-fade-in h-auto">
          {/* ── Header & Progress ── */}
          <header className="mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-text-primary">Configuration du Projet</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Étape</span>
                <span className="text-sm font-bold text-orange">{currentStep + 1} / {STEPS.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div 
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      i < currentStep ? 'bg-teal' :
                      i === currentStep ? 'bg-orange animate-pulse-glow' : 'bg-bg-surface-3'
                    }`}
                  />
                </React.Fragment>
              ))}
            </div>
          </header>

          <div className="flex-1">
            <div className="mb-6">
              <h3 className="text-2xl font-display font-bold mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-orange text-3xl">{STEPS[currentStep].icon}</span>
                {STEPS[currentStep].label}
              </h3>
            </div>

            {/* Step 0: Terrain */}
            {currentStep === 0 && (
              <div className="space-y-8 animate-step-in">
                {/* Dimensions */}
                <div className="glass-card p-6">
                  <SectionLabel>Dimensions de l'emprise bâtiment (m)</SectionLabel>
                  <p className="text-xs text-text-muted mb-4">Entrez les dimensions de votre emprise bâtiment (déjà calculée sans retraits)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        className={`input-field mono ${errors.built_width_m ? 'error' : ''}`}
                        placeholder="Largeur (ex: 10)"
                        value={formData.built_width_m}
                        onChange={e => updateField('built_width_m', e.target.value)}
                      />
                      <ErrorMsg message={errors.built_width_m} />
                    </div>
                    <div>
                      <input
                        type="number"
                        className={`input-field mono ${errors.built_depth_m ? 'error' : ''}`}
                        placeholder="Profondeur (ex: 15)"
                        value={formData.built_depth_m}
                        onChange={e => updateField('built_depth_m', e.target.value)}
                      />
                      <ErrorMsg message={errors.built_depth_m} />
                    </div>
                  </div>
                  {builtArea && (
                    <div className="mt-4 p-3 bg-bg-surface-4 rounded-md border border-border-subtle flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Surface construite au sol</span>
                      <span className="font-mono font-bold text-orange text-lg">{builtArea} m²</span>
                    </div>
                  )}
                </div>

                {/* Localisation */}
                <div className="glass-card p-6">
                  <SectionLabel>Localisation & Risques</SectionLabel>
                  <div className="grid gap-4">
                    <div>
                      <select
                        className={`input-field ${errors.wilaya ? 'error' : ''}`}
                        value={formData.wilaya}
                        onChange={e => updateField('wilaya', e.target.value)}
                      >
                        <option value="">Sélectionnez la wilaya (01-58)</option>
                        {WILAYAS.map(w => (
                          <option key={w.code} value={w.code}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                      <ErrorMsg message={errors.wilaya} />
                    </div>
                    {wilayaLabel && (
                      <div className="flex gap-2 mt-2">
                        <span className={getSeismic(formData.wilaya).cls}>
                          Sismique : Zone {getSeismic(formData.wilaya).zone} ({getSeismic(formData.wilaya).label})
                        </span>
                        <span className="badge-coastal">Climat : {wilayaLabel.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Topographie */}
                <div className="glass-card p-6">
                  <SectionLabel>Topographie & Sol</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">État du terrain</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.slope_category === 'flat' ? 'selected' : ''}`}
                          onClick={() => updateField('slope_category', 'flat')}
                        >
                          <IconFlat className="w-10 h-10 mb-1" />
                          <span className="opt-label">Plat</span>
                        </button>
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.slope_category === 'steep' ? 'selected' : ''}`}
                          onClick={() => updateField('slope_category', 'steep')}
                        >
                          <IconSteep className="w-10 h-10 mb-1" />
                          <span className="opt-label">En pente</span>
                        </button>
                      </div>
                      <ErrorMsg message={errors.slope_category} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">Type de sol</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.soil_category === 'compact' ? 'selected' : ''}`}
                          onClick={() => updateField('soil_category', 'compact')}
                        >
                          <IconRock className="w-10 h-10 mb-1" />
                          <span className="opt-label">Dur / Rocheux</span>
                        </button>
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.soil_category === 'unknown' ? 'selected' : ''}`}
                          onClick={() => updateField('soil_category', 'unknown')}
                        >
                          <IconUnknown className="w-10 h-10 mb-1" />
                          <span className="opt-label">Inconnu</span>
                        </button>
                      </div>
                      <ErrorMsg message={errors.soil_category} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Budget */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Enveloppe budgétaire globale (DZD)</SectionLabel>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      className={`input-field mono text-2xl py-4 pl-12 ${errors.budget ? 'error' : ''}`}
                      placeholder="Ex: 15 000 000"
                      value={formatNumber(formData.budget)}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        updateField('budget', raw ? parseInt(raw, 10) : '')
                      }}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">DA</span>
                  </div>
                  <ErrorMsg message={errors.budget} />
                  <Hint icon="lightbulb">Saisissez le montant total dont vous disposez. L'IA déduira les frais annexes si cochés ci-dessous.</Hint>
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Le budget ci-dessus inclut-il :</SectionLabel>
                  <div className="space-y-3 mt-4">
                    {[
                      { id: 'budget_includes_land', label: 'L\'achat du terrain (≈ 40%)' },
                      { id: 'budget_includes_architect', label: 'Études architecte & génie civil (≈ 3%)' },
                      { id: 'budget_includes_admin', label: 'Permis & démarches administratives (≈ 3%)' },
                      { id: 'budget_includes_furniture', label: 'Ameublement & équipement (≈ 8%)' },
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-3 p-3 rounded-md border border-border-subtle hover:bg-bg-surface-4 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-orange rounded bg-bg-surface-2 border-border-strong"
                          checked={formData[item.id]}
                          onChange={e => updateField(item.id, e.target.checked)}
                        />
                        <span className="text-sm font-medium text-text-primary">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-md bg-bg-surface-2 border-l-4 border-teal flex justify-between items-center">
                    <div>
                      <span className="block text-xs text-text-muted font-semibold uppercase">Budget net construction</span>
                      <span className="text-xl font-mono font-bold text-teal">{formatNumber(computeConstructionBudget())} DA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Volume */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Gabarit de la maison</SectionLabel>
                  <div className="grid gap-3">
                    {FLOOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`option-card flex-row items-center p-4 gap-4 ${formData.floors === opt.value ? 'selected' : ''}`}
                        onClick={() => updateField('floors', opt.value)}
                      >
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                          {opt.value === 0 && <IconR0 className="w-12 h-12" />}
                          {opt.value === 1 && <IconR1 className="w-12 h-12" />}
                          {opt.value === 2 && <IconR2 className="w-12 h-12" />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-lg text-text-primary">{opt.label}</div>
                          <div className="text-sm text-text-secondary">{opt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <ErrorMsg message={errors.floors} />
                </div>



                <div className="glass-card p-6">
                  <SectionLabel>Type de toiture</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`option-card items-center justify-center text-center p-4 ${formData.roof_type === 'terrasse_plate' ? 'selected' : ''}`}
                      onClick={() => updateField('roof_type', 'terrasse_plate')}
                    >
                      <IconRoofFlat className="w-10 h-10 mb-2" />
                      <span className="font-bold">Terrasse plate</span>
                      <span className="text-xs text-text-muted">Standard Algérie</span>
                    </button>
                    <button
                      className={`option-card items-center justify-center text-center p-4 ${formData.roof_type === 'tuiles' ? 'selected' : ''}`}
                      onClick={() => updateField('roof_type', 'tuiles')}
                    >
                      <IconRoofTiled className="w-10 h-10 mb-2" />
                      <span className="font-bold">Tuiles</span>
                      <span className="text-xs text-text-muted">Pente / Charpente</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Famille */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Composition du foyer</SectionLabel>
                  <div className="flex items-center gap-6 mt-4">
                    <button 
                      className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center text-2xl hover:bg-bg-surface-4 transition-colors"
                      onClick={() => updateField('family_size', Math.max(1, familyValue - 1))}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-mono text-4xl font-bold text-orange">
                      {familyValue || 0}
                    </div>
                    <button 
                      className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center text-2xl hover:bg-bg-surface-4 transition-colors"
                      onClick={() => updateField('family_size', familyValue + 1)}
                    >
                      +
                    </button>
                  </div>
                  <ErrorMsg message={errors.family_size} />
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Cohabitation (Générations)</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      className={`option-card ${formData.generations === 1 ? 'selected' : ''}`}
                      onClick={() => updateField('generations', 1)}
                    >
                      <span className="font-bold">1 génération</span>
                      <span className="text-xs">Parents + enfants</span>
                    </button>
                    <button
                      className={`option-card ${formData.generations === 2 ? 'selected' : ''}`}
                      onClick={() => updateField('generations', 2)}
                    >
                      <span className="font-bold">2 générations</span>
                      <span className="text-xs">Avec grands-parents</span>
                    </button>
                  </div>
                  {formData.generations > 1 && (
                    <label className="flex items-center gap-3 mt-4 p-3 rounded-md bg-bg-surface-4 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-orange rounded bg-bg-surface-2 border-border-strong"
                        checked={formData.independent_generations}
                        onChange={e => updateField('independent_generations', e.target.checked)}
                      />
                      <span className="text-sm font-medium">Créer des espaces de vie indépendants</span>
                    </label>
                  )}
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Mode de vie</SectionLabel>
                  <div className="space-y-6 mt-4">
                    <div>
                      <label className="text-sm font-medium text-text-secondary block mb-3">Réception d'invités</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'LOW', label: 'Rarement' },
                          { id: 'MEDIUM', label: 'Régulièrement' },
                          { id: 'HIGH', label: 'Fréquemment' }
                        ].map(freq => (
                          <button
                            key={freq.id}
                            className={`flex-1 py-2 px-3 rounded-full border text-sm font-medium transition-colors ${
                              formData.guest_frequency === freq.id 
                                ? 'bg-orange border-orange text-white' 
                                : 'border-border-strong text-text-secondary hover:bg-bg-surface-4'
                            }`}
                            onClick={() => updateField('guest_frequency', freq.id)}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                      <ErrorMsg message={errors.guest_frequency} />
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-text-secondary">Véhicules à garer</label>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-secondary">Possédez-vous un véhicule ?</span>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={formData.has_car}
                              onChange={e => updateField('has_car', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                      
                      {formData.has_car && (
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              className={`flex-1 py-3 rounded-md border text-lg font-bold transition-colors ${
                                formData.car_count === num 
                                  ? 'bg-teal border-teal text-white' 
                                  : 'border-border-strong text-text-secondary hover:bg-bg-surface-4'
                              }`}
                              onClick={() => updateField('car_count', num)}
                            >
                              {num} <span className="text-sm font-normal material-symbols-outlined ml-1">directions_car</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Finitions */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-step-in">
                {[
                  {
                    id: 'economy',
                    label: 'Économique',
                    badge: 'badge-economy',
                    price: 'Prix bas',
                    items: ['Menuiserie locale PVC', 'Dalle de sol locale', 'Peinture monocouche', 'Sanitaires basiques']
                  },
                  {
                    id: 'standard',
                    label: 'Standard',
                    badge: 'badge-standard',
                    price: 'Milieu de gamme',
                    items: ['Aluminium double vitrage', 'Dalle de sol 1er choix', 'Peinture vinyle / satinée', 'Sanitaires import / haute qualité']
                  },
                  {
                    id: 'premium',
                    label: 'Haut Standing',
                    badge: 'badge-premium',
                    price: 'Luxe',
                    items: ['Aluminium TPR / Rideaux ext', 'Marbre / Porcelaine', 'Peinture décorative', 'Chauffage central / Clim encastrée']
                  }
                ].map(level => (
                  <button
                    key={level.id}
                    className={`option-card p-5 gap-4 relative overflow-hidden text-left ${formData.finish_level === level.id ? 'selected teal-accent' : ''}`}
                    onClick={() => updateField('finish_level', level.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-display font-bold text-lg">{level.label}</div>
                      <span className={level.badge}>{level.price}</span>
                    </div>
                    <ul className="text-sm text-text-secondary space-y-2 mt-2">
                      {level.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal text-sm">check_circle</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {formData.finish_level === level.id && (
                      <div className="absolute inset-0 border-2 border-teal rounded-md pointer-events-none"></div>
                    )}
                  </button>
                ))}
                <ErrorMsg message={errors.finish_level} />
              </div>
            )}

            {/* Step 5: Résumé */}
            {currentStep === 5 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6 border-l-4 border-orange">
                  <h3 className="text-lg font-bold mb-4">Vérification des données</h3>
                  
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Surface construite</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formData.built_width_m} × {formData.built_depth_m} m ({builtArea} m²)</span>
                        <button onClick={() => goToStep(0)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Localisation</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">Wilaya {formData.wilaya}</span>
                        <button onClick={() => goToStep(0)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Budget Net</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-teal">{formatNumber(computeConstructionBudget())} DA</span>
                        <button onClick={() => goToStep(1)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Volume</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{floorLabel?.label}</span>
                        <button onClick={() => goToStep(2)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Famille</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formData.family_size} pers. ({formData.generations} gen)</span>
                        <button onClick={() => goToStep(3)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-text-muted">Finitions</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold capitalize">{formData.finish_level}</span>
                        <button onClick={() => goToStep(4)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-dim rounded-lg p-6 text-center">
                  <span className="material-symbols-outlined text-orange text-4xl mb-3">auto_awesome</span>
                  <h4 className="text-lg font-bold text-text-primary mb-2">Prêt à générer ?</h4>
                  <p className="text-sm text-text-secondary mb-6">
                    Notre IA architecturale va traiter vos critères, appliquer les normes de construction algériennes et optimiser vos espaces en temps réel.
                  </p>
                  <button 
                    className="btn-primary lg w-full"
                    onClick={handleSubmit}
                  >
                    Lancer l'Intelligence Artificielle
                    <span className="material-symbols-outlined ml-2">rocket_launch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Fixed Footer Navigation ── */}
      <footer className="fixed bottom-0 left-0 lg:left-60 right-0 bg-bg-surface/95 backdrop-blur-md border-t border-border-subtle p-4 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          {currentStep > 0 ? (
            <button className="btn-ghost" onClick={goBack}>
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Retour
            </button>
          ) : (
            <div></div>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={goNext}>
              Suivant
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          ) : null}
        </div>
      </footer>

      {/* ── Loading Overlay ── */}
      {status === 'loading' && (
        <div className="status-overlay">
          <div className="text-center bg-bg-surface-2 p-8 rounded-xl border border-border-strong shadow-2xl max-w-sm w-full mx-4">
            <div className="spinner"></div>
            <h3 className="text-xl font-bold mb-2">Génération en cours</h3>
            <div className="text-sm text-text-secondary h-6 overflow-hidden">
              <div className="animate-[scrollText_8s_steps(4)_infinite]">
                <div>Analyse topographique...</div>
                <div>Application règles d'urbanisme...</div>
                <div>Calcul devis structure...</div>
                <div>Optimisation des espaces...</div>
              </div>
            </div>
            <div className="mt-6 h-1 w-full bg-border-light rounded-full overflow-hidden">
              <div className="h-full bg-orange animate-[pulseWidth_2s_ease-in-out_infinite]"></div>
            </div>
            <p className="text-xs text-text-muted mt-4">Environ 5 à 15 secondes...</p>
          </div>
        </div>
      )}

      {/* ── Error Overlay ── */}
      {status === 'error' && (
        <div className="status-overlay">
          <div className="text-center bg-bg-surface-2 p-8 rounded-xl border border-danger shadow-2xl max-w-sm w-full mx-4 animate-scale-in">
            <span className="material-symbols-outlined text-danger text-5xl mb-4">error</span>
            <h3 className="text-xl font-bold mb-2 text-danger">Erreur de Génération</h3>
            <p className="text-sm text-text-secondary mb-6">{errorMessage}</p>
            <div className="text-left bg-bg-surface-4 p-4 rounded-md mb-6 max-h-32 overflow-y-auto border border-border-subtle">
              {Object.entries(errors).map(([key, msg]) => (
                <div key={key} className="text-xs text-danger flex items-start gap-2 mb-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {msg}
                </div>
              ))}
            </div>
            <button className="btn-ghost w-full justify-center" onClick={dismissError}>
              Corriger les erreurs
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
