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

/**
 * Simple row-based bin-packing algorithm.
 * 
 * Arranges rooms as rectangles inside a bounding container,
 * filling rows left-to-right, top-to-bottom. Each room's visual
 * width is proportional to its area relative to the footprint.
 * 
 * This is NOT a real spatial floor plan — it's a programmatic
 * diagram showing room sizes and zones. Real spatial placement
 * would require the M2 engine to output x,y coordinates.
 */
function layoutRooms(rooms, containerWidth, containerHeight) {
  const totalArea = rooms.reduce((sum, r) => sum + r.area_m2, 0)
  if (totalArea === 0) return []

  // Scale factor: pixels per m²
  const availableArea = containerWidth * containerHeight
  const scale = Math.sqrt(availableArea / totalArea) * 0.85

  const laid = []
  let curX = 0
  let curY = 0
  let rowHeight = 0

  // Sort: large rooms first for better packing
  const sorted = [...rooms].sort((a, b) => b.area_m2 - a.area_m2)

  for (const room of sorted) {
    // Room dimensions: try to make roughly square-ish
    const area = room.area_m2 * scale * scale
    const aspect = room.room_type === 'corridor' || room.room_type === 'hall_entry' ? 2.5 : 1.3
    let w = Math.sqrt(area * aspect)
    let h = area / w

    // Enforce minimums
    w = Math.max(w, ROOM_MIN_RENDER_SIZE)
    h = Math.max(h, ROOM_MIN_RENDER_SIZE)

    // Wrap to next row if it doesn't fit
    if (curX + w > containerWidth && curX > 0) {
      curX = 0
      curY += rowHeight + ROOM_GAP
      rowHeight = 0
    }

    laid.push({
      ...room,
      x: curX,
      y: curY,
      w: Math.round(w),
      h: Math.round(h),
    })

    curX += w + ROOM_GAP
    rowHeight = Math.max(rowHeight, h)
  }

  return laid
}


/**
 * Draw the entire floor plan onto a canvas context.
 */
function drawFloor(ctx, floorData, canvasWidth, canvasHeight, pixelRatio) {
  const w = canvasWidth
  const h = canvasHeight

  // Clear
  ctx.clearRect(0, 0, w * pixelRatio, h * pixelRatio)
  ctx.save()
  ctx.scale(pixelRatio, pixelRatio)

  // Background — deep architectural blue canvas
  ctx.fillStyle = '#152C4A'
  ctx.fillRect(0, 0, w, h)

  // Title bar
  ctx.fillStyle = '#1E3A5F'
  ctx.fillRect(0, 0, w, 40)
  ctx.fillStyle = '#D6B98C'
  ctx.font = `bold 14px 'Inter', system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(
    `${floorData.floor_label} — ${floorData.total_floor_area_m2} m²`,
    CANVAS_PADDING, 26
  )
  ctx.fillStyle = '#8B949E'
  ctx.font = `12px 'Inter', system-ui, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText(
    `Pièces: ${floorData.rooms.length} | Circulation: ${floorData.circulation_area_m2} m²`,
    w - CANVAS_PADDING, 26
  )

  // Layout area
  const layoutX = CANVAS_PADDING
  const layoutY = 50
  const layoutW = w - CANVAS_PADDING * 2
  const layoutH = h - 60

  // Buildable area outline
  ctx.strokeStyle = '#30363D'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.strokeRect(layoutX, layoutY, layoutW, layoutH)
  ctx.setLineDash([])

  // Layout rooms
  const laidRooms = layoutRooms(floorData.rooms, layoutW, layoutH)

  for (const room of laidRooms) {
    const rx = layoutX + room.x
    const ry = layoutY + room.y
    const rw = room.w
    const rh = room.h
    const colors = ZONE_COLORS[room.zone] || ZONE_COLORS.circulation

    // Room fill
    ctx.fillStyle = colors.fill
    ctx.fillRect(rx, ry, rw, rh)

    // Room border
    ctx.strokeStyle = colors.stroke
    ctx.lineWidth = 1.5
    ctx.strokeRect(rx, ry, rw, rh)

    // Room label (French)
    if (rw > 40 && rh > 25) {
      ctx.fillStyle = colors.text
      ctx.font = `600 ${LABEL_FONT_SIZE}px 'Inter', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const label = room.label_fr.length > 16
        ? room.label_fr.substring(0, 14) + '…'
        : room.label_fr
      ctx.fillText(label, rx + rw / 2, ry + rh / 2 - 7)

      // Area below label
      ctx.fillStyle = colors.text
      ctx.globalAlpha = 0.7
      ctx.font = `${AREA_FONT_SIZE}px 'Inter', system-ui, sans-serif`
      ctx.fillText(`${room.area_m2} m²`, rx + rw / 2, ry + rh / 2 + 8)
      ctx.globalAlpha = 1.0
    }
  }

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
    if (!canvasRef.current || !currentFloor) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pixelRatio = window.devicePixelRatio || 1

    // Size canvas to container
    const container = canvas.parentElement
    const width = container.clientWidth
    const height = Math.max(400, Math.min(600, width * 0.75))

    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    drawFloor(ctx, currentFloor, width, height, pixelRatio)
  }, [currentFloor, activeFloor])

  // ── Redraw on resize ──
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !currentFloor) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const pixelRatio = window.devicePixelRatio || 1
      const container = canvas.parentElement
      const width = container.clientWidth
      const height = Math.max(400, Math.min(600, width * 0.75))
      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      drawFloor(ctx, currentFloor, width, height, pixelRatio)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentFloor])

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
