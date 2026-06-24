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
const CANVAS_PADDING = 30;
const ROOM_GAP = 4;
const ROOM_MIN_RENDER_SIZE = 30;
const LABEL_FONT_SIZE = 11;
const AREA_FONT_SIZE = 10;

function layoutRoomsBinPacking(rooms, canvasWidth, canvasHeight) {
  const padding = 40;
  const usableW = canvasWidth - 2 * padding;
  const usableH = canvasHeight - 2 * padding;
  
  const numRooms = rooms.length;
  if (numRooms === 0) return [];
  
  const cols = Math.ceil(Math.sqrt(numRooms));
  const rows = Math.ceil(numRooms / cols);
  
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  
  return rooms.map((room, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...room,
      canvasX: padding + col * cellW + 4,
      canvasY: padding + row * cellH + 4,
      canvasW: cellW - 8,
      canvasH: cellH - 8,
      scale: 1,
      isFallback: true
    };
  });
}

function layoutRooms(rooms, canvasWidth, canvasHeight, builtWidthM, builtDepthM) {
  // Calculer l'échelle: pixels par mètre
  const padding = 40;  // pixels de marge
  const availableW = canvasWidth - 2 * padding;
  const availableH = canvasHeight - 2 * padding;
  const scaleX = availableW / builtWidthM;  // px/m en X
  const scaleY = availableH / builtDepthM;  // px/m en Y
  const scale = Math.min(scaleX, scaleY);  // même échelle les deux axes
  
  return rooms.map(room => ({
    ...room,
    canvasX: padding + room.x * scale,
    canvasY: padding + room.y * scale,
    canvasW: room.width * scale,
    canvasH: room.height * scale,
    scale: scale
  }));
}

function drawDoor(ctx, door, scale, offsetX, offsetY) {
  const dx = offsetX + door.x * scale;
  const dy = offsetY + door.y * scale;
  const dw = door.width * scale;

  ctx.save();
  ctx.strokeStyle = '#E2E8F0'; // light gray for doors
  ctx.lineWidth = 1.5;

  if (door.wall_side === 'N' || door.wall_side === 'S') {
    const hx = dx - dw / 2;
    const hy = dy;
    const direction = door.wall_side === 'N' ? -1 : 1;
    
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx, hy + direction * dw);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    const startAngle = 0;
    const endAngle = direction * Math.PI / 2;
    ctx.arc(hx, hy, dw, startAngle, endAngle, direction === -1);
    ctx.stroke();
  } else {
    const hx = dx;
    const hy = dy - dw / 2;
    const direction = door.wall_side === 'W' ? 1 : -1;
    
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + direction * dw, hy);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    const startAngle = Math.PI / 2;
    const endAngle = direction === 1 ? 0 : Math.PI;
    ctx.arc(hx, hy, dw, startAngle, endAngle, direction === -1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDimensionLines(ctx, offsetX, offsetY, width, depth, scale) {
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const planW = width * scale;
  const planH = depth * scale;

  // Horizontal Axe X (below the plan)
  const xY = offsetY + planH + 20;
  ctx.beginPath();
  ctx.moveTo(offsetX, xY);
  ctx.lineTo(offsetX + planW, xY);
  ctx.moveTo(offsetX, xY - 4); ctx.lineTo(offsetX, xY + 4);
  ctx.moveTo(offsetX + planW, xY - 4); ctx.lineTo(offsetX + planW, xY + 4);
  ctx.stroke();

  const xText = `|←— ${width.toFixed(1)}m —→|`;
  ctx.fillStyle = '#0f1117';
  const textWidth = ctx.measureText(xText).width;
  ctx.fillRect(offsetX + planW / 2 - textWidth / 2 - 4, xY - 6, textWidth + 8, 12);
  
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(xText, offsetX + planW / 2, xY);

  // Vertical Axe Y (left of the plan)
  const yX = offsetX - 20;
  ctx.beginPath();
  ctx.moveTo(yX, offsetY);
  ctx.lineTo(yX, offsetY + planH);
  ctx.moveTo(yX - 4, offsetY); ctx.lineTo(yX + 4, offsetY);
  ctx.moveTo(yX - 4, offsetY + planH); ctx.lineTo(yX + 4, offsetY + planH);
  ctx.stroke();

  const yText = `|←— ${depth.toFixed(1)}m —→|`;
  ctx.save();
  ctx.translate(yX, offsetY + planH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#0f1117';
  const yTextW = ctx.measureText(yText).width;
  ctx.fillRect(-yTextW / 2 - 4, -6, yTextW + 8, 12);
  
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(yText, 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawStructuralGrid(ctx, grid, scale, offsetX, offsetY, width, depth) {
  if (!grid || !grid.column_axes_x || !grid.column_axes_y) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;

  const planW = width * scale;
  const planH = depth * scale;

  grid.column_axes_x.forEach(x => {
    const cx = offsetX + x * scale;
    ctx.beginPath();
    ctx.moveTo(cx, offsetY);
    ctx.lineTo(cx, offsetY + planH);
    ctx.stroke();
  });

  grid.column_axes_y.forEach(y => {
    const cy = offsetY + y * scale;
    ctx.beginPath();
    ctx.moveTo(offsetX, cy);
    ctx.lineTo(offsetX + planW, cy);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.fillStyle = '#94A3B8';
  grid.column_axes_x.forEach(x => {
    grid.column_axes_y.forEach(y => {
      const cx = offsetX + x * scale;
      const cy = offsetY + y * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.restore();
}

function drawFloorPlan(ctx, floor, site, grid, canvasW, canvasH, lang) {
  const effectiveW = site?.built_width_m || site?.effective_width_m || 10;
  const effectiveD = site?.built_depth_m || site?.effective_depth_m || 10;
  
  const allRoomsZero = floor.rooms.every(r => r.x === 0 && r.y === 0);
  const isFallback = allRoomsZero;
  
  if (isFallback) {
    console.warn("PlanViewer: coordonnées réelles non disponibles — mode bin-packing");
  }
  
  const mappedRooms = isFallback
    ? layoutRoomsBinPacking(floor.rooms, canvasW, canvasH)
    : layoutRooms(floor.rooms, canvasW, canvasH, effectiveW, effectiveD);
  
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, canvasW, canvasH);
  
  const padding = 40;
  const availableW = canvasW - 2 * padding;
  const availableH = canvasH - 2 * padding;
  const scale = Math.min(availableW / effectiveW, availableH / effectiveD);
  const offsetX = padding;
  const offsetY = padding;

  if (!isFallback && grid) {
    drawStructuralGrid(ctx, grid, scale, offsetX, offsetY, effectiveW, effectiveD);
  }
  
  const drawnDoors = new Set();

  mappedRooms.forEach(room => {
    const colors = ZONE_COLORS[room.zone] || ZONE_COLORS.circulation;
    
    // 1. Remplir le rectangle (fill selon ZONE_COLORS existant avec opacité translucide)
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(room.canvasX, room.canvasY, room.canvasW, room.canvasH);
    ctx.restore();
    
    // Draw edges
    const sides = [
      { axis: 'N', x1: room.canvasX, y1: room.canvasY, x2: room.canvasX + room.canvasW, y2: room.canvasY },
      { axis: 'S', x1: room.canvasX, y1: room.canvasY + room.canvasH, x2: room.canvasX + room.canvasW, y2: room.canvasY + room.canvasH },
      { axis: 'W', x1: room.canvasX, y1: room.canvasY, x2: room.canvasX, y2: room.canvasY + room.canvasH },
      { axis: 'E', x1: room.canvasX + room.canvasW, y1: room.canvasY, x2: room.canvasX + room.canvasW, y2: room.canvasY + room.canvasH },
    ];
    
    const axisMap = { N: 'north', S: 'south', E: 'east', W: 'west' };
    
    sides.forEach(({ axis, x1, y1, x2, y2 }) => {
      const fullAxis = axisMap[axis];
      const isExterior = room[`has_exterior_wall_${fullAxis}`] === true;
      
      if (isFallback) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }
      
      if (isExterior) {
        ctx.save();
        ctx.strokeStyle = colors.stroke;
        
        // 2px extérieur
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 1px intérieur
        const wallThickness = 0.1 * scale;
        ctx.beginPath();
        ctx.lineWidth = 1;
        if (axis === 'N') {
          ctx.moveTo(x1, y1 + wallThickness);
          ctx.lineTo(x2, y2 + wallThickness);
        } else if (axis === 'S') {
          ctx.moveTo(x1, y1 - wallThickness);
          ctx.lineTo(x2, y2 - wallThickness);
        } else if (axis === 'W') {
          ctx.moveTo(x1 + wallThickness, y1);
          ctx.lineTo(x2 + wallThickness, y2);
        } else if (axis === 'E') {
          ctx.moveTo(x1 - wallThickness, y1);
          ctx.lineTo(x2 - wallThickness, y2);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Simple 1px line for interior walls
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // 5. Si room.windows existe → dessiner les fenêtres (petits rectangles blancs sur le mur ext.)
    const roomWindows = room.windows || (floor.windows || []).filter(w => {
      if (w.room_type !== room.room_type) return false;
      const fullAxis = axisMap[w.wall_direction];
      return room[`has_exterior_wall_${fullAxis}`] === true;
    });
    
    if (!isFallback && roomWindows.length > 0) {
      roomWindows.forEach(win => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#64748B';
        
        const winW = win.width_m * scale;
        const wallThickness = 0.1 * scale;
        
        let wx, wy;
        if (win.wall_direction === 'N') {
          wx = room.canvasX + win.position_ratio * room.canvasW - winW / 2;
          wy = room.canvasY;
          
          ctx.fillRect(wx, wy, winW, wallThickness);
          
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + winW, wy);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy + wallThickness);
          ctx.lineTo(wx + winW, wy + wallThickness);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx, wy + wallThickness);
          ctx.moveTo(wx + winW, wy);
          ctx.lineTo(wx + winW, wy + wallThickness);
          ctx.stroke();
        } else if (win.wall_direction === 'S') {
          wx = room.canvasX + win.position_ratio * room.canvasW - winW / 2;
          wy = room.canvasY + room.canvasH - wallThickness;
          
          ctx.fillRect(wx, wy, winW, wallThickness);
          
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.moveTo(wx, wy + wallThickness);
          ctx.lineTo(wx + winW, wy + wallThickness);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + winW, wy);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx, wy + wallThickness);
          ctx.moveTo(wx + winW, wy);
          ctx.lineTo(wx + winW, wy + wallThickness);
          ctx.stroke();
        } else if (win.wall_direction === 'W') {
          wx = room.canvasX;
          wy = room.canvasY + win.position_ratio * room.canvasH - winW / 2;
          
          ctx.fillRect(wx, wy, wallThickness, winW);
          
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx, wy + winW);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx + wallThickness, wy);
          ctx.lineTo(wx + wallThickness, wy + winW);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + wallThickness, wy);
          ctx.moveTo(wx, wy + winW);
          ctx.lineTo(wx + wallThickness, wy + winW);
          ctx.stroke();
        } else if (win.wall_direction === 'E') {
          wx = room.canvasX + room.canvasW - wallThickness;
          wy = room.canvasY + win.position_ratio * room.canvasH - winW / 2;
          
          ctx.fillRect(wx, wy, wallThickness, winW);
          
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.moveTo(wx + wallThickness, wy);
          ctx.lineTo(wx + wallThickness, wy + winW);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx, wy + winW);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.lineWidth = 1;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + wallThickness, wy);
          ctx.moveTo(wx, wy + winW);
          ctx.lineTo(wx + wallThickness, wy + winW);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // 3. Ajouter le label (label_fr) centré — taille de police proportionnelle à la surface
    const label = room.label_fr || room.room_type;
    const area = room.width * room.height;
    const labelFontSize = Math.max(9, Math.min(15, 9 + area * 0.25));
    
    ctx.save();
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelY = room.canvasY + room.canvasH / 2 - (room.canvasH > 35 ? 6 : 0);
    ctx.fillText(label, room.canvasX + room.canvasW / 2, labelY, room.canvasW - 8);
    
    // 4. Ajouter les dimensions (ex: "3.5m × 4.0m") en petit sous le label
    ctx.font = `${Math.max(8, labelFontSize - 2)}px monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const dimText = `${room.width.toFixed(1)}m × ${room.height.toFixed(1)}m`;
    ctx.fillText(dimText, room.canvasX + room.canvasW / 2, labelY + labelFontSize, room.canvasW - 8);
    ctx.restore();

    // 6. Si room apparaît dans floor.doors → dessiner l'ouverture de porte (arc de 90°)
    if (!isFallback && floor.doors) {
      floor.doors.forEach(door => {
        const doorKey = `${door.from_room}-${door.to_room}-${door.x}-${door.y}`;
        if ((door.from_room === room.room_type || door.to_room === room.room_type) && !drawnDoors.has(doorKey)) {
          drawDoor(ctx, door, scale, offsetX, offsetY);
          drawnDoors.add(doorKey);
        }
      });
    }
  });

  if (!isFallback) {
    drawDimensionLines(ctx, offsetX, offsetY, effectiveW, effectiveD, scale);
    renderScaleBar(ctx, scale, canvasH);
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(15, 15, 120, 24, 4);
    } else {
      ctx.rect(15, 15, 120, 24);
    }
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("Plan schématique", 75, 27);
    ctx.restore();
  }

  renderNorthArrow(ctx, canvasW, site?.solar_priority_orientation);
}

function renderNorthArrow(ctx, canvasW, orientation) {
  const cx = canvasW - 28;
  const cy = 28;
  const r  = 12;
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 4);
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - 5, cy + r / 2);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + 5, cy + r / 2);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  ctx.restore();
}

function renderScaleBar(ctx, scale, canvasH) {
  const barMeters = 5;
  const barPx = barMeters * scale;
  const x = 20;
  const y = canvasH - 18;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + barPx, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + barPx, y - 4); ctx.lineTo(x + barPx, y + 4); ctx.stroke();
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${barMeters}m`, x + barPx / 2, y + 6);
  ctx.restore();
}

/* ============================================================
   PLAN VIEWER COMPONENT
   ============================================================ */
export default function PlanViewer({ planData, onNewProject }) {
  const canvasRef = useRef(null);
  const [activeFloor, setActiveFloor] = useState(0);

  const floors = planData?.floors || [];
  const summary = planData?.summary || {};
  const warnings = planData?.warnings || [];
  const currentFloor = floors[activeFloor] || floors[0];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFloor) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    const site = planData.data ? planData.data.site_analysis : planData.site_analysis;
    const grid = planData.data ? planData.data.structural_grid : planData.structural_grid;
    const lang = document.documentElement.dir === 'rtl' ? 'ar' : 'fr';

    drawFloorPlan(ctx, currentFloor, site, grid, W, H, lang);
  }, [currentFloor, planData]);

  // ── Draw on canvas whenever floor changes ──
  useEffect(() => {
    draw();
  }, [draw]);

  // ── Redraw on resize ──
  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  if (!planData || !floors.length) return null

  return (
    <div className="space-y-6">
      {/* ── Summary Header ── */}
      <div>
        <h4 className="font-['Manrope'] font-bold text-base text-white mb-4">Plan d'implantation d'étage</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <span className="font-['IBM_Plex_Mono'] text-lg font-bold text-white block">
              {summary.effective_footprint_m2 ?? summary.buildable_footprint_m2} m²
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block mt-1">
              Emprise au sol
            </span>
          </div>
          <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <span className="font-['IBM_Plex_Mono'] text-lg font-bold text-white block">
              {summary.total_built_area_m2} m²
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block mt-1">
              Surface totale built
            </span>
          </div>
          <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <span className="font-['IBM_Plex_Mono'] text-lg font-bold text-white block">
              {summary.floor_count}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block mt-1">
              Étage(s)
            </span>
          </div>
          <div className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
            <span className="font-['IBM_Plex_Mono'] text-lg font-bold text-[var(--orange)] block">
              {summary.setback_loss_percent ?? summary.setback_deduction_percent}%
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block mt-1">
              Retrait / Haouch
            </span>
          </div>
        </div>
      </div>

      {/* ── Floor Tabs ── */}
      {floors.length > 1 && (
        <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
          {floors.map((f, i) => (
            <button
              key={f.floor_number}
              type="button"
              className={`px-4 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer ${
                i === activeFloor
                  ? 'bg-[var(--orange-dim)] border border-[var(--orange)] text-white'
                  : 'bg-transparent border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]'
              }`}
              onClick={() => setActiveFloor(i)}
            >
              {f.floor_label}
            </button>
          ))}
        </div>
      )}

      {/* ── Canvas Container ── */}
      <div className="w-full aspect-video md:aspect-[2/1] bg-[#0f1117] border border-[var(--border-subtle)] rounded-xl overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* ── Room List ── */}
      <div>
        <h5 className="font-['Manrope'] font-bold text-xs text-white mb-3">
          Détail des pièces — {currentFloor?.floor_label}
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {currentFloor?.rooms.map((room, i) => {
            const colors = ZONE_COLORS[room.zone] || ZONE_COLORS.circulation
            return (
              <div key={`${room.room_type}-${i}`} className="bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors.fill }}
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{room.label_fr}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider block mt-0.5">{colors.label}</span>
                  </div>
                </div>
                <span className="font-['IBM_Plex_Mono'] text-xs font-bold text-white shrink-0">{room.area_m2} m²</span>
              </div>
            )
          })}

          <div className="bg-[var(--bg-surface-high)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between col-span-1 md:col-span-2">
            <span className="text-xs font-bold text-white">Surface habitable d'étage</span>
            <span className="font-['IBM_Plex_Mono'] text-sm font-bold text-[var(--orange)]">{currentFloor?.total_room_area_m2} m²</span>
          </div>
        </div>
      </div>

      {/* ── Zone Legend ── */}
      <div className="flex flex-wrap gap-4 items-center justify-center pt-4 border-t border-[var(--border-subtle)]">
        {Object.entries(ZONE_COLORS).map(([zone, colors]) => (
          <div className="flex items-center gap-2" key={zone}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.fill }} />
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">{colors.label}</span>
          </div>
        ))}
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/15 rounded-lg p-3 text-xs text-[var(--text-primary)]" key={i}>
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      {/* ── Standalone Action (optional back button) ── */}
      {onNewProject && (
        <div className="flex justify-center pt-4">
          <button
            className="btn-secondary text-xs"
            onClick={onNewProject}
            type="button"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Nouveau projet
          </button>
        </div>
      )}
    </div>
  )
}
