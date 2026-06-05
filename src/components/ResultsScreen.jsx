import PlanViewer from './PlanViewer'

/* ============================================================
   ResultsScreen — BINAA Results (Architectural-Tech UI)
   ALL DATA MAPPING PRESERVED. Only visual tokens updated.
   ============================================================ */

function formatMillions(num) {
  if (!num && num !== 0) return '0'
  const millions = num / 1_000_000
  if (millions >= 1) return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`
  return (num / 1000).toFixed(0) + 'K'
}

function formatNumber(num) {
  if (!num && num !== 0) return '0'
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// FIX #2: Key must be 'economy' to match backend package_level_key
const PACKAGE_LABELS = {
  economy:  { label: 'Économique', icon: 'savings',  color: 'text-accent-dark' },
  standard: { label: 'Standard',   icon: 'verified', color: 'text-primary'     },
  premium:  { label: 'Premium',    icon: 'diamond',  color: 'text-accent-dark'  },
}

export default function ResultsScreen({ planData, userBudget, onNewProject }) {
  const cost = planData?.cost_estimate
  const materials = planData?.material_recommendations
  const warnings = planData?.warnings || []

  // PATCH v2 — field names updated to match new backend schema
  const minCost = cost?.estimated_min_da || 0
  const maxCost = cost?.estimated_max_da || 0
  const budgetStatus = cost?.budget_status || ''
  const budgetMessage = cost?.budget_message || ''

  // breakdown is now list[CostBreakdownLine] — build display buckets from it
  const breakdownList = Array.isArray(cost?.breakdown) ? cost.breakdown : []
  const goLines   = breakdownList.filter(l => l.label_fr?.includes('Gros'))
  const finLines  = breakdownList.filter(l => l.label_fr?.includes('Finition'))
  const haouchLine = breakdownList.find(l =>
    l.label_fr?.includes('Clôture') || l.label_fr?.includes('Haouch')
  )
  const contingencyLine = breakdownList.find(l => l.label_fr?.includes('Imprévus'))

  // Aggregate min/max per bucket for display
  const sumLines = (lines) => ({
    min: lines.reduce((s, l) => s + (l.amount_min || 0), 0),
    max: lines.reduce((s, l) => s + (l.amount_max || 0), 0),
  })
  const grosOeuvresBreakdown = sumLines(goLines)
  const finitionBreakdown    = sumLines(finLines)
  const haouchBreakdown      = haouchLine
    ? { cost: Math.round(((haouchLine.amount_min || 0) + (haouchLine.amount_max || 0)) / 2) }
    : { cost: 0 }

  const packageKey = materials?.package_level_key || 'standard'
  const packageInfo = PACKAGE_LABELS[packageKey] || PACKAGE_LABELS.standard
  // PATCH v2 — recommendations wrapper removed; arrays now at top level
  const grosOeuvresMats = materials?.gros_oeuvres || []
  const finitionMats    = materials?.finition || []
  const tips = materials?.cost_saving_tips || []

  // validation issues from new backend (gracefully absent on old backend)
  const validation = planData?.validation || null
  const validationIssues = validation?.issues || []
  const criticalIssues   = validationIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')

  const avgCost = (minCost + maxCost) / 2
  const safeDivisor = avgCost > 0 ? avgCost : 1  // prevent division by zero / NaN%
  const gaugePercent = userBudget > 0 && maxCost > 0 ? Math.min(100, Math.max(5, (avgCost / (maxCost * 1.2)) * 100)) : 75
  const budgetMarkerPercent = userBudget > 0 && maxCost > 0 ? Math.min(98, Math.max(2, (userBudget / (maxCost * 1.2)) * 100)) : 85

  return (
    <div className="min-h-dvh bg-bg">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md flex items-center justify-between px-5 py-4 border-b border-border-light">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center justify-center p-2 rounded-lg hover:bg-card-alt transition-colors"
            onClick={onNewProject}
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            BINAA
          </h1>
        </div>
      </header>

      <main className="pb-10 px-4 space-y-5 max-w-lg mx-auto pt-4">

        {/* ── Hero: Budget Range ── */}
        <section className="bg-primary rounded-xl p-6 text-white shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />

          <div className="flex justify-between items-start mb-4">
            <span className="text-xs uppercase tracking-widest opacity-80 font-medium">Estimation Totale</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              budgetStatus === 'insufficient'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {budgetStatus === 'comfortable' ? '✓ Budget confortable'
                : budgetStatus === 'sufficient' ? '✓ Budget suffisant'
                : budgetStatus === 'tight' ? '⚠ Budget serré'
                : budgetStatus === 'insufficient' ? '✗ Budget insuffisant'
                : 'Estimé'}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              {formatMillions(minCost)} – {formatMillions(maxCost)}
            </h2>
            <p className="text-base font-medium opacity-90">DZD (Dinars Algériens)</p>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs opacity-70 mb-3">
              Votre budget cible: {formatMillions(userBudget)} DZD
            </p>
            <div className="w-full h-2.5 bg-white/10 rounded-full relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-accent rounded-full transition-all duration-700"
                style={{ width: `${gaugePercent}%` }}
              />
              <div
                className="absolute h-3.5 w-1 bg-white top-1/2 -translate-y-1/2 rounded-full shadow-sm"
                style={{ left: `${budgetMarkerPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] opacity-60">
              <span>Min: {formatMillions(minCost)}</span>
              <span>Max: {formatMillions(maxCost)}</span>
            </div>
          </div>
        </section>

        {/* ── Budget Status Message ── */}
        {budgetMessage && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border ${
            budgetStatus === 'insufficient'
              ? 'bg-danger-bg border-danger/20'
              : budgetStatus === 'sufficient'
              ? 'bg-success-bg border-success/20'
              : 'bg-warning-bg border-amber-200'
          }`}>
            <span className={`material-symbols-outlined mt-0.5 ${
              budgetStatus === 'insufficient' ? 'text-danger' : budgetStatus === 'sufficient' ? 'text-brand-green' : 'text-amber-600'
            }`}>
              {budgetStatus === 'insufficient' ? 'warning' : budgetStatus === 'sufficient' ? 'info' : 'check_circle'}
            </span>
            <p className="text-xs text-muted leading-relaxed">{budgetMessage}</p>
          </div>
        )}

        {/* ── Cost Breakdown ── */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-text px-1">Répartition par lot</h3>

          {/* Gros Œuvres */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-bg p-2.5 rounded-lg text-primary">
                <span className="material-symbols-outlined">architecture</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-text">Gros œuvre (Structure)</p>
                <p className="text-[10px] text-muted">Béton, acier, maçonnerie</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-text">
                {grosOeuvresBreakdown.min && grosOeuvresBreakdown.max
                  ? `${Math.round(((grosOeuvresBreakdown.min + grosOeuvresBreakdown.max) / 2) / safeDivisor * 100)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-primary font-semibold">
                ~{formatMillions(((grosOeuvresBreakdown.min || 0) + (grosOeuvresBreakdown.max || 0)) / 2)} DZD
              </p>
            </div>
          </div>

          {/* Finition */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-bg p-2.5 rounded-lg text-primary">
                <span className="material-symbols-outlined">format_paint</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-text">Second œuvre (Finition)</p>
                <p className="text-[10px] text-muted">Plâtre, peinture, sols</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-text">
                {finitionBreakdown.min && finitionBreakdown.max
                  ? `${Math.round(((finitionBreakdown.min + finitionBreakdown.max) / 2) / safeDivisor * 100)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-primary font-semibold">
                ~{formatMillions(((finitionBreakdown.min || 0) + (finitionBreakdown.max || 0)) / 2)} DZD
              </p>
            </div>
          </div>

          {/* Haouch */}
          {haouchBreakdown.cost > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-bg p-2.5 rounded-lg text-primary">
                  <span className="material-symbols-outlined">yard</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-text">Haouch / Extérieur</p>
                  <p className="text-[10px] text-muted">Cour, clôture, aménagement</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-text">
                  {`${Math.round(haouchBreakdown.cost / safeDivisor * 100)}%`}
                </p>
                <p className="text-[10px] text-primary font-semibold">
                  ~{formatMillions(haouchBreakdown.cost)} DZD
                </p>
              </div>
            </div>
          )}

          {/* Imprévus (contingency) — new in v2 backend */}
          {contingencyLine && (
            <div className="bg-card border border-accent/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-bg p-2.5 rounded-lg text-accent-dark">
                  <span className="material-symbols-outlined">savings</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-text">Imprévus (20%)</p>
                  <p className="text-[10px] text-muted">Réserve obligatoire Algérie</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent-dark">
                  {`${Math.round(((contingencyLine.amount_min + contingencyLine.amount_max) / 2) / safeDivisor * 100)}%`}
                </p>
                <p className="text-[10px] text-accent-dark font-semibold">
                  ~{formatMillions(Math.round((contingencyLine.amount_min + contingencyLine.amount_max) / 2))} DZD
                </p>
              </div>
            </div>
          )}

          {/* Seismic context — new in v2 backend */}
          {cost?.seismic_zone && (cost?.seismic_surcharge_da || 0) > 0 && (
            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-muted text-base">crisis_alert</span>
              <p className="text-[11px] text-muted leading-relaxed">
                Zone sismique <strong className="text-text">{cost.seismic_zone}</strong>
                {' '}— surcharge structurelle incluse: <strong className="text-text">+{formatMillions(cost.seismic_surcharge_da)} DZD</strong>.
              </p>
            </div>
          )}
        </section>

        {/* Validation issues — new in v2 backend, invisible on old backend */}
        {criticalIssues.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-text px-1">Points Critiques</h3>
            {criticalIssues.map((issue, i) => (
              <div
                key={`issue-${i}`}
                className={`rounded-xl p-4 flex gap-3 items-start border ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-danger-bg border-danger/20'
                    : 'bg-warning-bg border-amber-200'
                }`}
              >
                <span className={`material-symbols-outlined mt-0.5 text-base ${
                  issue.severity === 'CRITICAL' ? 'text-danger' : 'text-amber-600'
                }`}>
                  {issue.severity === 'CRITICAL' ? 'error' : 'warning'}
                </span>
                <div>
                  <p className="text-xs text-text font-semibold leading-snug">{issue.message_fr}</p>
                  {issue.suggested_fix && (
                    <p className="text-[10px] text-muted mt-1 leading-relaxed">✏ {issue.suggested_fix}</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Materials ── */}
        {materials && (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-text px-1">Matériaux Recommandés</h3>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-bg ${packageInfo.color}`}>
                  <span className="material-symbols-outlined">{packageInfo.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-text">Pack {materials.package_level}</p>
                  <p className="text-[11px] text-muted">{materials.description}</p>
                </div>
              </div>
            </div>

            {grosOeuvresMats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Gros Œuvres</h4>
                {grosOeuvresMats.map((item, i) => (
                  <div key={`go-${i}`} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">construction</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-text">{item.category}</p>
                      <p className="text-xs text-muted">{item.material}</p>
                      {item.note && <p className="text-[10px] text-muted/70 mt-1 italic">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {finitionMats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Finition</h4>
                {finitionMats.map((item, i) => (
                  <div key={`fin-${i}`} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">format_paint</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-text">{item.category}</p>
                      <p className="text-xs text-muted">{item.material}</p>
                      {item.note && <p className="text-[10px] text-muted/70 mt-1 italic">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Plan Viewer ── */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-text px-1">Plan 2D — Votre Maison</h3>
          <PlanViewer planData={planData} />
        </section>

        {/* ── Tips ── */}
        {tips.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-text px-1">Conseils d'Experts</h3>
            {tips.map((tip, i) => (
              <div key={`tip-${i}`} className="bg-card border border-brand-green/15 rounded-xl p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-brand-green mt-0.5 filled">check_circle</span>
                <div>
                  <p className="font-semibold text-sm text-brand-green">Astuce #{i + 1}</p>
                  <p className="text-xs text-muted leading-relaxed">{tip}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Warnings ── */}
        {warnings.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-text px-1">Points de Vigilance</h3>
            {warnings.map((w, i) => (
              <div key={`warn-${i}`} className="bg-card border border-accent/20 rounded-xl p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-accent-dark mt-0.5">warning</span>
                <p className="text-xs text-muted leading-relaxed">{w}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── CTAs ── */}
        <div className="pt-2 space-y-3">
          <button className="btn-primary" onClick={onNewProject}>
            <span className="material-symbols-outlined">add_circle</span>
            Nouvelle estimation
          </button>
          <button
            className="btn-secondary w-full"
            onClick={() => alert("Fonctionnalité d'envoi d'email à venir !")}
          >
            <span className="material-symbols-outlined">mail</span>
            Recevoir mon devis par email
          </button>
        </div>

        {/* ── Footer ── */}
        <footer className="flex flex-col items-center justify-center w-full px-4 space-y-2 mt-6">
          <p className="text-[10px] uppercase tracking-widest text-center text-muted">
            Données vérifiées par des professionnels agréés | 2026
          </p>
          <div className="flex gap-4">
            <span className="text-[10px] uppercase tracking-widest text-muted hover:text-primary cursor-pointer transition-colors">Security</span>
            <span className="text-[10px] uppercase tracking-widest text-muted hover:text-primary cursor-pointer transition-colors">Terms</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
