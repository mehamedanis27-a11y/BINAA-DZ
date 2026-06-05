import { useState, useCallback } from 'react'
import ResultsScreen from './ResultsScreen'

/* ============================================================
   Wizard — BINAA User Input Wizard (Architectural-Tech UI)

   PATCH v2 — added to Step 1 (Terrain):
     - terrain_width  (float, meters)
     - terrain_depth  (float, meters)
     - wilaya         (selector, 58 wilayas)
   Removed: land_size (was a single float — backend no longer accepts it)

   All other steps, UI design, animations, and logic are unchanged.
   ============================================================ */

const STEPS = [
  { id: 'land',    label: 'Terrain',  icon: 'landscape' },
  { id: 'budget',  label: 'Budget',   icon: 'payments' },
  { id: 'floors',  label: 'Étages',   icon: 'apartment' },
  { id: 'family',  label: 'Famille',  icon: 'family_restroom' },
  { id: 'summary', label: 'Résumé',   icon: 'checklist' },
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
  terrain_width: {
    min: 5, max: 200,
    messages: {
      required: 'Veuillez entrer la largeur du terrain',
      min: 'La largeur doit être d\'au moins 5 m',
      max: 'La largeur ne peut pas dépasser 200 m',
    }
  },
  terrain_depth: {
    min: 8, max: 200,
    messages: {
      required: 'Veuillez entrer la profondeur du terrain',
      min: 'La profondeur doit être d\'au moins 8 m',
      max: 'La profondeur ne peut pas dépasser 200 m',
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_URL  = `${API_BASE}/generate`

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
export default function Wizard() {
  const [currentStep, setCurrentStep]   = useState(0)
  const [formData, setFormData]         = useState({
    /* ── PATCH: replaced land_size with terrain_width + terrain_depth + wilaya ── */
    terrain_width: '',
    terrain_depth: '',
    wilaya:        '',
    /* ── unchanged ── */
    budget:      '',
    floors:      null,
    family_size: '',
  })
  const [errors, setErrors]             = useState({})
  const [status, setStatus]             = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [planData, setPlanData]         = useState(null)

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  /* ── validateStep — case 0 updated for new terrain fields ── */
  const validateStep = useCallback((stepIndex) => {
    const stepErrors = {}
    switch (stepIndex) {

      /* PATCH — Step 0 now validates width + depth + wilaya */
      case 0: {
        const w = parseFloat2(formData.terrain_width)
        const d = parseFloat2(formData.terrain_depth)

        if (!w)
          stepErrors.terrain_width = VALIDATION.terrain_width.messages.required
        else if (w < VALIDATION.terrain_width.min)
          stepErrors.terrain_width = VALIDATION.terrain_width.messages.min
        else if (w > VALIDATION.terrain_width.max)
          stepErrors.terrain_width = VALIDATION.terrain_width.messages.max

        if (!d)
          stepErrors.terrain_depth = VALIDATION.terrain_depth.messages.required
        else if (d < VALIDATION.terrain_depth.min)
          stepErrors.terrain_depth = VALIDATION.terrain_depth.messages.min
        else if (d > VALIDATION.terrain_depth.max)
          stepErrors.terrain_depth = VALIDATION.terrain_depth.messages.max

        if (!formData.wilaya)
          stepErrors.wilaya = VALIDATION.wilaya.messages.required

        break
      }

      /* Steps 1–3: unchanged */
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

  /* ── PATCH: payload now sends terrain_width + terrain_depth + wilaya ── */
  const buildPayload = useCallback(() => ({
    terrain_width: parseFloat2(formData.terrain_width),
    terrain_depth: parseFloat2(formData.terrain_depth),
    wilaya:        formData.wilaya,
    budget:      typeof formData.budget === 'string'
      ? parseFormattedNumber(formData.budget)
      : formData.budget,
    floors:      formData.floors,
    family_size: typeof formData.family_size === 'string'
      ? parseFormattedNumber(formData.family_size)
      : formData.family_size,
  }), [formData])

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
        throw new Error(errorData.message || `Erreur serveur (${response.status})`)
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

  /* ── PATCH: reset includes new fields ── */
  const startNewProject = useCallback(() => {
    setFormData({
      terrain_width: '',
      terrain_depth: '',
      wilaya:        '',
      budget:        '',
      floors:        null,
      family_size:   '',
    })
    setCurrentStep(0)
    setStatus(null)
    setErrorMessage('')
    setPlanData(null)
  }, [])

  const dismissError = useCallback(() => { setStatus(null); setErrorMessage('') }, [])

  /* ── Derived display values ── */
  const widthValue   = parseFloat2(formData.terrain_width)
  const depthValue   = parseFloat2(formData.terrain_depth)
  const terrainArea  = widthValue > 0 && depthValue > 0
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
      />
    )
  }

  /* ════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Sticky Header (unchanged) ── */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-border-light">
        <h1 className="text-xl font-bold tracking-tight text-primary">
          BINAA
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Étape</span>
          <span className="text-sm font-bold text-primary">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      {/* ── Progress Bar (unchanged) ── */}
      <div className="h-[3px] w-full bg-border-light">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Main ── */}
      <main className="flex-1 px-5 pt-6 pb-8 flex flex-col max-w-lg mx-auto w-full">

        {/* ═══════════════════════════════════════════════════
            STEP 1 — Terrain   ← PATCHED
            Replaced single land_size input with:
              terrain_width | terrain_depth | wilaya
            ═══════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <section className="flex flex-col flex-1 animate-step-in" key="step-land">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">
                Votre terrain
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Entrez les dimensions exactes et la localisation de votre terrain.
              </p>
            </div>

            {/* Width + Depth — side by side */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <SectionLabel>Largeur (m) — façade rue</SectionLabel>
                <input
                  id="terrain_width"
                  className={`input-field ${errors.terrain_width ? 'has-error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="Ex: 10"
                  min="5"
                  max="200"
                  step="0.5"
                  value={formData.terrain_width}
                  onChange={e => updateField('terrain_width', e.target.value)}
                  autoFocus
                />
                <ErrorMsg message={errors.terrain_width} />
              </div>

              <div>
                <SectionLabel>Profondeur (m)</SectionLabel>
                <input
                  id="terrain_depth"
                  className={`input-field ${errors.terrain_depth ? 'has-error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="Ex: 15"
                  min="8"
                  max="200"
                  step="0.5"
                  value={formData.terrain_depth}
                  onChange={e => updateField('terrain_depth', e.target.value)}
                />
                <ErrorMsg message={errors.terrain_depth} />
              </div>
            </div>

            {/* Live area preview */}
            {terrainArea && (
              <div className="mb-4 p-4 bg-card border border-border rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted">Surface calculée</span>
                  <span className="text-xl font-bold text-primary">
                    {terrainArea} m²
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted">
                    {widthValue} m × {depthValue} m
                  </span>
                  {parseFloat(terrainArea) < 80 && (
                    <span className="text-xs text-amber-500 font-medium">Terrain étroit</span>
                  )}
                  {parseFloat(terrainArea) >= 300 && (
                    <span className="text-xs text-emerald-500 font-medium">Grand terrain</span>
                  )}
                </div>
              </div>
            )}

            {/* Wilaya selector */}
            <div className="mb-2">
              <SectionLabel>Wilaya</SectionLabel>
              <div className="relative">
                <select
                  id="wilaya"
                  className={`input-field appearance-none pr-10 ${errors.wilaya ? 'has-error' : ''}`}
                  value={formData.wilaya}
                  onChange={e => updateField('wilaya', e.target.value)}
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="">— Sélectionnez votre wilaya —</option>
                  {WILAYAS.map(w => (
                    <option key={w.code} value={w.code}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
                {/* Chevron icon */}
                <span
                  className="material-symbols-outlined text-muted pointer-events-none"
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', fontSize: 20,
                  }}
                >
                  expand_more
                </span>
              </div>
              <ErrorMsg message={errors.wilaya} />
            </div>

            {/* Wilaya context pill */}
            {wilayaLabel && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
                <span>
                  Zone détectée automatiquement pour{' '}
                  <strong className="text-text">{wilayaLabel.name}</strong>
                  {' '}— tarifs et sismicité régionaux appliqués.
                </span>
              </div>
            )}

            <Hint icon="straighten">
              Mesurez la façade sur rue (largeur) et la distance vers l'arrière (profondeur).
            </Hint>

            <div className="mt-auto pt-8">
              <button className="btn-primary" onClick={goNext} type="button">
                Continuer
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* ═══ STEP 2 — Budget (unchanged) ═══ */}
        {currentStep === 1 && (
          <section className="flex flex-col flex-1 animate-step-in" key="step-budget">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">
                Budget de construction
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Indiquez votre budget total en Dinars Algériens.
              </p>
            </div>

            <SectionLabel>Budget (DA — Dinars Algériens)</SectionLabel>
            <input
              id="budget"
              className={`input-field ${errors.budget ? 'has-error' : ''}`}
              type="text"
              inputMode="numeric"
              placeholder="Ex: 15 000 000"
              value={formData.budget}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                updateField('budget', digits ? formatNumber(parseInt(digits, 10)) : '')
              }}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
              autoFocus
            />
            <ErrorMsg message={errors.budget} />

            {budgetValue > 0 && (
              <div className="mt-4 p-4 bg-primary rounded-xl text-white">
                <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">Interprétation</p>
                <p className="text-sm opacity-90 leading-relaxed">
                  {budgetValue < 5_000_000
                    ? 'Budget serré — plan optimisé avec finitions économiques.'
                    : budgetValue < 15_000_000
                      ? 'Budget modéré — maison standard avec bonnes finitions.'
                      : budgetValue < 30_000_000
                        ? 'Bon budget — maison spacieuse avec finitions de qualité.'
                        : 'Budget confortable — maison premium avec prestations haut de gamme.'}
                </p>
              </div>
            )}

            {!errors.budget && (
              <Hint>Budget moyen : 10 000 000 à 30 000 000 DA</Hint>
            )}

            <div className="mt-auto pt-8 flex gap-3">
              <button className="btn-secondary px-5" onClick={goBack} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button className="btn-primary flex-1" onClick={goNext} type="button">
                Continuer
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* ═══ STEP 3 — Floors (unchanged) ═══ */}
        {currentStep === 2 && (
          <section className="flex flex-col flex-1 animate-step-in" key="step-floors">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">
                Type de construction
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Combien d'étages souhaitez-vous ?
              </p>
            </div>

            <div className="space-y-3">
              {FLOOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full p-4 bg-card rounded-xl flex items-center gap-4 transition-all active:scale-[0.98] border ${
                    formData.floors === option.value
                      ? 'border-primary shadow-md ring-1 ring-primary/15'
                      : 'border-border hover:border-muted'
                  }`}
                  onClick={() => updateField('floors', option.value)}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                    formData.floors === option.value
                      ? 'bg-primary/10 text-primary'
                      : 'bg-card-alt text-muted'
                  }`}>
                    <span className="material-symbols-outlined">{option.icon}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-text">{option.label}</div>
                    <div className="text-xs text-muted">{option.subtitle}</div>
                  </div>
                  {formData.floors === option.value && (
                    <span className="material-symbols-outlined text-primary filled">check_circle</span>
                  )}
                </button>
              ))}
            </div>
            <ErrorMsg message={errors.floors} />

            <div className="mt-auto pt-8 flex gap-3">
              <button className="btn-secondary px-5" onClick={goBack} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button className="btn-primary flex-1" onClick={goNext} type="button">
                Continuer
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* ═══ STEP 4 — Family Size (unchanged) ═══ */}
        {currentStep === 3 && (
          <section className="flex flex-col flex-1 animate-step-in" key="step-family">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">
                Taille de la famille
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Combien de personnes vivront dans cette maison ?
              </p>
            </div>

            <SectionLabel>Nombre de membres</SectionLabel>
            <input
              id="family_size"
              className={`input-field ${errors.family_size ? 'has-error' : ''}`}
              type="text"
              inputMode="numeric"
              placeholder="Ex: 5"
              value={formData.family_size}
              onChange={(e) => updateField('family_size', e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
              autoFocus
            />
            <ErrorMsg message={errors.family_size} />

            {!errors.family_size && (
              <Hint>Incluez tous les membres : parents, enfants, grands-parents</Hint>
            )}

            <div className="mt-auto pt-8 flex gap-3">
              <button className="btn-secondary px-5" onClick={goBack} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button className="btn-primary flex-1" onClick={goNext} type="button">
                Continuer
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 5 — Summary   ← PATCHED
            Replaced "Terrain: X m²" with width + depth + wilaya
            ═══════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <section className="flex flex-col flex-1 animate-step-in" key="step-summary">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">
                Récapitulatif
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Vérifiez vos informations, puis lancez le calcul.
              </p>
            </div>

            <div className="space-y-3">

              {/* Terrain — PATCHED */}
              <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-start">
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-wider font-medium">
                    Terrain
                  </div>
                  <div className="font-bold text-text">
                    {widthValue} m × {depthValue} m
                    <span className="text-muted font-normal text-sm ml-2">
                      = {terrainArea} m²
                    </span>
                  </div>
                  {wilayaLabel && (
                    <div className="text-xs text-muted mt-0.5">
                      Wilaya {wilayaLabel.code} — {wilayaLabel.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => goToStep(0)}
                  className="text-accent-dark hover:text-primary transition-colors p-1 mt-0.5"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

              {/* Budget (unchanged) */}
              <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-wider font-medium">Budget</div>
                  <div className="font-bold text-text">{formatNumber(budgetValue)} DA</div>
                </div>
                <button onClick={() => goToStep(1)} className="text-accent-dark hover:text-primary transition-colors p-1">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

              {/* Floors (unchanged) */}
              <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-wider font-medium">Étages</div>
                  <div className="font-bold text-text">
                    {floorLabel ? `${floorLabel.label} — ${floorLabel.description}` : '—'}
                  </div>
                </div>
                <button onClick={() => goToStep(2)} className="text-accent-dark hover:text-primary transition-colors p-1">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

              {/* Family (unchanged) */}
              <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-wider font-medium">Famille</div>
                  <div className="font-bold text-text">{familyValue} membres</div>
                </div>
                <button onClick={() => goToStep(3)} className="text-accent-dark hover:text-primary transition-colors p-1">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

            </div>

            <div className="mt-auto pt-8 flex gap-3">
              <button className="btn-secondary px-5" onClick={goBack} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button
                className="btn-primary flex-1 animate-pulse-glow"
                onClick={handleSubmit}
                type="button"
              >
                Calculer mon estimation
              </button>
            </div>
          </section>
        )}

      </main>

      {/* ── Footer (unchanged) ── */}
      <footer className="px-6 pb-6 flex flex-col items-center gap-1">
        <p className="text-[10px] uppercase tracking-widest text-center text-muted">
          Données vérifiées par des professionnels agréés | 2026
        </p>
        <div className="flex gap-4">
          <span className="text-[10px] uppercase tracking-widest text-muted hover:text-primary cursor-pointer transition-colors">Security</span>
          <span className="text-[10px] uppercase tracking-widest text-muted hover:text-primary cursor-pointer transition-colors">Terms</span>
        </div>
      </footer>

      {/* ── Overlays (unchanged) ── */}
      {(status === 'loading' || status === 'error') && (
        <div className="status-overlay">
          {status === 'loading' && (
            <div className="bg-card border border-border rounded-xl p-10 text-center max-w-sm w-[90%] shadow-lg animate-scale-in">
              <div className="spinner" />
              <h3 className="text-lg font-bold text-primary mb-2">Génération en cours...</h3>
              <p className="text-sm text-muted">
                Nous concevons votre plan de maison. Cela peut prendre quelques secondes.
              </p>
            </div>
          )}
          {status === 'error' && (
            <div className="bg-card border border-danger/20 rounded-xl p-10 text-center max-w-sm w-[90%] shadow-lg animate-scale-in">
              <div className="text-4xl mb-4">
                <span className="material-symbols-outlined text-danger" style={{ fontSize: '48px' }}>error</span>
              </div>
              <h3 className="text-lg font-bold text-danger mb-2">Erreur de génération</h3>
              <p className="text-sm text-muted mb-6">{errorMessage}</p>
              <button className="btn-secondary" onClick={dismissError}>Réessayer</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
