import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, formatPKR } from '../lib/api'
import ProductModal from '../components/ProductModal'

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
    pieceType: 'ring',
    size: '7',
    metal: 'yellow-gold',
    karat: 22,
    stone: { type: 'diamond', carat: 0.5 },
    engraving: '',
}

const EMPTY_FORM = { name: '', phone: '', email: '', note: '' }

const PALETTE = {
    'yellow-gold': { m1: '#F6E3A6', m2: '#D4AF37', m3: '#8A6A17' },
    'rose-gold': { m1: '#F8D5C7', m2: '#E3AE9A', m3: '#A8705E' },
    'white-gold': { m1: '#FFFFFF', m2: '#E5E4E2', m3: '#9A9A9A' },
    silver: { m1: '#F4F4F4', m2: '#C0C0C0', m3: '#7D7D7D' },
}

const SPARK_DOTS = [
    { x: -60, y: -50 },
    { x: 62, y: -44 },
    { x: -72, y: 20 },
    { x: 70, y: 28 },
    { x: -20, y: -76 },
    { x: 24, y: 70 },
]

function countdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
}

/* Numbers glide from the old price to the new one */
function useCountUp(target, duration = 700) {
    const [shown, setShown] = useState(target)
    const shownRef = useRef(target)

    useEffect(() => {
        if (!Number.isFinite(target)) return undefined
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            shownRef.current = target
            setShown(target)
            return undefined
        }
        const from = shownRef.current
        const start = performance.now()
        let raf = 0
        const tick = (now) => {
            const p = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - p, 4)
            const value = from + (target - from) * eased
            shownRef.current = value
            setShown(value)
            if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [target, duration])

    return shown
}

function GemIcon({ color }) {
    return (
        <svg className="gemicon" viewBox="-30 -28 60 64" aria-hidden="true">
            <polygon
                points="-26,-8 -14,-24 14,-24 26,-8 0,32"
                fill={color}
                stroke="rgba(255,255,255,0.65)"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <polygon points="-14,-24 14,-24 7,-8 -7,-8" fill="rgba(255,255,255,0.35)" />
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/*  Live preview (SVG)                                                 */
/* ------------------------------------------------------------------ */

function Gem({ x, y, scale }) {
    return (
        <g className="pv-gem" style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
            <polygon
                points="-26,-8 -14,-24 14,-24 26,-8 0,32"
                fill="var(--stone)"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
            <polygon points="-14,-24 14,-24 7,-8 -7,-8" fill="rgba(255,255,255,0.28)" />
            <polyline points="-26,-8 26,-8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <polyline
                points="-14,-24 -7,-8 0,32 7,-8 14,-24"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeLinejoin="round"
            />
        </g>
    )
}

function Preview({ config, stoneDef, summary, burst }) {
    const palette = PALETTE[config.metal] || PALETTE['yellow-gold']
    const hasStone = config.stone.type !== 'none' && stoneDef
    const ratio = hasStone && stoneDef.max > 0 ? Math.min(1, config.stone.carat / stoneDef.max) : 0
    const s = 0.7 + ratio * 0.6
    const stoneColor = hasStone ? stoneDef.swatch || '#ffffff' : '#ffffff'

    const metal = 'url(#pv-metal)'
    let art = null

    if (config.pieceType === 'ring') {
        art = (
            <>
                <circle cx="200" cy="262" r="92" fill="none" stroke={metal} strokeWidth="24" />
                <circle
                    cx="200"
                    cy="262"
                    r="92"
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="2"
                    strokeDasharray="110 470"
                    strokeDashoffset="-40"
                />
                {hasStone ? (
                    <>
                        <path d="M166 166 Q200 216 234 166" fill="none" stroke={metal} strokeWidth="8" strokeLinecap="round" />
                        <Gem x={200} y={150} scale={s} />
                    </>
                ) : (
                    <ellipse cx="200" cy="166" rx="22" ry="8" fill={metal} />
                )}
            </>
        )
    } else if (config.pieceType === 'earrings') {
        const drop = (x) => (
            <g key={x}>
                <circle cx={x} cy="86" r="10" fill={metal} />
                <line x1={x} y1="96" x2={x} y2="150" stroke={metal} strokeWidth="4" strokeLinecap="round" />
                {hasStone ? (
                    <>
                        <ellipse cx={x} cy="158" rx="18" ry="7" fill={metal} />
                        <Gem x={x} y={200} scale={s * 0.85} />
                    </>
                ) : (
                    <path
                        d={`M${x} 140 C${x + 34} 175 ${x + 30} 235 ${x} 262 C${x - 30} 235 ${x - 34} 175 ${x} 140Z`}
                        fill={metal}
                    />
                )}
            </g>
        )
        art = (
            <>
                {drop(135)}
                {drop(265)}
            </>
        )
    } else if (config.pieceType === 'bracelet') {
        const gems = []
        if (hasStone) {
            for (let i = 0; i < 7; i += 1) {
                const a = ((25 + i * 21.67) * Math.PI) / 180
                gems.push(<Gem key={i} x={200 + 140 * Math.cos(a)} y={200 + 62 * Math.sin(a)} scale={0.3 + ratio * 0.12} />)
            }
        }
        art = (
            <>
                <ellipse cx="200" cy="200" rx="140" ry="62" fill="none" stroke={metal} strokeWidth="20" />
                <ellipse
                    cx="200"
                    cy="200"
                    rx="140"
                    ry="62"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    strokeDasharray="160 700"
                />
                {gems}
            </>
        )
    } else {
        art = (
            <>
                <path
                    d="M62 70 Q200 340 338 70"
                    fill="none"
                    stroke={metal}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="9 3"
                />
                <circle cx="200" cy="212" r="7" fill="none" stroke={metal} strokeWidth="3" />
                {hasStone ? <Gem x={200} y={248} scale={s} /> : <circle cx="200" cy="238" r="20" fill={metal} />}
            </>
        )
    }

    return (
        <div className="preview-frame">
            <div
                className="preview"
                style={{
                    '--m1': palette.m1,
                    '--m2': palette.m2,
                    '--m3': palette.m3,
                    '--stone': stoneColor,
                }}
            >
                <span className="preview__live">
                    <i /> Live gold rate
                </span>
                <div className={`preview__glow${hasStone ? ' is-on' : ''}`} />

                <div className="preview__stage">
                    <svg className="preview__svg" viewBox="0 0 400 400" role="img" aria-label={summary}>
                        <defs>
                            <linearGradient id="pv-metal" gradientUnits="userSpaceOnUse" x1="60" y1="60" x2="340" y2="340">
                                <stop offset="0" style={{ stopColor: 'var(--m1)' }} />
                                <stop offset="0.5" style={{ stopColor: 'var(--m2)' }} />
                                <stop offset="1" style={{ stopColor: 'var(--m3)' }} />
                            </linearGradient>
                        </defs>
                        {art}
                    </svg>

                    {burst > 0 && (
                        <span className="burst" key={burst} aria-hidden="true">
                            <i className="burst__ring" />
                            {SPARK_DOTS.map((d, i) => (
                                <i key={i} className="burst__dot" style={{ '--x': `${d.x}px`, '--y': `${d.y}px` }} />
                            ))}
                        </span>
                    )}
                </div>

                <p className="preview__summary">{summary}</p>
                {config.engraving && <p className="preview__engraving">Engraved: &ldquo;{config.engraving}&rdquo;</p>}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Design Studio                                                      */
/* ------------------------------------------------------------------ */

function DesignStudio({ initialDesignId }) {
    const [status, setStatus] = useState('loading')
    const [attempt, setAttempt] = useState(0)
    const [options, setOptions] = useState(null)
    const [config, setConfig] = useState(DEFAULT_CONFIG)
    const [notice, setNotice] = useState('')
    const [burst, setBurst] = useState(0)

    const [price, setPrice] = useState(null)
    const [priceBusy, setPriceBusy] = useState(false)
    const [priceError, setPriceError] = useState('')

    const [designName, setDesignName] = useState('')
    const [saved, setSaved] = useState(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [copied, setCopied] = useState(false)
    const shareRef = useRef(null)

    const [lock, setLock] = useState(null)
    const [lockBusy, setLockBusy] = useState(false)
    const [lockError, setLockError] = useState('')
    const [now, setNow] = useState(Date.now())

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [sending, setSending] = useState(false)
    const [formError, setFormError] = useState('')
    const [reference, setReference] = useState('')
    const reserveRef = useRef(null)

    /* ---- load options (and a shared design if the link has one) ---- */
    useEffect(() => {
        let alive = true
        setStatus('loading')
        const designId = initialDesignId
        Promise.all([
            api('/pricing/options'),
            designId ? api(`/designs/${encodeURIComponent(designId)}`).catch(() => null) : Promise.resolve(null),
        ])
            .then(([opts, shared]) => {
                if (!alive) return
                setOptions(opts)
                if (shared) {
                    setConfig(shared.design.config)
                    setSaved(shared.design)
                    setDesignName(shared.design.name)
                    setNotice('You opened a shared design. Change anything you like, the original stays as it is.')
                } else if (designId) {
                    setNotice('That shared link could not be found, so here is a fresh design to start with.')
                }
                setStatus('ready')
            })
            .catch(() => alive && setStatus('error'))
        return () => {
            alive = false
        }
    }, [attempt, initialDesignId])

    /* ---- live price (debounced) ---- */
    useEffect(() => {
        if (!options) return undefined
        let alive = true
        setPriceBusy(true)
        const timer = setTimeout(() => {
            api('/pricing/calculate', { method: 'POST', body: { config } })
                .then((res) => {
                    if (!alive) return
                    setPrice(res.price)
                    setPriceError('')
                    setPriceBusy(false)
                })
                .catch((err) => {
                    if (!alive) return
                    setPriceError(err.message)
                    setPriceBusy(false)
                })
        }, 180)
        return () => {
            alive = false
            clearTimeout(timer)
        }
    }, [config, options])

    /* ---- lock countdown ---- */
    useEffect(() => {
        if (!lock) return undefined
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [lock])

    const remaining = lock ? Math.max(0, lock.remainingMs - (now - lock.receivedAt)) : 0
    const lockActive = Boolean(lock) && remaining > 0
    const total = lockActive ? lock.lockedPrice : price ? price.total : 0
    const animatedTotal = useCountUp(total)

    /* ---- changing the design clears anything tied to the old one ---- */
    const update = (patch) => {
        setConfig((c) => ({ ...c, ...patch }))
        setSaved(null)
        setLock(null)
        setLockError('')
        setSaveError('')
        setReference('')
        setNotice('')
        setBurst((b) => b + 1)
    }

    if (status === 'loading') {
        return (
            <div className="cat-state">
                <span className="cat-state__dot" />
                <p>Preparing the studio...</p>
            </div>
        )
    }

    if (status === 'error' || !options) {
        return (
            <div className="cat-state">
                <p>We could not open the studio. Please check that the server is running.</p>
                <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                    Try again
                </button>
            </div>
        )
    }

    const metalDef = options.metals.find((m) => m.key === config.metal)
    const stoneDef = options.stones.find((s) => s.key === config.stone.type)
    const pieceDef = options.pieceTypes.find((p) => p.key === config.pieceType)
    const hasStone = config.stone.type !== 'none'

    const choosePiece = (key) => {
        const piece = options.pieceTypes.find((p) => p.key === key)
        update({ pieceType: key, size: piece.defaultSize })
    }

    const chooseMetal = (key) => {
        const m = options.metals.find((x) => x.key === key)
        const karat = m.type === 'gold' ? (m.karats.includes(config.karat) ? config.karat : m.defaultKarat) : null
        update({ metal: key, karat })
    }

    const chooseStone = (key) => {
        const s = options.stones.find((x) => x.key === key)
        update({ stone: { type: key, carat: key === 'none' ? 0 : s.defaultCarat } })
    }

    const changeCarat = (value) => {
        const carat = Math.round(Number(value) * 100) / 100
        update({ stone: { ...config.stone, carat } })
    }

    const caratPercent = hasStone ? ((config.stone.carat - stoneDef.min) / (stoneDef.max - stoneDef.min)) * 100 : 0

    const summary = [
        metalDef.type === 'gold' ? `${config.karat}K ${metalDef.label}` : metalDef.label,
        pieceDef.label,
        hasStone ? `${stoneDef.label} ${config.stone.carat} ct` : 'no stone',
    ].join(' · ')

    /* ---- actions ---- */
    const saveDesign = async () => {
        const result = await api('/designs', { method: 'POST', body: { name: designName, config } })
        setSaved(result.design)
        return result.design
    }

    const onSave = async () => {
        setSaving(true)
        setSaveError('')
        try {
            await saveDesign()
        } catch (err) {
            setSaveError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const shareUrl = saved ? `${window.location.origin}/studio?design=${saved.id}` : ''

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2200)
        } catch {
            if (shareRef.current) shareRef.current.select()
        }
    }

    const createLock = async () => {
        setLockBusy(true)
        setLockError('')
        try {
            const result = await api('/pricing/lock', { method: 'POST', body: { config } })
            setLock({ ...result, receivedAt: Date.now() })
            setNow(Date.now())
        } catch (err) {
            setLockError(err.message)
        } finally {
            setLockBusy(false)
        }
    }

    const changeForm = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const submitReserve = async (e) => {
        e.preventDefault()
        setSending(true)
        setFormError('')
        try {
            const body = { ...form }
            if (lockActive) {
                body.lockId = lock.id
            } else {
                const design = saved || (await saveDesign())
                body.designId = design.id
            }
            const result = await api('/contact/reserve', { method: 'POST', body })
            setReference(result.reference)
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSending(false)
        }
    }

    const jumpToReserve = () => {
        setShowForm(true)
        setTimeout(() => {
            if (reserveRef.current) reserveRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 60)
    }

    const priceText = price || lockActive ? formatPKR(animatedTotal) : '...'

    return (
        <div className="dstudio">
            {/* ------------------ Preview ------------------ */}
            <div className="dstudio__left">
                <Preview config={config} stoneDef={hasStone ? stoneDef : null} summary={summary} burst={burst} />
            </div>

            {/* ------------------ Controls ------------------ */}
            <div className="dstudio__right">
                {notice && <p className="studio-notice">{notice}</p>}

                <div className="ctl">
                    <p className="ctl__label">
                        <b>1</b> Choose the piece
                    </p>
                    <div className="tiles tiles--4">
                        {options.pieceTypes.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                className={`tile${config.pieceType === p.key ? ' is-active' : ''}`}
                                onClick={() => choosePiece(p.key)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ctl">
                    <p className="ctl__label">
                        <b>2</b> Choose the metal
                    </p>
                    <div className="balls">
                        {options.metals.map((m) => {
                            const pal = PALETTE[m.key] || PALETTE['yellow-gold']
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    className={`ball${config.metal === m.key ? ' is-active' : ''}`}
                                    onClick={() => chooseMetal(m.key)}
                                    aria-pressed={config.metal === m.key}
                                >
                                    <i
                                        className="ball__orb"
                                        style={{ background: `radial-gradient(circle at 32% 28%, ${pal.m1}, ${pal.m2} 55%, ${pal.m3})` }}
                                    />
                                    <span>{m.label}</span>
                                </button>
                            )
                        })}
                    </div>
                    {metalDef.type === 'gold' && (
                        <div className="opts opts--sub">
                            {metalDef.karats.map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    className={`opt opt--small${config.karat === k ? ' is-active' : ''}`}
                                    onClick={() => update({ karat: k })}
                                >
                                    {k}K
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ctl">
                    <p className="ctl__label">
                        <b>3</b> Choose the stone
                    </p>
                    <div className="tiles tiles--5">
                        {options.stones.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                className={`tile tile--stone${config.stone.type === s.key ? ' is-active' : ''}`}
                                onClick={() => chooseStone(s.key)}
                                aria-pressed={config.stone.type === s.key}
                            >
                                {s.swatch ? <GemIcon color={s.swatch} /> : <span className="gemicon gemicon--none" aria-hidden="true" />}
                                <span>{s.label.replace('Blue ', '')}</span>
                            </button>
                        ))}
                    </div>
                    {hasStone && (
                        <div className="carat">
                            <div className="carat__row">
                                <span>Size of the stone</span>
                                <strong>{config.stone.carat.toFixed(2)} ct</strong>
                            </div>
                            <input
                                type="range"
                                min={stoneDef.min}
                                max={stoneDef.max}
                                step="0.05"
                                value={config.stone.carat}
                                style={{ '--p': `${caratPercent}%` }}
                                onChange={(e) => changeCarat(e.target.value)}
                                aria-label="Stone carat"
                            />
                            <div className="carat__row carat__row--ends">
                                <span>{stoneDef.min} ct</span>
                                <span>{stoneDef.max} ct</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ctl">
                    <p className="ctl__label">
                        <b>4</b> Choose the size
                    </p>
                    <div className="opts">
                        {pieceDef.sizes.map((s) => (
                            <button
                                key={s.value}
                                type="button"
                                className={`opt opt--small${config.size === s.value ? ' is-active' : ''}`}
                                onClick={() => update({ size: s.value })}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ctl">
                    <p className="ctl__label">
                        <b>5</b> Engraving <span>(optional, + {formatPKR(options.engraving.fee)})</span>
                    </p>
                    <input
                        className="studio-input"
                        value={config.engraving}
                        maxLength={options.engraving.maxLength}
                        placeholder="A name, a date, a word"
                        onChange={(e) => update({ engraving: e.target.value })}
                    />
                </div>

                {/* ------------------ Price ------------------ */}
                <div className={`pricebox${priceBusy ? ' is-busy' : ''}`}>
                    <div className="pricebox__top">
                        <p className="pricebox__label">{lockActive ? 'Your locked price' : 'Your price today'}</p>
                        <span className="livebadge">
                            <i /> Live
                        </span>
                    </div>
                    <strong className="pricebox__total gold-text">{priceText}</strong>

                    {priceError && <p className="modal__error">{priceError}</p>}

                    {price && (
                        <div className="breakdown">
                            <div className="breakdown__row">
                                <span>
                                    {price.metalLabel}
                                    {price.karat ? ` ${price.karat}K` : ''} · {price.weight} g
                                </span>
                                <span>{formatPKR(price.lines.metal)}</span>
                            </div>
                            <div className="breakdown__row">
                                <span>Making charges ({price.makingPercent}%)</span>
                                <span>{formatPKR(price.lines.making)}</span>
                            </div>
                            {price.stone.type !== 'none' && (
                                <div className="breakdown__row">
                                    <span>
                                        {price.stone.label} · {price.stone.carat} ct
                                    </span>
                                    <span>{formatPKR(price.lines.stone)}</span>
                                </div>
                            )}
                            {price.engraving && (
                                <div className="breakdown__row">
                                    <span>Engraving</span>
                                    <span>{formatPKR(price.lines.engraving)}</span>
                                </div>
                            )}
                            <div className="breakdown__row breakdown__row--total">
                                <span>Total at today's gold rate</span>
                                <span>{formatPKR(price.total)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ------------------ Price lock ------------------ */}
                <div className={`lock${lockActive ? ' lock--active' : ''}`}>
                    {lockActive ? (
                        <>
                            <p className="lock__title">Price locked</p>
                            <p className="lock__timer">{countdown(remaining)}</p>
                            <p className="lock__text">
                                {lock.savings > 0
                                    ? `You are saving ${formatPKR(lock.savings)} compared with today's rate.`
                                    : 'This price is held for you, even if the gold rate moves.'}
                            </p>
                            <p className="lock__id">Lock ID: {lock.id} · changing the design releases the lock</p>
                        </>
                    ) : (
                        <>
                            <p className="lock__title">Gold rates move through the day</p>
                            <p className="lock__text">Lock this exact design at today's price for 24 hours.</p>
                            <button type="button" className="btn btn-ghost" onClick={createLock} disabled={lockBusy || !price}>
                                {lockBusy ? 'Locking...' : 'Lock this price for 24 hours'}
                            </button>
                        </>
                    )}
                    {lockError && <p className="modal__error">{lockError}</p>}
                </div>

                {/* ------------------ Save and share ------------------ */}
                <div className="savebox">
                    <p className="ctl__label">Save and share</p>
                    <div className="savebox__row">
                        <input
                            className="studio-input"
                            value={designName}
                            maxLength={40}
                            placeholder="Name your design"
                            onChange={(e) => setDesignName(e.target.value)}
                        />
                        <button type="button" className="btn btn-gold" onClick={onSave} disabled={saving}>
                            {saving ? 'Saving...' : saved ? 'Save again' : 'Save design'}
                        </button>
                    </div>
                    {saveError && <p className="modal__error">{saveError}</p>}
                    {saved && (
                        <div className="share">
                            <p className="share__text">Saved. Anyone with this link can open your design:</p>
                            <div className="savebox__row">
                                <input ref={shareRef} className="studio-input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                                <button type="button" className="btn btn-ghost" onClick={copyLink}>
                                    {copied ? 'Copied' : 'Copy link'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ------------------ Reserve ------------------ */}
                <div ref={reserveRef}>
                    {reference ? (
                        <div className="modal__success">
                            <p className="modal__success-title">Thank you. Your design is reserved.</p>
                            <p>
                                Reference <strong>{reference}</strong>. Our team will call you to confirm the details.
                            </p>
                        </div>
                    ) : showForm ? (
                        <form className="mform" onSubmit={submitReserve}>
                            <p className="mform__title">Reserve {lockActive ? 'at your locked price' : 'this design'}</p>
                            <div className="mfield">
                                <label htmlFor="ds-name">Your name</label>
                                <input id="ds-name" value={form.name} onChange={changeForm('name')} required maxLength={60} autoComplete="name" />
                            </div>
                            <div className="mform__two">
                                <div className="mfield">
                                    <label htmlFor="ds-phone">Phone</label>
                                    <input
                                        id="ds-phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={changeForm('phone')}
                                        required
                                        maxLength={20}
                                        autoComplete="tel"
                                        placeholder="+92 300 0000000"
                                    />
                                </div>
                                <div className="mfield">
                                    <label htmlFor="ds-email">Email (optional)</label>
                                    <input id="ds-email" type="email" value={form.email} onChange={changeForm('email')} maxLength={100} autoComplete="email" />
                                </div>
                            </div>
                            <div className="mfield">
                                <label htmlFor="ds-note">Note (optional)</label>
                                <textarea id="ds-note" rows="2" value={form.note} onChange={changeForm('note')} maxLength={500} />
                            </div>
                            {formError && <p className="modal__error">{formError}</p>}
                            <div className="mform__actions">
                                <button type="submit" className="btn btn-gold" disabled={sending}>
                                    {sending ? 'Sending...' : 'Confirm reservation'}
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button type="button" className="btn btn-gold modal__reserve" onClick={() => setShowForm(true)}>
                            Reserve this design
                        </button>
                    )}
                </div>
            </div>

            {/* ------------------ Mobile sticky price bar ------------------ */}
            <div className="pricebar" aria-hidden={reference ? 'true' : undefined}>
                <div className="pricebar__info">
                    <span>{lockActive ? 'Locked price' : 'Your price'}</span>
                    <strong>{priceText}</strong>
                </div>
                <button type="button" className="btn btn-gold" onClick={jumpToReserve} disabled={Boolean(reference)}>
                    Reserve
                </button>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Gift Finder quiz                                                   */
/* ------------------------------------------------------------------ */

function Quiz() {
    const [questions, setQuestions] = useState([])
    const [status, setStatus] = useState('loading') // loading | error | ask | working | done
    const [attempt, setAttempt] = useState(0)
    const [step, setStep] = useState(0)
    const [answers, setAnswers] = useState({})
    const [matches, setMatches] = useState([])
    const [error, setError] = useState('')
    const [openId, setOpenId] = useState(null)

    useEffect(() => {
        let alive = true
        setStatus('loading')
        api('/quiz/questions')
            .then((data) => {
                if (!alive) return
                setQuestions(data.questions)
                setStatus('ask')
            })
            .catch(() => alive && setStatus('error'))
        return () => {
            alive = false
        }
    }, [attempt])

    const finish = async (final) => {
        setStatus('working')
        setError('')
        try {
            const res = await api('/quiz/recommend', { method: 'POST', body: { answers: final } })
            setMatches(res.matches)
            setStatus('done')
        } catch (err) {
            setError(err.message)
            setStatus('ask')
        }
    }

    const choose = (questionId, optionId) => {
        const next = { ...answers, [questionId]: optionId }
        setAnswers(next)
        if (step < questions.length - 1) setStep(step + 1)
        else finish(next)
    }

    const restart = () => {
        setAnswers({})
        setMatches([])
        setStep(0)
        setError('')
        setStatus('ask')
    }

    if (status === 'loading') {
        return (
            <div className="cat-state">
                <span className="cat-state__dot" />
                <p>Loading the Gift Finder...</p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="cat-state">
                <p>We could not load the Gift Finder. Please check that the server is running.</p>
                <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                    Try again
                </button>
            </div>
        )
    }

    if (status === 'working') {
        return (
            <div className="cat-state">
                <span className="cat-state__dot" />
                <p>Choosing the perfect pieces...</p>
            </div>
        )
    }

    if (status === 'done') {
        return (
            <div className="qresults">
                <div className="qresults__head">
                    <p className="eyebrow">Your matches</p>
                    <h2>
                        Pieces she will <span className="gold-text">love</span>
                    </h2>
                    <button type="button" className="btn btn-ghost" onClick={restart}>
                        Start again
                    </button>
                </div>

                <div className="qresults__grid">
                    {matches.map((m, i) => (
                        <article key={m.product.id} className="qcard" style={{ '--d': `${i * 110}ms` }}>
                            <button type="button" className="qcard__media" onClick={() => setOpenId(m.product.id)}>
                                <img
                                    src={m.product.image}
                                    alt={m.product.name}
                                    loading="lazy"
                                    style={{ objectPosition: m.product.objectPosition || 'center' }}
                                />
                                <span className="qcard__badge">
                                    {i === 0 ? 'Best match · ' : ''}
                                    {m.matchPercent}%
                                </span>
                            </button>
                            <div className="qcard__body">
                                <h3>{m.product.name}</h3>
                                <span className="qcard__price">{formatPKR(m.product.price)}</span>
                                {m.reasons.length > 0 && (
                                    <ul className="qcard__reasons">
                                        {m.reasons.slice(0, 3).map((r) => (
                                            <li key={r}>{r}</li>
                                        ))}
                                    </ul>
                                )}
                                <button type="button" className="btn btn-ghost" onClick={() => setOpenId(m.product.id)}>
                                    View details
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                <p className="qresults__more">
                    Want something different? <Link to="/collections">Browse all collections</Link>
                </p>

                {openId && <ProductModal productId={openId} onClose={() => setOpenId(null)} />}
            </div>
        )
    }

    const q = questions[step]
    const progress = ((step + 1) / questions.length) * 100

    return (
        <div className="quiz">
            <div className="quiz__progress" aria-hidden="true">
                <i style={{ width: `${progress}%` }} />
            </div>
            <p className="quiz__step">
                Question {step + 1} of {questions.length}
            </p>

            <div className="quiz__body" key={q.id}>
                <h2>{q.title}</h2>
                <div className="quiz__options">
                    {q.options.map((o, i) => (
                        <button
                            key={o.id}
                            type="button"
                            className={`qopt${answers[q.id] === o.id ? ' is-active' : ''}`}
                            style={{ '--d': `${i * 70}ms` }}
                            onClick={() => choose(q.id, o.id)}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="modal__error quiz__error">{error} Please choose an answer again to retry.</p>}

            <div className="quiz__nav">
                <button
                    type="button"
                    className="quiz__back"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                >
                    ← Back
                </button>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Studio() {
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') === 'quiz' ? 'quiz' : 'design'
    const initialDesign = useRef(params.get('design'))

    const setTab = (t) => setParams(t === 'quiz' ? { tab: 'quiz' } : {}, { replace: true })

    return (
        <section className="studio">
            <div className="container">
                <header className="studio__head">
                    <p className="eyebrow">Evelyn Jewels</p>
                    <h1>
                        {tab === 'design' ? (
                            <>
                                Design <span className="gold-text">Studio</span>
                            </>
                        ) : (
                            <>
                                Gift <span className="gold-text">Finder</span>
                            </>
                        )}
                    </h1>
                    <p className="studio__lead">
                        {tab === 'design'
                            ? 'Shape a piece that is only yours. The price follows the live gold rate.'
                            : 'Six quick questions, and we choose the pieces that suit her and your budget.'}
                    </p>
                </header>

                <div className="studio__tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'design'}
                        className={`studio__tab${tab === 'design' ? ' is-active' : ''}`}
                        onClick={() => setTab('design')}
                    >
                        Design your own
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'quiz'}
                        className={`studio__tab${tab === 'quiz' ? ' is-active' : ''}`}
                        onClick={() => setTab('quiz')}
                    >
                        Gift Finder
                    </button>
                </div>

                <div hidden={tab !== 'design'}>
                    <DesignStudio initialDesignId={initialDesign.current} />
                </div>
                <div hidden={tab !== 'quiz'}>
                    <Quiz />
                </div>
            </div>
        </section>
    )
}