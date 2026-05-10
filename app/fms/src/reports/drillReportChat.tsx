import { React } from 'uweb'
const { useState, useRef, useEffect, useMemo } = React

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getSessionId(patternName: string): string {
    try {
        const token = localStorage.getItem('token') ?? ''
        const payload = JSON.parse(atob(token.split('.')[1]))
        const user = payload.name ?? 'unknown'
        return `${patternName}_${user}`
    } catch {
        return `${patternName}_${Math.random().toString(36).slice(2)}`
    }
}

function loadMessages(sessionId: string): Message[] {
    try {
        const saved = localStorage.getItem(`chat_${sessionId}`)
        return saved ? JSON.parse(saved) : []
    } catch { return [] }
}

function loadRemaining(sessionId: string): number {
    try {
        const saved = localStorage.getItem(`chat_remaining_${sessionId}`)
        return saved !== null ? Number(saved) : 20
    } catch { return 20 }
}

function saveMessages(sessionId: string, messages: Message[]) {
    try {
        localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages))
    } catch { }
}

function saveRemaining(sessionId: string, remaining: number) {
    try {
        localStorage.setItem(`chat_remaining_${sessionId}`, String(remaining))
    } catch { }
}

function pruneOldChats(maxChats = 20) {
    try {
        const keys = Object.keys(localStorage)
            .filter(k => k.startsWith('chat_') && !k.startsWith('chat_remaining_'))
        if (keys.length > maxChats) {
            keys.slice(0, keys.length - maxChats).forEach(k => {
                localStorage.removeItem(k)
                localStorage.removeItem(k.replace('chat_', 'chat_remaining_'))
            })
        }
    } catch { }
}

function buildContext(data: any, shots?: any[]): string {
    if (!data) return ''

    const lines: string[] = [
        `Та өрөмдлөгийн үйл ажиллагааны шинжээч туслах юм.`,
        `Дараах тэсэлгээний загварын тайланд холбоотой асуултуудад товч бөгөөд үнэн зөвөөр хариулна уу.`,
        `Мэдээлэлд байхгүй зүйлийг хэлж өгнө үү. Утгыг зохиомоор бүү гар.`,
        `Монгол хэлээр хариулна уу.`,
        ``,
        `=== BLAST PATTERN: ${data.name} ===`,
        `Key: ${data.key}`,
        `Total holes: ${data.total} | Drilled: ${data.drilled} | Remaining: ${data.total - data.drilled}`,
        `Completion: ${((data.drilled / data.total) * 100).toFixed(1)}%`,
        ``,
    ]

    if (shots?.length) {
        lines.push(`=== SHOT PLAN (${shots.length} holes) ===`)
        shots.slice(0, 10).forEach(([id, , , elev, target]: any) =>
            lines.push(`  ${id}: elev=${elev}m target=${target}m`)
        )
        if (shots.length > 10) lines.push(`  ... and ${shots.length - 10} more holes`)
        lines.push('')
    }

    if (data.drilled_shots?.length) {
        lines.push(`=== DRILLED SHOTS ===`)
        data.drilled_shots.forEach((shot: any) => {
            const status = shot.target
                ? shot.finalDepth > shot.target ? 'OVER TARGET'
                    : shot.finalDepth < shot.target ? 'UNDER TARGET'
                        : 'ON TARGET' : ''
            lines.push(``)
            lines.push(`[${shot.holeId}] Final: ${shot.finalDepth}m | Target: ${shot.target ?? '—'}m | ${status}`)
            lines.push(`  Net drill: ${Math.floor(shot.netDrillMs / 60000)}m${Math.floor((shot.netDrillMs % 60000) / 1000)}s | Paused: ${Math.floor(shot.totalPausedMs / 60000)}m${Math.floor((shot.totalPausedMs % 60000) / 1000)}s`)
            lines.push(`  Completed: ${new Date(shot.completedAt).toLocaleString()}`)

            const entries = [...(shot.entries ?? [])].filter((e: any) => !!e.layer).sort((a: any, b: any) => a.depth - b.depth)
            const merged: { layer: string; start: number; end: number }[] = []
            let prev = 0
            entries.forEach((e: any) => {
                const last = merged[merged.length - 1]
                if (last && last.layer === e.layer) { last.end = e.depth }
                else { merged.push({ layer: e.layer, start: prev, end: e.depth }) }
                prev = e.depth
            })
            if (merged.length) {
                lines.push(`  Layers:`)
                merged.forEach(r => lines.push(`    - ${r.layer}: ${r.start}m → ${r.end}m (${+(r.end - r.start).toFixed(2)}m thick)`))
            }

            const depthEntries = [...(shot.entries ?? [])]
                .filter((e: any) => e.type === 'depth')
                .sort((a: any, b: any) => a.elapsedMs - b.elapsedMs)
            let pMs = 0, pD = 0
            const rates: string[] = []
            depthEntries.forEach((e: any) => {
                const dtMin = (e.elapsedMs - pMs) / 60000
                const dd = e.depth - pD
                if (dtMin > 0 && dd > 0) rates.push(`${pD}→${e.depth}m @ ${+(dd / dtMin).toFixed(2)}m/min`)
                pMs = e.elapsedMs; pD = e.depth
            })
            if (rates.length) lines.push(`  Drill rates: ${rates.join(' | ')}`)
        })
    }

    return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// Command helpers
// ─────────────────────────────────────────────────────────────
function commandToMessage(cmd: any): string {
    switch (cmd.action) {
        case 'generate_pdf': return cmd.holeId
            ? `📄 "${cmd.holeId}" нүхний PDF үүсгэж байна...`
            : `📄 Бүтэн тайланг PDF болгож байна...`
        case 'generate_csv': return `📊 CSV файлуудыг татаж байна...`
        default: return `✓ ${cmd.action}`
    }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Message {
    role: 'user' | 'assistant'
    content: string
    isCommand?: boolean
    remaining?: number
}

interface Props {
    cfg: any
    data: any
    shots?: any[]
    onCommand?: (action: string, params: any) => void
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function DrillReportChat({ cfg, data, shots, onCommand }: Props) {
    // Recomputes when pattern name changes — fixes same history across patterns
    const sessionId = useMemo(
        () => getSessionId(data?.name ?? 'report'),
        [data?.name]
    )

    const [messages, setMessages] = useState<Message[]>([])
    const [remaining, setRemaining] = useState<number>(20)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [limited, setLimited] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const context = useRef('')

    // Load correct history whenever pattern changes
    useEffect(() => {
        if (!data?.name) return
        context.current = buildContext(data, shots)
        pruneOldChats(20)

        const savedRemaining = loadRemaining(sessionId)
        setMessages(loadMessages(sessionId))
        setRemaining(savedRemaining)
        setLimited(savedRemaining <= 0)
    }, [data?.name])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const send = async () => {
        const msg = input.trim()
        if (!msg || loading || limited) return

        const userMsg: Message = { role: 'user', content: msg }
        const nextMessages = [...messages, userMsg]

        setInput('')
        setMessages(nextMessages)
        setLoading(true)

        try {
            const res = await cfg.core_proxy.get('get-anthropic-chat', {
                sessionId,
                message: msg,
                reportContext: context.current,
            })

            if (res.limitReached) {
                setLimited(true)
                const limitMsg: Message = {
                    role: 'assistant',
                    content: '⚠️ Энэ сессийн асуултын хязгаарт хүрлээ.',
                }
                const final = [...nextMessages, limitMsg]
                setMessages(final)
                saveMessages(sessionId, final)
                saveRemaining(sessionId, 0)
            } else if (res.error) {
                const errMsg: Message = { role: 'assistant', content: `Алдаа: ${res.error}` }
                const final = [...nextMessages, errMsg]
                setMessages(final)
                saveMessages(sessionId, final)
            } else {
                // Detect if Claude returned a file generation command (JSON)
                let displayContent = res.answer
                let isCommand = false
                try {
                    const cmd = JSON.parse(res.answer)
                    if (cmd.action) {
                        isCommand = true
                        displayContent = commandToMessage(cmd)
                        // Trigger the actual file generation
                        setTimeout(() => onCommand?.(cmd.action, cmd), 300)
                    }
                } catch { }  // not JSON — display as normal text

                const assistantMsg: Message = {
                    role: 'assistant',
                    content: displayContent,
                    isCommand,
                    remaining: res.remaining,
                }
                const final = [...nextMessages, assistantMsg]
                setMessages(final)
                setRemaining(res.remaining ?? 0)
                if ((res.remaining ?? 0) <= 0) setLimited(true)
                saveMessages(sessionId, final)
                saveRemaining(sessionId, res.remaining ?? 0)
            }
        } catch (e: any) {
            const errMsg: Message = { role: 'assistant', content: `Холболтын алдаа: ${e.message}` }
            setMessages(prev => [...prev, errMsg])
        } finally {
            setLoading(false)
        }
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    }

    const clearHistory = () => {
        localStorage.removeItem(`chat_${sessionId}`)
        localStorage.removeItem(`chat_remaining_${sessionId}`)
        setMessages([])
        setRemaining(20)
        setLimited(false)
    }

    const suggestions = [
        'Аль нүхнүүд зорилтоос доогуур байна?',
        'Дундаж өрөмдлөгийн хурд хэд вэ?',
        'Ямар давхаргууд илэрсэн бэ?',
        'Өрөмдлөг хэр удаан үргэлжилсэн бэ?',
    ]

    return (
        <div className="drill-chat" style={{
            marginTop: 16, borderTop: '1px solid #2a2d35',
            paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 0,
            fontFamily: 'monospace',
        }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: limited ? '#ff4d4f' : '#52c41a',
                        boxShadow: limited ? 'none' : '0 0 6px #52c41a',
                    }} />
                    <span style={{ fontSize: 10, color: '#666', letterSpacing: '.08em' }}>
                        ТАЙЛАНД АСУУЛТ АСУУХ
                    </span>
                    {/* Session ID indicator */}
                    <span style={{ fontSize: 9, color: '#333', letterSpacing: '.04em' }}>
                        · {sessionId}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: remaining <= 5 ? '#faad14' : '#444' }}>
                        {remaining} асуулт үлдсэн
                    </span>
                    {messages.length > 0 && (
                        <button onClick={clearHistory} style={{
                            background: 'transparent', border: 'none',
                            color: '#444', fontSize: 10, cursor: 'pointer',
                            fontFamily: 'monospace', padding: 0,
                        }}>
                            цэвэрлэх
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {messages.length > 0 && (
                <div style={{
                    maxHeight: 280, overflowY: 'auto', display: 'flex',
                    flexDirection: 'column', gap: 8, marginBottom: 10,
                    paddingRight: 4,
                }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                        }}>
                            <div style={{
                                maxWidth: '80%', padding: '8px 12px',
                                borderRadius: m.role === 'user'
                                    ? '10px 10px 2px 10px'
                                    : '10px 10px 10px 2px',
                                background: m.isCommand
                                    ? 'rgba(82,196,26,0.1)'
                                    : m.role === 'user'
                                        ? 'rgba(129,140,248,0.15)'
                                        : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${m.isCommand
                                        ? 'rgba(82,196,26,0.3)'
                                        : m.role === 'user'
                                            ? 'rgba(129,140,248,0.25)'
                                            : '#2a2d35'
                                    }`,
                                fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                color: m.isCommand ? '#52c41a' : m.role === 'user' ? '#c7d2fe' : '#d0d0d0',
                            }}>
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                                padding: '8px 14px', borderRadius: '10px 10px 10px 2px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2d35',
                            }}>
                                <span style={{ display: 'inline-flex', gap: 4 }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            width: 5, height: 5, borderRadius: '50%',
                                            background: '#555', display: 'inline-block',
                                            animation: `bounce 1s ${i * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {/* Suggestion chips */}
            {messages.length === 0 && !limited && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {suggestions.map((s, i) => (
                        <button key={i} onClick={() => setInput(s)} style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2d35',
                            borderRadius: 20, padding: '4px 10px', fontSize: 11,
                            color: '#888', cursor: 'pointer', fontFamily: 'monospace',
                        }}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Input row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={limited || loading}
                    placeholder={limited
                        ? 'Сессийн хязгаарт хүрлээ'
                        : 'Тайланд холбоотой асуулт асуугаарай… (Enter илгээх)'}
                    rows={2}
                    style={{
                        flex: 1, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid #2a2d35', borderRadius: 8,
                        padding: '8px 12px', fontSize: 12, color: '#e0e0e0',
                        fontFamily: 'monospace', resize: 'none', outline: 'none',
                        lineHeight: 1.5, opacity: limited ? 0.4 : 1,
                    }}
                />
                <button
                    onClick={send}
                    disabled={!input.trim() || loading || limited}
                    style={{
                        background: !input.trim() || loading || limited
                            ? 'rgba(129,140,248,0.1)'
                            : 'rgba(129,140,248,0.2)',
                        border: '1px solid rgba(129,140,248,0.3)',
                        borderRadius: 8, padding: '8px 16px', color: '#818cf8',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                        fontWeight: 700, whiteSpace: 'nowrap', height: 58,
                        opacity: !input.trim() || loading || limited ? 0.4 : 1,
                    }}
                >
                    ИЛГЭЭХ ↑
                </button>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: .4; }
                    40% { transform: translateY(-5px); opacity: 1; }
                }
                /* Thin dark scrollbars */
                .drill-chat *::-webkit-scrollbar { width: 3px; height: 3px; }
                .drill-chat *::-webkit-scrollbar-track { background: transparent; }
                .drill-chat *::-webkit-scrollbar-thumb { background: #2a2d35; border-radius: 2px; }
                .drill-chat *::-webkit-scrollbar-thumb:hover { background: #3a3d45; }
                .drill-chat * { scrollbar-width: thin; scrollbar-color: #2a2d35 transparent; }
            `}</style>
        </div>
    )
}