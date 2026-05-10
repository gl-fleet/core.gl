import { React, notification, message } from 'uweb'
const { useEffect, useRef } = React
import {
    Button, Card, Col, Collapse, Row,
    Space, Statistic, Table, Tag, Typography
} from 'uweb'

import {
    DownloadOutlined,
    PrinterOutlined,
    CheckCircleFilled,
    AimOutlined,
    ClockCircleOutlined,
    PieChartFilled,
} from '@ant-design/icons'

const { Title, Text } = Typography

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface ShotEntry {
    id: string; type: string; time: string
    elapsedMs: number; depth: number; layer?: string
}
interface DrilledShot {
    holeId: string; finalDepth: number
    netDrillMs: number; totalPausedMs: number
    entries: ShotEntry[]; completedAt: string; target?: number
}
interface DrillReportData {
    key: string; name: string; total: number
    drilled: number; drilled_shots: DrilledShot[]
}

// [name, easting, northing, elevation, targetDepth, null]
type ShotRow = [string, number, number, number, number, null]

// ─────────────────────────────────────────────────────────────
// 2D Shot Map
// ─────────────────────────────────────────────────────────────
function ShotMap2D({ shots, drilledIds }: {
    shots: ShotRow[]
    drilledIds: Map<string, DrilledShot>
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return
        const ctx = cv.getContext('2d')!
        const W = cv.width, H = cv.height
        const PAD = 36

        // Bounds from UTM coords
        const eastings = shots.map(s => s[1])
        const northings = shots.map(s => s[2])
        const minE = Math.min(...eastings), maxE = Math.max(...eastings)
        const minN = Math.min(...northings), maxN = Math.max(...northings)
        const rangeE = maxE - minE || 1
        const rangeN = maxN - minN || 1

        // Keep aspect ratio
        const scaleE = (W - PAD * 2) / rangeE
        const scaleN = (H - PAD * 2) / rangeN
        const scale = Math.min(scaleE, scaleN)

        const toX = (e: number) => PAD + (e - minE) * scale + ((W - PAD * 2) - rangeE * scale) / 2
        // Flip Y — northing increases upward, canvas Y increases downward
        const toY = (n: number) => H - PAD - (n - minN) * scale - ((H - PAD * 2) - rangeN * scale) / 2

        ctx.clearRect(0, 0, W, H)
        ctx.fillStyle = '#0d1017'
        ctx.fillRect(0, 0, W, H)

        const R = Math.max(3.5, Math.min(7, scale * 3.5))

        shots.forEach(([id, e, n, , target]) => {
            const x = toX(e)
            const y = toY(n)
            const d = drilledIds.get(id)
            const isDrilled = !!d

            if (isDrilled) {
                const over = d!.finalDepth > (d!.target ?? target)
                const under = d!.finalDepth < (d!.target ?? target)
                const fill = over ? '#ff4d4f' : under ? '#faad14' : '#52c41a'

                // Outer glow
                ctx.beginPath(); ctx.arc(x, y, R + 2.5, 0, Math.PI * 2)
                ctx.fillStyle = fill + '33'; ctx.fill()

                // Filled circle
                ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2)
                ctx.fillStyle = fill; ctx.fill()

                // White ring
                ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2)
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.stroke()
            } else {
                // Undrilled — hollow grey circle
                ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill()
                ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke()
            }

            // Label
            if (R >= 5) {
                ctx.font = `${Math.max(7, R * 1.1)}px monospace`
                ctx.fillStyle = isDrilled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'
                ctx.textAlign = 'center'
                ctx.fillText(id, x, y - R - 2)
            } else {
                // Too small for label above — tiny label only for drilled
                if (isDrilled) {
                    ctx.font = '7px monospace'
                    ctx.fillStyle = 'rgba(255,255,255,0.8)'
                    ctx.textAlign = 'center'
                    ctx.fillText(id, x, y - R - 1.5)
                }
            }
        })

        // Legend
        const items = [
            { color: '#52c41a', label: 'On target' },
            { color: '#faad14', label: 'Under' },
            { color: '#ff4d4f', label: 'Over' },
            { color: 'rgba(255,255,255,0.15)', label: 'Pending', stroke: 'rgba(255,255,255,0.3)' },
        ]
        let lx = PAD
        items.forEach(({ color, label, stroke }) => {
            ctx.beginPath(); ctx.arc(lx + 5, H - 12, 4, 0, Math.PI * 2)
            ctx.fillStyle = color; ctx.fill()
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
            ctx.font = '9px monospace'; ctx.fillStyle = '#666'; ctx.textAlign = 'left'
            ctx.fillText(label, lx + 13, H - 8)
            lx += ctx.measureText(label).width + 28
        })

    }, [shots, drilledIds])

    // Hover tooltip
    const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const cv = canvasRef.current; if (!cv) return
        const tip = tooltipRef.current; if (!tip) return
        const rect = cv.getBoundingClientRect()
        const mx = (e.clientX - rect.left) * (cv.width / rect.width)
        const my = (e.clientY - rect.top) * (cv.height / rect.height)

        const PAD = 36
        const eastings = shots.map(s => s[1])
        const northings = shots.map(s => s[2])
        const minE = Math.min(...eastings), maxE = Math.max(...eastings)
        const minN = Math.min(...northings), maxN = Math.max(...northings)
        const rangeE = maxE - minE || 1, rangeN = maxN - minN || 1
        const scale = Math.min((cv.width - PAD * 2) / rangeE, (cv.height - PAD * 2) / rangeN)
        const toX = (en: number) => PAD + (en - minE) * scale + ((cv.width - PAD * 2) - rangeE * scale) / 2
        const toY = (n: number) => cv.height - PAD - (n - minN) * scale - ((cv.height - PAD * 2) - rangeN * scale) / 2
        const R = Math.max(3.5, Math.min(7, scale * 3.5))

        let found: ShotRow | null = null
        for (const s of shots) {
            const dx = toX(s[1]) - mx, dy = toY(s[2]) - my
            if (Math.sqrt(dx * dx + dy * dy) <= R + 4) { found = s; break }
        }

        if (found) {
            const [id, , , elev, target] = found
            const d = drilledIds.get(id)
            tip.style.display = 'block'
            tip.style.left = (e.clientX - rect.left + 12) + 'px'
            tip.style.top = (e.clientY - rect.top - 10) + 'px'
            tip.innerHTML = `
                <div style="font-weight:700;color:#fff;margin-bottom:4px">${id}</div>
                <div style="color:#888">Elev: ${elev}m</div>
                <div style="color:#888">Target: ${target}m</div>
                ${d ? `
                    <div style="color:${d.finalDepth >= target ? '#52c41a' : '#faad14'};margin-top:2px">
                        Final: ${d.finalDepth}m
                    </div>
                    <div style="color:#666">${fmtMs(d.netDrillMs)}</div>
                ` : '<div style="color:#555;margin-top:2px">PENDING</div>'}
            `
        } else {
            tip.style.display = 'none'
        }
    }

    // Dynamic canvas size based on shot spread
    const eastings = shots.map(s => s[1])
    const northings = shots.map(s => s[2])
    const rangeE = Math.max(...eastings) - Math.min(...eastings)
    const rangeN = Math.max(...northings) - Math.min(...northings)
    const aspect = rangeE / rangeN
    const CH = Math.min(420, Math.max(260, 320))
    const CW = Math.round(CH * Math.max(0.8, Math.min(3, aspect * 1.1)))

    return (
        <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: '.08em', marginBottom: 6 }}>
                BLAST PATTERN — {shots.length} HOLES · {drilledIds.size} DRILLED
            </div>
            <div style={{ background: '#0d1017', borderRadius: 8, border: '1px solid #2a2d35', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                <canvas
                    ref={canvasRef}
                    width={860}
                    height={CH}
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                    onMouseMove={onMouseMove}
                    onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = 'none' }}
                />
            </div>
            <div
                ref={tooltipRef}
                style={{
                    display: 'none', position: 'absolute', pointerEvents: 'none',
                    background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 6,
                    padding: '8px 10px', fontSize: 11, fontFamily: 'monospace',
                    zIndex: 10, minWidth: 110, lineHeight: 1.6,
                }}
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LC: Record<string, string> = {
    'Хоосон чулуулаг': '#FAC775', 'Элсэн чулуу': '#c4a832',
    'Шавар': '#a07848', 'Нүүрс': '#888',
    'Завсар үе': '#52c41a', 'Шавран чулуу': '#ff4d4f',
    'Хатуу чулуулаг': '#aaa', 'Ус': '#0284c7',
}
const LBG: Record<string, string> = {
    'Хоосон чулуулаг': 'rgba(250,199,117,0.12)', 'Элсэн чулуу': 'rgba(196,168,50,0.12)',
    'Шавар': 'rgba(140,106,63,0.12)', 'Нүүрс': 'rgba(80,80,80,0.4)',
    'Завсар үе': 'rgba(56,158,13,0.12)', 'Шавран чулуу': 'rgba(207,19,34,0.1)',
    'Хатуу чулуулаг': 'rgba(100,100,100,0.3)', 'Ус': 'rgba(2,132,199,0.12)',
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtMs = (ms: number) =>
    `${Math.floor(ms / 60000)}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s`

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function getLayerRows(shot: DrilledShot) {
    const entries = [...shot.entries].filter(e => !!e.layer).sort((a, b) => a.depth - b.depth)
    const merged: { layer: string; start: number; end: number }[] = []
    let prev = 0
    entries.forEach(e => {
        const last = merged[merged.length - 1]
        if (last && last.layer === e.layer) { last.end = e.depth }
        else { merged.push({ layer: e.layer!, start: prev, end: e.depth }) }
        prev = e.depth
    })
    return merged.map(r => ({ ...r, thickness: +(r.end - r.start).toFixed(2) }))
}

// Compute m/min rate — only 'depth' entries have real timestamps; 'layer' entries are manually logged
function getEntryRows(shot: DrilledShot) {
    const sorted = [...shot.entries].sort((a, b) => a.elapsedMs - b.elapsedMs)

    // Build rate lookup using only 'depth' entries
    const depthOnly = sorted.filter(e => e.type === 'depth')
    let pMs = 0, pD = 0
    const rateMap = new Map<string, number | null>()
    depthOnly.forEach(e => {
        const dtMin = (e.elapsedMs - pMs) / 60000
        const dd = e.depth - pD
        rateMap.set(e.id, dtMin > 0 && dd > 0 ? +(dd / dtMin).toFixed(2) : null)
        pMs = e.elapsedMs; pD = e.depth
    })

    return sorted.map(e => ({
        ...e,
        rateMpm: e.type === 'depth' ? (rateMap.get(e.id) ?? null) : null,
    }))
}

// ─────────────────────────────────────────────────────────────
// ZIP CSV — three clean files, program-friendly
// ─────────────────────────────────────────────────────────────
function csvRow(cells: (string | number)[]) {
    return cells.map(c => {
        const s = String(c)
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
}

const BOM = '\uFEFF'

function buildSummaryCSV(data: DrillReportData, shots?: ShotRow[]): string {
    const drilledMap = new Map(data.drilled_shots.map(s => [s.holeId, s]))
    const lines = [
        csvRow(['holeId', 'easting', 'northing', 'elevation_m', 'target_m',
            'final_depth_m', 'status', 'net_drill_ms', 'paused_ms',
            'total_ms', 'completed_at']),
    ]

    // If shots[] provided, include all holes (drilled + pending)
    const allIds: string[] = shots
        ? shots.map(s => s[0])
        : data.drilled_shots.map(s => s.holeId)

    const shotMeta = new Map<string, ShotRow>(shots?.map(s => [s[0], s]) ?? [])

    allIds.forEach(id => {
        const d = drilledMap.get(id)
        const meta = shotMeta.get(id)
        const over = d && d.target ? d.finalDepth > d.target : false
        const under = d && d.target ? d.finalDepth < d.target : false
        const status = !d ? 'pending' : over ? 'over' : under ? 'under' : 'on_target'

        lines.push(csvRow([
            id,
            meta ? meta[1] : '',
            meta ? meta[2] : '',
            meta ? meta[3] : '',
            meta ? meta[4] : (d?.target ?? ''),
            d ? d.finalDepth : '',
            status,
            d ? d.netDrillMs : '',
            d ? d.totalPausedMs : '',
            d ? d.netDrillMs + d.totalPausedMs : '',
            d ? d.completedAt : '',
        ]))
    })

    return BOM + lines.join('\r\n')
}

function buildLayersCSV(data: DrillReportData): string {
    const lines = [
        csvRow(['holeId', 'layer', 'start_m', 'end_m', 'thickness_m']),
    ]
    data.drilled_shots.forEach(shot => {
        getLayerRows(shot).forEach(r =>
            lines.push(csvRow([shot.holeId, r.layer, r.start, r.end, r.thickness]))
        )
    })
    return BOM + lines.join('\r\n')
}

function buildEntriesCSV(data: DrillReportData): string {
    const lines = [
        csvRow(['holeId', 'time', 'elapsed_ms', 'depth_m', 'rate_mpm']),
    ]
    data.drilled_shots.forEach(shot => {
        getEntryRows(shot)
            .filter(e => e.type === 'depth')
            .forEach(e =>
                lines.push(csvRow([shot.holeId, e.time, e.elapsedMs, e.depth, e.rateMpm ?? '']))
            )
    })
    return BOM + lines.join('\r\n')
}

// ─────────────────────────────────────────────────────────────
// Print HTML
// ─────────────────────────────────────────────────────────────
function buildPrintHTML(data: DrillReportData): string {
    return `<!DOCTYPE html><html><head>
<title>${data.name}</title>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;padding:28px;color:#111;font-size:11px}
  h1{font-size:18px;margin-bottom:2px}
  .sub{font-size:10px;color:#999;margin-bottom:20px}
  .sum{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .sm{border:1px solid #ddd;border-radius:4px;padding:10px 12px}
  .sm-l{font-size:8px;color:#aaa;letter-spacing:.07em;margin-bottom:3px}
  .sm-v{font-size:16px;font-weight:700}
  .shot{margin-bottom:28px;page-break-inside:avoid}
  .sh{display:flex;justify-content:space-between;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:12px}
  .si{font-size:14px;font-weight:700} .sd{font-size:9px;color:#999}
  .mets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
  .mc{border:1px solid #eee;border-radius:3px;padding:6px 8px}
  .ml{font-size:8px;color:#bbb;letter-spacing:.06em;margin-bottom:2px}
  .mv{font-size:12px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px}
  th{text-align:left;padding:5px 7px;background:#f5f5f5;border:1px solid #ddd;font-size:8px;letter-spacing:.06em;white-space:nowrap}
  td{padding:5px 7px;border:1px solid #eee;white-space:nowrap}
  tr:nth-child(even) td{background:#fafafa}
  .dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:middle}
  hr{border:none;border-top:1px solid #eee;margin:20px 0}
  @media print{.shot{page-break-inside:avoid}}
</style></head><body>
<h1>${data.name}</h1>
<div class="sub">${data.key} · ${new Date().toLocaleString()}</div>
<div class="sum">
  <div class="sm"><div class="sm-l">TOTAL</div><div class="sm-v">${data.total}</div></div>
  <div class="sm"><div class="sm-l">DRILLED</div><div class="sm-v">${data.drilled}</div></div>
  <div class="sm"><div class="sm-l">REMAINING</div><div class="sm-v">${data.total - data.drilled}</div></div>
  <div class="sm"><div class="sm-l">COMPLETION</div><div class="sm-v">${((data.drilled / data.total) * 100).toFixed(1)}%</div></div>
</div>
${data.drilled_shots.map(shot => {
        const layers = getLayerRows(shot)
        const entries = getEntryRows(shot)
        return `<div class="shot">
  <div class="sh">
    <span class="si">${shot.holeId}</span>
    <span class="sd">${fmtDate(shot.completedAt)}</span>
  </div>
  <div class="mets">
    <div class="mc"><div class="ml">FINAL DEPTH</div><div class="mv">${shot.finalDepth}m</div></div>
    <div class="mc"><div class="ml">TARGET</div><div class="mv">${shot.target ?? '—'}m</div></div>
    <div class="mc"><div class="ml">NET DRILL</div><div class="mv">${fmtMs(shot.netDrillMs)}</div></div>
    <div class="mc"><div class="ml">PAUSED</div><div class="mv">${fmtMs(shot.totalPausedMs)}</div></div>
  </div>
  <table>
    <tr><th>LAYER</th><th>START (m)</th><th>END (m)</th><th>THICKNESS (m)</th></tr>
    ${layers.map(r => `<tr>
      <td><span class="dot" style="background:${LC[r.layer] ?? '#888'}"></span>${r.layer}</td>
      <td>${r.start}</td><td>${r.end}</td><td>${r.thickness}</td>
    </tr>`).join('')}
  </table>
  <table>
    <tr><th>TIME</th><th>DEPTH (m)</th><th>LAYER</th><th>RATE (m/min)</th></tr>
    ${entries.filter((e: any) => e.type === 'depth').map((e: any) => `<tr>
      <td>${e.time}</td><td>${e.depth}</td>
      <td>${e.layer ?? '—'}</td><td>${e.rateMpm ?? '—'}</td>
    </tr>`).join('')}
  </table>
</div>`
    }).join('<hr/>')}
</body></html>`
}

// ─────────────────────────────────────────────────────────────
// Well Log Canvas — compact
// ─────────────────────────────────────────────────────────────
function WellLog({ shot }: { shot: DrilledShot }) {
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const cv = ref.current; if (!cv) return
        const ctx = cv.getContext('2d')!
        const W = cv.width, H = cv.height
        const maxD = Math.max(shot.finalDepth, shot.target ?? 0) * 1.06
        const TW = 44, CX = TW + 12, CW = W - CX - 6

        ctx.clearRect(0, 0, W, H)
        ctx.fillStyle = '#0f1218'; ctx.fillRect(0, 0, W, H)

        const step = maxD <= 15 ? 2 : maxD <= 30 ? 5 : 10
        for (let d = 0; d <= maxD; d += step) {
            const y = (d / maxD) * H
            ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(TW, y); ctx.lineTo(W, y); ctx.stroke()
            ctx.strokeStyle = 'rgba(255,255,255,0.12)'
            ctx.beginPath(); ctx.moveTo(TW - 4, y); ctx.lineTo(TW, y); ctx.stroke()
            ctx.fillStyle = '#555'; ctx.font = '9px monospace'; ctx.textAlign = 'right'
            ctx.fillText(String(d), TW - 6, y + 3)
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
        ctx.strokeRect(0, 0, TW, H)

        getLayerRows(shot).forEach(r => {
            const y1 = (r.start / maxD) * H, y2 = (r.end / maxD) * H
            ctx.fillStyle = LBG[r.layer] ?? 'rgba(99,153,34,0.15)'; ctx.fillRect(0, y1, TW, y2 - y1)
            ctx.strokeStyle = LC[r.layer] ?? '#4a9e20'; ctx.lineWidth = 0.5; ctx.strokeRect(0, y1, TW, y2 - y1)
            const segH = y2 - y1
            if (segH > 12) {
                ctx.save(); ctx.fillStyle = '#ccc'
                ctx.font = `${Math.min(8, segH * 0.28)}px monospace`
                ctx.textAlign = 'center'
                ctx.translate(TW / 2, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2)
                ctx.fillText(r.layer.slice(0, 10), 0, 3); ctx.restore()
            }
        })

        if (shot.target) {
            const tY = (shot.target / maxD) * H
            ctx.strokeStyle = 'rgba(160,160,160,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
            ctx.beginPath(); ctx.moveTo(0, tY); ctx.lineTo(W, tY); ctx.stroke(); ctx.setLineDash([])
            ctx.fillStyle = '#888'; ctx.font = '8px monospace'; ctx.textAlign = 'left'
            ctx.fillText(`TGT ${shot.target}m`, CX + 2, tY - 2)
        }

        const fdY = (shot.finalDepth / maxD) * H
        ctx.strokeStyle = 'rgba(255,210,40,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(0, fdY); ctx.lineTo(W, fdY); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = '#FFD228'; ctx.font = '8px monospace'; ctx.textAlign = 'left'
        ctx.fillText(`TD ${shot.finalDepth}m`, CX + 2, fdY + 9)

        // Rate curve — only 'depth' entries have real timestamps
        const depthEntries = [...shot.entries]
            .filter(e => e.type === 'depth')
            .sort((a, b) => a.elapsedMs - b.elapsedMs)

        const pts: { d: number; r: number }[] = [{ d: 0, r: 0 }]
        let pMs = 0, pD = 0
        depthEntries.forEach(e => {
            const dt = (e.elapsedMs - pMs) / 1000, dd = e.depth - pD
            if (dt > 0 && dd > 0) {
                pts.push({ d: pD, r: dd / dt }); pts.push({ d: e.depth, r: dd / dt })
            }
            pMs = e.elapsedMs; pD = e.depth
        })
        const maxR = Math.max(...pts.map(p => p.r)) * 1.3 || 0.1

        ctx.beginPath(); ctx.moveTo(CX, 0)
        pts.forEach(p => ctx.lineTo(CX + (p.r / maxR) * CW, (p.d / maxD) * H))
        ctx.lineTo(CX, (pts[pts.length - 1].d / maxD) * H)
        ctx.closePath(); ctx.fillStyle = 'rgba(226,75,74,0.08)'; ctx.fill()

        ctx.beginPath()
        pts.forEach((p, i) => {
            const x = CX + (p.r / maxR) * CW, y = (p.d / maxD) * H
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.strokeStyle = '#E24B4A'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke()

        ctx.fillStyle = '#444'; ctx.font = '8px monospace'
        ctx.textAlign = 'left'; ctx.fillText('0', CX + 2, H - 3)
        ctx.textAlign = 'right'; ctx.fillText(maxR.toFixed(2) + 'm/s', W - 2, H - 3)
    }, [shot])

    return (
        <canvas
            ref={ref} width={480} height={220}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 3 }}
        />
    )
}

// ─────────────────────────────────────────────────────────────
// Shot Panel
// ─────────────────────────────────────────────────────────────
function ShotPanel({ shot }: { shot: DrilledShot }) {
    const layerRows = getLayerRows(shot)
    const entryRows = getEntryRows(shot)

    // FIX 1: whiteSpace nowrap on every layer cell prevents vertical text
    const layerCols = [
        {
            title: 'Layer', dataIndex: 'layer', key: 'layer',
            render: (v: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: LC[v] ?? '#888', flexShrink: 0 }} />
                    <span style={{ color: '#d0d0d0', fontSize: 11 }}>{v}</span>
                </div>
            ),
        },
        {
            title: 'Start', dataIndex: 'start', key: 'start', width: 58,
            render: (v: number) => <span style={{ color: '#aaa', fontSize: 11 }}>{v}m</span>,
        },
        {
            title: 'End', dataIndex: 'end', key: 'end', width: 58,
            render: (v: number) => <span style={{ color: '#aaa', fontSize: 11 }}>{v}m</span>,
        },
        {
            title: 'Thick', dataIndex: 'thickness', key: 'thickness', width: 60,
            render: (v: number) => <span style={{ color: '#fff', fontWeight: 600, fontSize: 11 }}>{v}m</span>,
        },
    ]

    // Only depth entries in the table — layer entries are shown in the layer log above
    const entryCols = [
        {
            title: 'Time', dataIndex: 'time', key: 'time', width: 80,
            render: (v: string) => <span style={{ color: '#888', fontSize: 11 }}>{v}</span>,
        },
        {
            title: 'Depth', dataIndex: 'depth', key: 'depth', width: 70,
            render: (v: number) => <span style={{ color: '#e0e0e0', fontSize: 11, fontWeight: 600 }}>{v}m</span>,
        },
        {
            title: 'Layer', dataIndex: 'layer', key: 'layer',
            render: (v?: string) => v
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: LC[v] ?? '#888', flexShrink: 0 }} />
                    <span style={{ color: '#c8c8c8', fontSize: 11 }}>{v}</span>
                </div>
                : <span style={{ color: '#444' }}>—</span>,
        },
        {
            title: 'm/min', dataIndex: 'rateMpm', key: 'rateMpm', width: 80,
            render: (v: number | null) => v != null
                ? <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 11 }}>{v}</span>
                : <span style={{ color: '#555', fontSize: 11 }}>—</span>,
        },
    ]

    const over = shot.target ? shot.finalDepth > shot.target : false
    const under = shot.target ? shot.finalDepth < shot.target : false

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Compact metrics */}
            <Row gutter={8}>
                {[
                    { label: 'FINAL DEPTH', val: `${shot.finalDepth}m`, color: over ? '#ff4d4f' : under ? '#faad14' : '#52c41a' },
                    { label: 'TARGET', val: `${shot.target ?? '—'}m`, color: '#ccc' },
                    { label: 'DRILL TIME', val: fmtMs(shot.netDrillMs), color: '#ccc' },
                    { label: 'PAUSED', val: fmtMs(shot.totalPausedMs), color: '#faad14' },
                ].map((m, i) => (
                    <Col span={6} key={i}>
                        <div style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 6, padding: '7px 10px' }}>
                            <div style={{ fontSize: 8, color: '#666', letterSpacing: '.07em', marginBottom: 2 }}>{m.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.val}</div>
                        </div>
                    </Col>
                ))}
            </Row>

            {/* Well log + layer table side by side */}
            <Row gutter={10} align="top">
                <Col span={13}>
                    <WellLog shot={shot} />
                </Col>
                <Col span={11}>
                    <Table
                        dataSource={layerRows}
                        columns={layerCols}
                        pagination={false}
                        size="small"
                        rowKey={(_, i) => String(i)}
                    />
                </Col>
            </Row>

            {/* Entry log — depth entries only */}
            <Table
                dataSource={entryRows.filter(e => e.type === 'depth')}
                columns={entryCols}
                pagination={false}
                size="small"
                rowKey="id"
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function DrillReport({ data, shots, onReady }: {
    data: DrillReportData
    shots?: ShotRow[]
    onReady?: (actions: { printPDF: () => void; downloadCSV: () => void }) => void
}) {
    const pct = ((data.drilled / data.total) * 100).toFixed(1)

    // Build a Set of drilled hole IDs for O(1) lookup
    const drilledIds = new Map(data.drilled_shots.map(s => [s.holeId, s]))

    const downloadCSV = () => {
        const prefix = data.name.replace(/[^a-z0-9_\-]/gi, '_')

        const trigger = (content: string, filename: string, delay: number) => {
            setTimeout(() => {
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = filename; a.click()
                URL.revokeObjectURL(url)
            }, delay)
        }

        trigger(buildSummaryCSV(data, shots), `${prefix}_summary.csv`, 0)
        trigger(buildLayersCSV(data), `${prefix}_layers.csv`, 300)
        trigger(buildEntriesCSV(data), `${prefix}_entries.csv`, 600)
    }

    const printPDF = () => {
        const w = window.open('', '_blank', 'width=960,height=800')
        if (!w) return
        w.document.write(buildPrintHTML(data))
        w.document.close(); w.focus()
        setTimeout(() => { w.print(); w.close() }, 600)
    }

    // Expose actions to parent (used by chat command handler)
    useEffect(() => {
        onReady?.({ printPDF, downloadCSV })
    }, [data])

    // FIX 3: defaultActiveKey=[] — all collapsed for performance with hundreds of shots
    const collapseItems = data.drilled_shots.map(shot => ({
        key: shot.holeId,
        label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontFamily: 'monospace', fontSize: 13, color: '#e8e8e8', minWidth: 36 }}>
                    {shot.holeId}
                </Text>
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>TD {shot.finalDepth}m</Tag>
                {shot.target && (
                    <Tag
                        color={shot.finalDepth >= shot.target ? 'green' : 'orange'}
                        style={{ fontSize: 10, margin: 0 }}
                    >
                        TGT {shot.target}m
                    </Tag>
                )}
                <span style={{ fontSize: 10, color: '#555' }}>{fmtDate(shot.completedAt)}</span>
            </div>
        ),
        children: <ShotPanel shot={shot} />,
    }))

    return (
        <div className="drill-report" style={{ fontFamily: 'monospace' }}>

            <style>{`
                .drill-report .ant-table { background: transparent !important; }
                .drill-report .ant-table-thead > tr > th {
                    background: rgba(255,255,255,0.03) !important;
                    color: #777 !important; font-size: 10px !important;
                    letter-spacing: .06em !important; padding: 5px 8px !important;
                    border-bottom: 1px solid #252830 !important;
                    white-space: nowrap !important;
                }
                .drill-report .ant-table-tbody > tr > td {
                    background: transparent !important; padding: 5px 8px !important;
                    border-bottom: 1px solid rgba(255,255,255,0.03) !important;
                    color: #bbb !important;
                }
                .drill-report .ant-table-tbody > tr:hover > td {
                    background: rgba(255,255,255,0.02) !important;
                }
                .drill-report .ant-collapse > .ant-collapse-item > .ant-collapse-header {
                    background: #161920 !important; padding: 8px 14px !important;
                }
                .drill-report .ant-collapse-content { background: #111418 !important; }
                .drill-report .ant-collapse-content > .ant-collapse-content-box { padding: 12px !important; }
                .drill-report .ant-collapse > .ant-collapse-item {
                    border-bottom: 1px solid #2a2d35 !important;
                }
            `}</style>

            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e8e8' }}>{data.name}</div>
                    <div style={{ fontSize: 10, color: '#555' }}>{data.key}</div>
                </div>
                <Space size={6}>
                    <Button size="small" icon={<DownloadOutlined />} onClick={downloadCSV}
                        style={{ background: '#1a2e1a', borderColor: '#2a4a2a', color: '#4ade80', fontSize: 11 }}>
                        CSV
                    </Button>
                    <Button size="small" icon={<PrinterOutlined />} onClick={printPDF}
                        style={{ background: '#1a1a2e', borderColor: '#2a2a4a', color: '#818cf8', fontSize: 11 }}>
                        PDF
                    </Button>
                </Space>
            </div>

            {/* Summary */}
            <Row gutter={8} style={{ marginBottom: 12 }}>
                {[
                    { label: 'TOTAL', value: data.total, icon: <AimOutlined />, color: '#e8e8e8' },
                    { label: 'DRILLED', value: data.drilled, icon: <CheckCircleFilled />, color: '#52c41a' },
                    { label: 'REMAINING', value: data.total - data.drilled, icon: <ClockCircleOutlined />, color: '#faad14' },
                    { label: 'COMPLETION', value: `${pct}%`, icon: <PieChartFilled />, color: '#818cf8' },
                ].map((s, i) => (
                    <Col span={6} key={i}>
                        <Card size="small" styles={{ body: { padding: '8px 12px' } }}
                            style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 6 }}>
                            <Space size={8}>
                                <span style={{ color: s.color, fontSize: 14 }}>{s.icon}</span>
                                <div>
                                    <div style={{ fontSize: 8, color: '#666', letterSpacing: '.08em' }}>{s.label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* 2D Shot Map */}
            {shots && shots.length > 0 && (
                <ShotMap2D shots={shots} drilledIds={drilledIds} />
            )}

            {/* Drilled shots detail — collapsed by default */}
            <Collapse
                items={collapseItems}
                defaultActiveKey={[]}
                style={{ background: '#111418', border: '1px solid #2a2d35', borderRadius: 8 }}
            />
        </div>
    )
}