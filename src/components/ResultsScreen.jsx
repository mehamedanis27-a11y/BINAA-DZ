import React, { useCallback, useState } from 'react'
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

  const [selectedCat, setSelectedCat] = useState('all')
  const catFilter = selectedCat === 'all' ? null : selectedCat

  const minCost = cost?.estimated_min_da || 0
  const maxCost = cost?.estimated_max_da || 0
  const budgetStatus = cost?.budget_status || ''
  const budgetMessage = cost?.budget_message || ''

  // breakdown is now list[CostBreakdownLine] — build display buckets from it
  const breakdownList = Array.isArray(cost?.breakdown) ? cost.breakdown : []
  const goLines   = breakdownList.filter(l => l.label_fr?.includes('Gros') || l.label_fr?.includes('Structure') || l.label_fr?.includes('Fondation'))
  const finLines  = breakdownList.filter(l => l.label_fr?.includes('Finition') || l.label_fr?.includes('Plomberie') || l.label_fr?.includes('Électricité') || l.label_fr?.includes('Peinture') || l.label_fr?.includes('Revêtement') || l.label_fr?.includes('Toiture'))
  const vrdLines  = breakdownList.filter(l => l.label_fr?.includes('VRD') || l.label_fr?.includes('Raccordement'))
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
  const vrdBreakdown         = sumLines(vrdLines)
  const haouchBreakdown      = haouchLine
    ? { cost: Math.round(((haouchLine.amount_min || 0) + (haouchLine.amount_max || 0)) / 2) }
    : { cost: 0 }

  const packageKey = materials?.package_level_key || 'standard'
  const packageInfo = PACKAGE_LABELS[packageKey] || PACKAGE_LABELS.standard

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

  const handleShare = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width  = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#002645'
    ctx.fillRect(0, 0, 1200, 630)

    // Accent bar
    ctx.fillStyle = '#E8622A'
    ctx.fillRect(0, 0, 8, 630)

    // BINAA logo text
    ctx.font = 'bold 52px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('BINAA', 50, 90)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('بناء', 200, 88)

    // Wilaya + surface
    const siteSummary = planData.data ? planData.data.summary : planData.summary
    const costData = planData.data ? planData.data.cost_estimate : planData.cost_estimate
    const siteAnalysis = planData.data ? planData.data.site_analysis : planData.site_analysis
    ctx.font = '22px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(
      `${costData.wilaya_name} · ${siteSummary.total_built_m2?.toFixed(0) ?? '–'} m²`,
      50, 150
    )

    // Cost range
    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = '#E8622A'
    const minM = (costData.estimated_min_da / 1_000_000).toFixed(1)
    const maxM = (costData.estimated_max_da / 1_000_000).toFixed(1)
    ctx.fillText(`${minM}M – ${maxM}M DA`, 50, 270)

    // Budget status
    const statusColors = {
      comfortable: '#2dc653',
      sufficient:  '#e9c46a',
      tight:       '#f97316',
      insufficient:'#e63946',
    }
    const statusLabels = {
      comfortable: '✓ Budget confortable',
      sufficient:  '~ Budget suffisant',
      tight:       '⚠ Budget serré',
      insufficient:'✗ Budget insuffisant',
    }
    ctx.font = 'bold 32px sans-serif'
    ctx.fillStyle = statusColors[costData.budget_status] ?? '#fff'
    ctx.fillText(statusLabels[costData.budget_status] ?? costData.budget_status, 50, 360)

    // Site info
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(`${siteAnalysis.effective_width_m?.toFixed(1)}m × ${siteAnalysis.effective_depth_m?.toFixed(1)}m constructibles`, 50, 420)

    // Footer
    ctx.font = '18px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('binaa.dz', 1200 - 130, 600)

    // Share or download
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'binaa-estimation.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'Mon estimation BINAA' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'binaa-estimation.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }, [planData])

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

      <main className="w-full max-w-none px-4 py-8 space-y-5">

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

          {cost?.price_data_date && (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted, #7b8299)',
              marginTop: '6px',
              fontFamily: 'monospace'
            }}>
              Tarifs de référence — {cost.price_data_date}
            </div>
          )}
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

        {/* ── Budget Gap Display ── */}
        {cost?.budget_gap_da > 0 && (
          <div style={{fontSize:'12px', color:'var(--red, #e63946)', padding:'8px 12px', background:'rgba(230,57,70,0.08)', borderRadius:'8px'}}>
            Il vous manque{' '}
            <strong>{cost.budget_gap_da.toLocaleString('fr-DZ')} DA</strong>
            {' '}pour atteindre le minimum estimé.
          </div>
        )}
        {cost?.budget_gap_da < 0 && (
          <div style={{fontSize:'12px', color:'var(--green, #2dc653)', padding:'8px 12px', background:'rgba(45,198,83,0.08)', borderRadius:'8px'}}>
            Marge disponible:{' '}
            <strong>{Math.abs(cost.budget_gap_da).toLocaleString('fr-DZ')} DA</strong>
            {' '}après la fourchette haute.
          </div>
        )}

        {/* ── Generation Warnings Banner ── */}
        {(planData?.data?.warnings?.length > 0 || planData?.warnings?.length > 0) && (
          <div style={{
            background:'rgba(233,196,106,0.1)',
            border:'1px solid rgba(233,196,106,0.3)',
            borderRadius:'8px',
            padding:'12px 16px',
            marginBottom:'16px',
          }}>
            <div style={{fontSize:'11px', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'#e9c46a', marginBottom:'8px'}}>
              Avertissements du programme
            </div>
            <ul style={{listStyle:'none', padding:0, margin:0}}>
              {(planData?.data?.warnings || planData?.warnings || []).map((w, i) => (
                <li key={i} style={{fontSize:'12px', color:'rgba(255,255,255,0.75)', padding:'3px 0'}}>⚠ {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Cost Breakdown ── */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-text px-1">Répartition par lot</h3>

          {/* Gros Œuvres */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
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
            <div className="w-full h-1.5 bg-border mt-3 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.round(((grosOeuvresBreakdown.min + grosOeuvresBreakdown.max) / 2) / safeDivisor * 100)}%` }} />
            </div>
          </div>

          {/* Finition */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-bg p-2.5 rounded-lg text-primary">
                  <span className="material-symbols-outlined">format_paint</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-text">Second œuvre (Finition)</p>
                  <p className="text-[10px] text-muted">Plâtre, plomberie, sols</p>
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
            <div className="w-full h-1.5 bg-border mt-3 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.round(((finitionBreakdown.min + finitionBreakdown.max) / 2) / safeDivisor * 100)}%` }} />
            </div>
          </div>

          {/* VRD */}
          {(vrdBreakdown.min > 0 || vrdBreakdown.max > 0) && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-bg p-2.5 rounded-lg text-primary">
                    <span className="material-symbols-outlined">power</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-text">VRD & Raccordements</p>
                    <p className="text-[10px] text-muted">Eau, électricité, gaz</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text">
                    {vrdBreakdown.min && vrdBreakdown.max
                      ? `${Math.round(((vrdBreakdown.min + vrdBreakdown.max) / 2) / safeDivisor * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-[10px] text-primary font-semibold">
                    ~{formatMillions(((vrdBreakdown.min || 0) + (vrdBreakdown.max || 0)) / 2)} DZD
                  </p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-border mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.round(((vrdBreakdown.min + vrdBreakdown.max) / 2) / safeDivisor * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Haouch */}
          {haouchBreakdown.cost > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
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
              <div className="w-full h-1.5 bg-border mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.round(haouchBreakdown.cost / safeDivisor * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Imprévus (contingency) — new in v2 backend */}
          {contingencyLine && (
            <div className="bg-card border border-accent/20 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
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
              <div className="w-full h-1.5 bg-border mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-dark" style={{ width: `${Math.round(((contingencyLine.amount_min + contingencyLine.amount_max) / 2) / safeDivisor * 100)}%` }} />
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

          {/* Detailed line-by-line breakdown with percentage bars */}
          {breakdownList.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-1 mb-2">Détail par poste</h4>
              <div className="space-y-2">
                {breakdownList.map((line, idx) => {
                  const pct = minCost > 0 ? Math.round((line.amount_min / minCost) * 100) : 0
                  return (
                    <div key={`bl-${idx}`} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text truncate">{line.label_fr}</p>
                          {line.note && (
                            <p className="text-[10px] text-muted mt-0.5 leading-snug line-clamp-2">{line.note}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-text whitespace-nowrap">
                            {formatNumber(line.amount_min)} – {formatNumber(line.amount_max)}
                          </p>
                          <p className="text-[10px] text-muted">{pct}%</p>
                        </div>
                      </div>
                      <div style={{marginTop:'4px', height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden'}}>
                        <div style={{width:`${Math.min(pct, 100)}%`, height:'100%', background:'var(--orange, #f06429)', borderRadius:'2px'}} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleShare}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{fontSize:'16px'}}>📤</span>
            Partager sur WhatsApp
          </button>
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

            {(planData?.data?.material_recommendations?.seismic_requirements?.length > 0 || materials?.seismic_requirements?.length > 0) && (
              <div style={{marginTop:'16px', padding:'12px 16px', background:'rgba(230,57,70,0.08)', borderRadius:'8px', border:'1px solid rgba(230,57,70,0.2)'}}>
                <div style={{fontSize:'11px', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'#e63946', marginBottom:'8px'}}>
                  Exigences sismiques réglementaires
                </div>
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  {(planData?.data?.material_recommendations?.seismic_requirements || materials?.seismic_requirements || []).map((req, i) => (
                    <li key={i} style={{fontSize:'12px', color:'rgba(255,255,255,0.7)', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      ⚠ {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(planData?.data?.material_recommendations?.climate_requirements?.length > 0 || materials?.climate_requirements?.length > 0) && (
              <div style={{marginTop:'10px', padding:'12px 16px', background:'rgba(72,149,239,0.08)', borderRadius:'8px', border:'1px solid rgba(72,149,239,0.2)'}}>
                <div style={{fontSize:'11px', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'#4895ef', marginBottom:'8px'}}>
                  Recommandations climatiques
                </div>
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  {(planData?.data?.material_recommendations?.climate_requirements || materials?.climate_requirements || []).map((req, i) => (
                    <li key={i} style={{fontSize:'12px', color:'rgba(255,255,255,0.7)', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      → {req}
                    </li>
                  ))}
                </ul>
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
