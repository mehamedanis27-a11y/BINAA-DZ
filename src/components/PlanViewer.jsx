import { useState, useRef, useEffect, useCallback } from 'react'

/* ============================================================
   PlanViewer — BINAA M5: 2D Floor Plan Visualization
   
   Renders the generated plan as a visual room layout using
   HTML Canvas. Each room is a colored rectangle with label,
   organized by zone. Users can switch floors.
   
   Design decisions:
   - HTML Canvas over SVG: better performance for many rectangles
   - Simple bin-packing layout (not real spatial placement):
     rooms arranged in rows within the buildable footprint
   - Color-coded by zone for intuitive reading
   ============================================================ */

/* ── Zone Colors ── */
const ZONE_COLORS = {
  public:       { fill: '#2A5F8F', stroke: '#3A7FC0', text: '#E0F0FF', label: 'Public' },
  'semi-public':{ fill: '#4A7A3E', stroke: '#5E9E4E', text: '#E0FFE0', label: 'Semi-Public' },
  private:      { fill: '#8B5A3C', stroke: '#A8704E', text: '#FFE8D6', label: 'Privé' },
  service:      { fill: '#5A5A6E', stroke: '#7A7A8E', text: '#E0E0F0', label: 'Service' },
  circulation:  { fill: '#3D3D4D', stroke: '#5D5D6D', text: '#C0C0D0', label: 'Circulation' },
}

/* ── Layout Constants ── */
const CANVAS_PADDING = 30
const ROOM_GAP = 4
const ROOM_MIN_RENDER_SIZE = 30
const LABEL_FONT_SIZE = 11
const AREA_FONT_SIZE = 10

function renderFromCoordinates(ctx, rooms, effectiveWidth, effectiveDepth, canvasW, canvasH, lang) {
  const PADDING = 24
  const drawW = canvasW - PADDING * 2
  const drawH = canvasH - PADDING * 2
  const scaleX = drawW / effectiveWidth
  const scaleY = drawH / effectiveDepth
  const scale  = Math.min(scaleX, scaleY)
  const offsetX = PADDING + (drawW - effectiveWidth * scale) / 2
  const offsetY = PADDING + (drawH - effectiveDepth * scale) / 2

  const ZONE_COLORS = {
    public:       { fill: 'rgba(42,95,143,0.85)',  stroke: '#3a7fc0', text: '#e0f0ff' },
    'semi-public':{ fill: 'rgba(74,122,62,0.85)',  stroke: '#5e9e4e', text: '#e0ffe0' },
    private:      { fill: 'rgba(139,90,60,0.85)',  stroke: '#a8704e', text: '#ffe8d6' },
    service:      { fill: 'rgba(90,90,110,0.85)',  stroke: '#7a7a8e', text: '#e0e0f0' },
    circulation:  { fill: 'rgba(61,61,77,0.85)',   stroke: '#5d5d6d', text: '#c0c0d0' },
  }

  // Draw plot boundary (dashed)
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.strokeRect(offsetX, offsetY, effectiveWidth * scale, effectiveDepth * scale)
  ctx.setLineDash([])
  ctx.restore()

  // Draw rooms
  rooms.forEach(room => {
    const rx = offsetX + room.x * scale
    const ry = offsetY + room.y * scale
    const rw = room.width  * scale
    const rh = room.height * scale

    const colors = ZONE_COLORS[room.zone] ?? ZONE_COLORS.service

    // Fill
    ctx.fillStyle = colors.fill
    ctx.fillRect(rx, ry, rw, rh)

    // Borders — exterior walls heavier
    const sides = [
      { axis: 'N', x1: rx,    y1: ry,    x2: rx+rw, y2: ry    },
      { axis: 'S', x1: rx,    y1: ry+rh, x2: rx+rw, y2: ry+rh },
      { axis: 'W', x1: rx,    y1: ry,    x2: rx,    y2: ry+rh },
      { axis: 'E', x1: rx+rw, y1: ry,    x2: rx+rw, y2: ry+rh },
    ]
    sides.forEach(({ axis, x1, y1, x2, y2 }) => {
      const isExterior = room[`has_exterior_wall_${axis}`] === true
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = isExterior ? colors.stroke : 'rgba(255,255,255,0.25)'
      ctx.lineWidth   = isExterior ? 2.5 : 1
      ctx.stroke()
    })

    // Label
    const label = (lang === 'ar' ? room.label_ar : room.label_fr) || room.label_fr || room.room_type
    const fontSize = Math.max(9, Math.min(12, rw / 8))
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = colors.text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, rx + rw / 2, ry + rh / 2, rw - 4)

    // Area label (small, below room name)
    if (rw > 40 && rh > 30) {
      ctx.font = `${Math.max(8, fontSize - 2)}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText(`${room.area_m2?.toFixed(1) ?? ''}m²`, rx + rw / 2, ry + rh / 2 + fontSize + 1, rw - 4)
    }
  })
}

function renderNorthArrow(ctx, canvasW, orientation) {
  const cx = canvasW - 28
  const cy = 28
  const r  = 12
  ctx.save()
  ctx.font = 'bold 10px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', cx, cy - r - 4)
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx - 5, cy + r / 2)
  ctx.lineTo(cx, cy)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + 5, cy + r / 2)
  ctx.lineTo(cx, cy)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fill()
  ctx.restore()
}

function renderScaleBar(ctx, scale, canvasH) {
  const barMeters = 5
  const barPx = barMeters * scale
  const x = 20
  const y = canvasH - 18
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + barPx, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + barPx, y - 4); ctx.lineTo(x + barPx, y + 4); ctx.stroke()
  ctx.font = '10px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`${barMeters}m`, x + barPx / 2, y + 6)
  ctx.restore()
}


/* ============================================================
   PLAN VIEWER COMPONENT
   ============================================================ */
export default function PlanViewer({ planData, onNewProject }) {
  const canvasRef = useRef(null)
  const [activeFloor, setActiveFloor] = useState(0)

  const floors = planData?.floors || []
  const summary = planData?.summary || {}
  const warnings = planData?.warnings || []
  const currentFloor = floors[activeFloor] || floors[0]

  // ── Draw on canvas whenever floor changes ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentFloor) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.parentElement.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height

    // Clear
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, W, H)

    const site = planData.data ? planData.data.site_analysis : planData.site_analysis
    const effectiveW = site.effective_width_m
    const effectiveD = site.effective_depth_m

    // Determine language from document dir or a prop
    const lang = document.documentElement.dir === 'rtl' ? 'ar' : 'fr'

    // Compute uniform scale
    const PADDING = 24
    const usableW = W - PADDING * 2
    const usableH = H - PADDING * 2
    const scale = Math.min(usableW / effectiveW, usableH / effectiveD)

    renderFromCoordinates(ctx, currentFloor.rooms, effectiveW, effectiveD, W, H, lang)
    renderNorthArrow(ctx, W, site.solar_priority_orientation)
    renderScaleBar(ctx, scale, H)
  }, [currentFloor, planData])

  // ── Redraw on resize ──
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !currentFloor) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width  = rect.width  * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const W = rect.width
      const H = rect.height

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0f1117'
      ctx.fillRect(0, 0, W, H)

      const site = planData.data ? planData.data.site_analysis : planData.site_analysis
      const effectiveW = site.effective_width_m
      const effectiveD = site.effective_depth_m

      const lang = document.documentElement.dir === 'rtl' ? 'ar' : 'fr'

      const PADDING = 24
      const usableW = W - PADDING * 2
      const usableH = H - PADDING * 2
      const scale = Math.min(usableW / effectiveW, usableH / effectiveD)

      renderFromCoordinates(ctx, currentFloor.rooms, effectiveW, effectiveD, W, H, lang)
      renderNorthArrow(ctx, W, site.solar_priority_orientation)
      renderScaleBar(ctx, scale, H)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentFloor, planData])

  if (!planData || !floors.length) return null

  return (
    <div className="plan-viewer">
      {/* ── Summary Header ── */}
      <div className="plan-summary">
        <h2 className="plan-title">Votre Plan de Maison</h2>
        <div className="plan-stats">
          <div className="plan-stat">
            <span className="plan-stat-value">{summary.effective_footprint_m2 ?? summary.buildable_footprint_m2} m²</span>
            <span className="plan-stat-label">Emprise au sol</span>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-value">{summary.total_built_area_m2} m²</span>
            <span className="plan-stat-label">Surface totale</span>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-value">{summary.floor_count}</span>
            <span className="plan-stat-label">Étage(s)</span>
          </div>
          <div className="plan-stat">
            <span className="plan-stat-value">{summary.setback_loss_percent ?? summary.setback_deduction_percent}%</span>
            <span className="plan-stat-label">Retrait/Haouch</span>
          </div>
        </div>
      </div>

      {/* ── Floor Tabs ── */}
      {floors.length > 1 && (
        <div className="floor-tabs">
          {floors.map((f, i) => (
            <button
              key={f.floor_number}
              className={`floor-tab ${i === activeFloor ? 'active' : ''}`}
              onClick={() => setActiveFloor(i)}
            >
              {f.floor_label}
            </button>
          ))}
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="plan-canvas-container">
        <canvas ref={canvasRef} />
      </div>

      {/* ── Room List ── */}
      <div className="room-list">
        <h3 className="room-list-title">
          Détail — {currentFloor?.floor_label}
        </h3>
        {currentFloor?.rooms.map((room, i) => {
          const colors = ZONE_COLORS[room.zone] || ZONE_COLORS.circulation
          return (
            <div className="room-list-item" key={`${room.room_type}-${i}`}>
              <div
                className="room-color-dot"
                style={{ backgroundColor: colors.fill }}
              />
              <div className="room-list-info">
                <span className="room-list-name">{room.label_fr}</span>
                <span className="room-list-zone">{colors.label}</span>
              </div>
              <span className="room-list-area">{room.area_m2} m²</span>
            </div>
          )
        })}
        <div className="room-list-item room-list-total">
          <div className="room-color-dot" style={{ backgroundColor: 'transparent' }} />
          <div className="room-list-info">
            <span className="room-list-name" style={{ fontWeight: 700 }}>Total pièces</span>
          </div>
          <span className="room-list-area" style={{ fontWeight: 700 }}>
            {currentFloor?.total_room_area_m2} m²
          </span>
        </div>
      </div>

      {/* ── Zone Legend ── */}
      <div className="zone-legend">
        {Object.entries(ZONE_COLORS).map(([zone, colors]) => (
          <div className="legend-item" key={zone}>
            <div className="legend-dot" style={{ backgroundColor: colors.fill }} />
            <span className="legend-label">{colors.label}</span>
          </div>
        ))}
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="plan-warnings">
          {warnings.map((w, i) => (
            <div className="plan-warning" key={i}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {/* ── Actions (only shown when used standalone) ── */}
      {onNewProject && (
        <div className="flex justify-center mt-4">
          <button
            className="px-6 py-3 rounded-lg border border-outline-variant text-on-surface-variant font-headline font-bold transition-all hover:bg-surface-container-low active:scale-95 flex items-center gap-2"
            onClick={onNewProject}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Nouveau projet
          </button>
        </div>
      )}
    </div>
  )
}
