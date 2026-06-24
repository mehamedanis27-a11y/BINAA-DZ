import React, { useCallback, useState } from 'react'
import PlanViewer from './PlanViewer'
import TopAppBar from './TopAppBar'
import NavSidebar from './NavSidebar'

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

function SectionLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
      {children}
    </label>
  )
}

export default function ResultsScreen({ planData, userBudget, onNewProject, onNavigate, lang, onLangChange }) {
  const cost = planData?.cost_estimate || planData?.data?.cost_estimate
  const materials = planData?.material_recommendations || planData?.data?.material_recommendations
  const warnings = planData?.warnings || planData?.data?.warnings || []
  const siteAnalysis = planData?.site_analysis || planData?.data?.site_analysis
  const summary = planData?.summary || planData?.data?.summary

  const [selectedCat, setSelectedCat] = useState('all')
  const [emailStatus, setEmailStatus] = useState(null)
  const catFilter = selectedCat === 'all' ? null : selectedCat

  const minCost = cost?.cost_min || 0
  const maxCost = cost?.cost_max || 0
  const budgetStatus = cost?.budget_status || ''
  const budgetMessage = cost?.budget_message || ''

  const inputParams = planData?.data?.input_params || planData?.input_params
  const floors = inputParams?.floors !== undefined ? inputParams.floors : 0
  const built_area_total_m2 = cost?.built_area_total_m2 || summary?.total_built_area_m2 || 0

  const breakdown = cost?.breakdown || {}
  const structFin = breakdown.structure_et_finitions || { min: 0, max: 0 }
  const imprevus = breakdown.imprévus || breakdown.imprevus || { min: 0, max: 0 }

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
    const wilName = siteAnalysis?.wilaya_name || siteSummary?.wilaya_name || 'Algérie'
    const totBuilt = costData?.built_area_total_m2 || siteSummary?.total_built_area_m2 || siteAnalysis?.total_built_area_m2 || 0
    ctx.font = '22px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(
      `${wilName} · ${totBuilt?.toFixed(0) ?? '–'} m²`,
      50, 150
    )

    // Cost range
    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = '#E8622A'
    const minM = ((costData?.cost_min || 0) / 1_000_000).toFixed(1)
    const maxM = ((costData?.cost_max || 0) / 1_000_000).toFixed(1)
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
    ctx.fillStyle = statusColors[costData?.budget_status] ?? '#fff'
    ctx.fillText(statusLabels[costData?.budget_status] ?? costData?.budget_status ?? '', 50, 360)

    // Site info
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(`${siteAnalysis?.built_width_m?.toFixed(1) ?? '–'}m × ${siteAnalysis?.built_depth_m?.toFixed(1) ?? '–'}m d'emprise`, 50, 420)

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
    <div className="min-h-dvh bg-[var(--bg-base)] flex flex-col text-[var(--text-primary)]">
      <TopAppBar authenticated={true} activePage="wizard" onNavigate={onNavigate} lang={lang} onLangChange={onLangChange} />
      <NavSidebar activePage="wizard" onNavigate={onNavigate} onNewEstimation={onNewProject} />
      
      <div className="flex-1 w-full layout-content layout-sidebar-offset">
        <main className="pb-16 px-4 lg:px-10 max-w-[var(--container-max)] mx-auto w-full">
          
          {/* Navigation Action header */}
          <div className="flex items-center gap-3 mb-6 mt-4">
          <button
            onClick={onNewProject}
            className="flex items-center justify-center p-2 rounded-lg bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-high)] text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h2 className="font-['Manrope'] font-bold text-lg text-white">Résultats de l'estimation</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Projet · Conforme RPA 99</p>
              <span className="text-[var(--text-muted)] text-[10px] font-semibold">•</span>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                Surface totale construite : {built_area_total_m2} m² ({floors + 1} niveaux)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left / Main Column: Costs, Breakdown & Plan */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Card: Budget range & gauge */}
            <div className="bg-[var(--navy)] border border-[var(--border-default)] rounded-2xl p-6 relative overflow-hidden orange-glow">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined" style={{ fontSize: '100px' }}>payments</span>
              </div>

              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold">Fourchette d'estimation gros-œuvre + finitions</span>
                <span className={`badge-${budgetStatus || 'standard'}`}>
                  {budgetStatus === 'comfortable' ? '✓ Confortable'
                    : budgetStatus === 'sufficient' ? '✓ Suffisant'
                    : budgetStatus === 'tight' ? '⚠ Serré'
                    : budgetStatus === 'insufficient' ? '✗ Insuffisant'
                    : 'Estimé'}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="font-['IBM_Plex_Mono'] text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  {formatMillions(minCost)} – {formatMillions(maxCost)} <span className="text-sm font-semibold text-[var(--text-secondary)]">DA</span>
                </h3>
                
                {/* Surface construite totale */}
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Surface totale construite : <strong className="text-white">{built_area_total_m2} m²</strong> ({floors + 1} niveaux)
                </p>

                {cost?.pricing_last_updated && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[var(--text-muted)] font-['IBM_Plex_Mono']">
                    <span className="material-symbols-outlined text-[14px] text-[var(--success)]">verified</span>
                    <span>Données validées : {cost.validation_source} ({cost.pricing_last_updated})</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-2 font-medium">
                  <span>Votre budget cible : {formatMillions(userBudget)} DA</span>
                  <span>Max : {formatMillions(maxCost)} DA</span>
                </div>
                <div className="w-full h-3 bg-[var(--bg-base)] rounded-full relative overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="absolute left-0 top-0 h-full bg-[var(--orange)] rounded-full transition-all duration-1000"
                    style={{ width: `${gaugePercent}%` }}
                  />
                  <div
                    className="absolute h-4 w-1 bg-white top-1/2 -translate-y-1/2 rounded-full shadow-md z-10"
                    style={{ left: `${budgetMarkerPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--text-muted)] font-['IBM_Plex_Mono']">
                  <span>Min ({formatMillions(minCost)})</span>
                  <span>Moyen (~{formatNumber((minCost + maxCost) / 2)} DA)</span>
                  <span>Max ({formatMillions(maxCost)})</span>
                </div>
              </div>
            </div>

            {/* Budget status detail block */}
            {budgetMessage && (
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                budgetStatus === 'insufficient'
                  ? 'bg-[var(--danger-bg)] border-[var(--danger)]/20'
                  : budgetStatus === 'sufficient'
                  ? 'bg-[var(--success-bg)] border-[var(--success)]/20'
                  : 'bg-[var(--warning-bg)] border-[var(--warning)]/20'
              }`}>
                <span className={`material-symbols-outlined mt-0.5 ${
                  budgetStatus === 'insufficient' ? 'text-[var(--danger)]' : budgetStatus === 'comfortable' ? 'text-[var(--success)]' : 'text-[var(--warning)]'
                }`}>
                  {budgetStatus === 'insufficient' ? 'error' : budgetStatus === 'comfortable' ? 'check_circle' : 'warning'}
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">{budgetMessage}</p>
                  
                  {cost?.budget_gap_da > 0 && (
                    <p className="text-xs font-bold text-[var(--danger)] mt-1.5 font-['IBM_Plex_Mono']">
                      Écart à combler : +{cost.budget_gap_da.toLocaleString('fr-DZ')} DA
                    </p>
                  )}
                  {cost?.budget_gap_da < 0 && (
                    <p className="text-xs font-bold text-[var(--success)] mt-1.5 font-['IBM_Plex_Mono']">
                      Marge restante sécurisée : {Math.abs(cost.budget_gap_da).toLocaleString('fr-DZ')} DA
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Program Warnings Banner */}
            {(planData?.data?.warnings?.length > 0 || planData?.warnings?.length > 0) && (
              <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--warning)] mb-2">
                  Avertissements réglementaires
                </div>
                <ul className="space-y-1 text-xs text-[var(--text-primary)]">
                  {(planData?.data?.warnings || planData?.warnings || []).map((w, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plan 2D Drawing display */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xl">
              <PlanViewer planData={planData} />
            </div>

            {/* Cost Breakdown by Lot */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-['Manrope'] font-bold text-lg text-white">Ventilation des coûts</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Estimation simplifiée selon la Méthode 01 (taux all-in).</p>
              </div>

              <div className="space-y-3">
                {/* Structure + Finitions */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors">
                  <div>
                    <p className="font-semibold text-xs text-white">Structure + Finitions</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Gros œuvre + second œuvre (tout compris)</p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] font-bold text-xs text-white">
                    {formatMillions(structFin.min)} – {formatMillions(structFin.max)} DA
                  </p>
                </div>

                {/* Imprévus (20%) */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface-3)] border border-[var(--orange)]/25 hover:border-[var(--orange)]/45 transition-colors">
                  <div>
                    <p className="font-semibold text-xs text-[var(--orange)]">Imprévus (20%)</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Provision obligatoire aléas / inflation en Algérie</p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] font-bold text-xs text-[var(--orange)]">
                    {formatMillions(imprevus.min)} – {formatMillions(imprevus.max)} DA
                  </p>
                </div>

                {/* TOTAL */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--navy)] border border-[var(--orange)]/35 hover:scale-[1.01] transition-transform">
                  <div>
                    <p className="font-bold text-xs text-white">TOTAL ESTIMÉ</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium">Tout compris (Structure, finitions et imprévus)</p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] font-extrabold text-sm text-[var(--orange)]">
                    {formatMillions(minCost)} – {formatMillions(maxCost)} DA
                  </p>
                </div>
              </div>
            </div>

            {/* Seismic Zone Info Banner (Informative only, not part of cost) */}
            {siteAnalysis?.seismic_zone && (
              <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--text-muted)] text-base">info</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Zone sismique <strong className="text-white">{siteAnalysis.seismic_zone}</strong> — Consultez un ingénieur structure (RPA 99 v2003)
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Materials & Actions */}
          <div className="space-y-6">
            
            {/* Primary Action Panel */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              <SectionLabel>Actions du projet</SectionLabel>
              
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-lg">share</span>
                Partager mon estimation WhatsApp
              </button>

              {emailStatus === 'success' ? (
                <div className="p-3 bg-[var(--success-bg)] border border-[var(--success)]/20 text-[var(--success)] rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Rapport envoyé par e-mail !
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEmailStatus('success');
                    setTimeout(() => setEmailStatus(null), 5000);
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  <span className="material-symbols-outlined text-lg">mail</span>
                  Recevoir mon rapport par e-mail
                </button>
              )}

              <button
                onClick={onNewProject}
                className="w-full btn-ghost text-sm"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Nouvelle estimation
              </button>
            </div>

            {/* Critical validation issues warning card */}
            {criticalIssues.length > 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-[var(--danger)]">
                  <span className="material-symbols-outlined">warning</span>
                  <h4 className="font-['Manrope'] font-bold text-sm">Contraintes géotechniques</h4>
                </div>
                
                <div className="space-y-3 mt-3">
                  {criticalIssues.map((issue, i) => (
                    <div
                      key={`issue-${i}`}
                      className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/15 rounded-lg space-y-1.5"
                    >
                      <p className="text-xs text-white font-semibold leading-normal">{issue.message_fr}</p>
                      {issue.suggested_fix && (
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic">
                          💡 Correction conseillée : {issue.suggested_fix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Materials */}
            {materials && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-['Manrope'] font-bold text-base text-white">Recommandations matériaux</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Adapté au niveau de finition sélectionné.</p>
                </div>

                <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--bg-surface-high)] ${packageInfo.color}`}>
                    <span className="material-symbols-outlined">{packageInfo.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pack {materials.package_level || 'Standard'}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{materials.description}</p>
                  </div>
                </div>

                {grosOeuvresMats.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Structure (Gros Œuvres)</h5>
                    {grosOeuvresMats.map((item, i) => (
                      <div key={`go-${i}`} className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-start gap-3">
                        <span className="material-symbols-outlined text-[var(--orange)] text-base mt-0.5">home_repair_service</span>
                        <div className="flex-1">
                          <p className="font-bold text-xs text-white">{item.category}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.material}</p>
                          {item.note && <p className="text-[9px] text-[var(--text-muted)] mt-1 italic leading-normal">{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {finitionMats.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <h5 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Second Œuvre & Finition</h5>
                    {finitionMats.map((item, i) => (
                      <div key={`fin-${i}`} className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-start gap-3">
                        <span className="material-symbols-outlined text-[var(--orange)] text-base mt-0.5">palette</span>
                        <div className="flex-1">
                          <p className="font-bold text-xs text-white">{item.category}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.material}</p>
                          {item.note && <p className="text-[9px] text-[var(--text-muted)] mt-1 italic leading-normal">{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Seismic & Climate regulatory details */}
            {((planData?.data?.material_recommendations?.seismic_requirements?.length > 0 || materials?.seismic_requirements?.length > 0) ||
             (planData?.data?.material_recommendations?.climate_requirements?.length > 0 || materials?.climate_requirements?.length > 0)) && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
                <SectionLabel>Conformité technique & RPA 99</SectionLabel>
                
                {/* Seismic rules */}
                {(planData?.data?.material_recommendations?.seismic_requirements || materials?.seismic_requirements || []).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wider">Exigences Para-sismiques</h5>
                    <ul className="space-y-1.5">
                      {(planData?.data?.material_recommendations?.seismic_requirements || materials?.seismic_requirements || []).map((req, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5 leading-normal">
                          <span className="text-[var(--danger)] font-bold">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Climate rules */}
                {(planData?.data?.material_recommendations?.climate_requirements || materials?.climate_requirements || []).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <h5 className="text-[10px] font-bold text-[var(--info)] uppercase tracking-wider">Isolation & Climat</h5>
                    <ul className="space-y-1.5">
                      {(planData?.data?.material_recommendations?.climate_requirements || materials?.climate_requirements || []).map((req, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5 leading-normal">
                          <span className="text-[var(--info)] font-bold">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Expert tips card */}
            {tips.length > 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-3">
                <SectionLabel>Conseils d'optimisation financière</SectionLabel>
                <div className="space-y-3">
                  {tips.map((tip, i) => (
                    <div key={`tip-${i}`} className="flex gap-3 items-start border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0">
                      <span className="material-symbols-outlined text-[var(--success)] mt-0.5 filled">check_circle</span>
                      <div>
                        <p className="text-xs font-bold text-white mb-0.5">Optimisation #{i + 1}</p>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings list */}
            {warnings.length > 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-3">
                <SectionLabel>Points de vigilance</SectionLabel>
                <div className="space-y-2">
                  {warnings.map((w, i) => (
                    <div key={`warn-${i}`} className="bg-[var(--warning-bg)] border border-[var(--warning)]/15 rounded-lg p-3 flex gap-2 items-start">
                      <span className="material-symbols-outlined text-[var(--warning)] text-base mt-0.5">warning</span>
                      <p className="text-xs text-[var(--text-primary)] leading-normal">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}
