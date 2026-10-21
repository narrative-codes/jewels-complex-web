import { useEffect, useRef, useState } from 'react'
import { api, formatPKR } from '../lib/api'

const lockKey = (id) => `evelyn-lock-${id}`

function readStoredLock(id) {
    try {
        return window.localStorage.getItem(lockKey(id))
    } catch {
        return null
    }
}

function storeLock(id, value) {
    try {
        if (value) window.localStorage.setItem(lockKey(id), value)
        else window.localStorage.removeItem(lockKey(id))
    } catch {
        /* storage is not available, the lock still works for this visit */
    }
}

function countdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
}

const withClock = (lock) => ({ ...lock, receivedAt: Date.now() })
const EMPTY_FORM = { name: '', phone: '', email: '', note: '' }

export default function ProductModal({ productId, onClose }) {
    const [id, setId] = useState(productId)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    const [lock, setLock] = useState(null)
    const [lockBusy, setLockBusy] = useState(false)
    const [lockError, setLockError] = useState('')
    const [now, setNow] = useState(Date.now())

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [sending, setSending] = useState(false)
    const [formError, setFormError] = useState('')
    const [reference, setReference] = useState('')

    const dialogRef = useRef(null)
    const closeRef = useRef(null)
    const scrollRef = useRef(null)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    /* Lock page scroll, close on Escape, keep keyboard focus inside the popup */
    useEffect(() => {
        const previous = document.activeElement
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeRef.current?.focus()

        const onKey = (e) => {
            if (e.key === 'Escape') {
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab' || !dialogRef.current) return
            const nodes = dialogRef.current.querySelectorAll(
                'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'
            )
            if (!nodes.length) return
            const first = nodes[0]
            const last = nodes[nodes.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = previousOverflow
            if (previous && previous.focus) previous.focus()
        }
    }, [])

    /* Load the product (and any price lock saved for it) whenever the product changes */
    useEffect(() => {
        let alive = true
        setData(null)
        setError('')
        setLock(null)
        setLockError('')
        setShowForm(false)
        setFormError('')
        setReference('')
        if (scrollRef.current) scrollRef.current.scrollTo(0, 0)

        api(`/products/${id}`)
            .then((res) => alive && setData(res))
            .catch((err) => alive && setError(err.message))

        const stored = readStoredLock(id)
        if (stored) {
            api(`/pricing/lock/${stored}`)
                .then((res) => {
                    if (!alive) return
                    if (res.status === 'active') {
                        setLock(withClock(res))
                        setNow(Date.now())
                    } else {
                        storeLock(id, null)
                    }
                })
                .catch(() => { })
        }

        return () => {
            alive = false
        }
    }, [id])

    /* Tick every second while a lock exists */
    useEffect(() => {
        if (!lock) return undefined
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [lock])

    const remaining = lock ? Math.max(0, lock.remainingMs - (now - lock.receivedAt)) : 0
    const lockActive = Boolean(lock) && remaining > 0

    const createLock = async () => {
        setLockBusy(true)
        setLockError('')
        try {
            const result = await api('/pricing/lock', { method: 'POST', body: { productId: id } })
            storeLock(id, result.id)
            setLock(withClock(result))
            setNow(Date.now())
        } catch (err) {
            setLockError(err.message)
        } finally {
            setLockBusy(false)
        }
    }

    const change = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        setSending(true)
        setFormError('')
        try {
            const body = { ...form }
            if (lockActive) body.lockId = lock.id
            else body.productId = id
            const result = await api('/contact/reserve', { method: 'POST', body })
            setReference(result.reference)
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSending(false)
        }
    }

    const onBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    const product = data ? data.product : null
    const b = product ? product.breakdown : null

    return (
        <div className="modal" onMouseDown={onBackdrop}>
            <div className="modal__dialog" role="dialog" aria-modal="true" aria-label="Piece details" ref={dialogRef}>
                <button type="button" className="modal__close" onClick={onClose} ref={closeRef} aria-label="Close">
                    ×
                </button>

                <div className="modal__scroll" ref={scrollRef}>
                    {error && (
                        <div className="modal__state">
                            <p>{error}</p>
                            <button type="button" className="btn btn-ghost" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    )}

                    {!error && !product && (
                        <div className="modal__state">
                            <span className="cat-state__dot" />
                            <p>Loading...</p>
                        </div>
                    )}

                    {product && (
                        <div className="modal__grid">
                            <div className="modal__media">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    style={{ objectPosition: product.objectPosition || 'center' }}
                                />
                            </div>

                            <div className="modal__info">
                                <div className="modal__head">
                                    <span className="modal__cat">
                                        {product.category} · {product.metal.replace('-', ' ')}
                                        {product.karat ? ` · ${product.karat}K` : ''}
                                    </span>
                                    <h2>{product.name}</h2>
                                    <p className="modal__tagline">{product.tagline}</p>
                                </div>

                                <p className="modal__desc">{product.description}</p>

                                <div className="modal__price">
                                    <span className="modal__price-label">{lockActive ? 'Your locked price' : "Today's price"}</span>
                                    <strong className="gold-text">{formatPKR(lockActive ? lock.lockedPrice : product.price)}</strong>
                                </div>

                                <div className="breakdown">
                                    <div className="breakdown__row">
                                        <span>
                                            {b.metalLabel}
                                            {b.karat ? ` ${b.karat}K` : ''} · {b.weight} g
                                        </span>
                                        <span>{formatPKR(b.lines.metal)}</span>
                                    </div>
                                    <div className="breakdown__row">
                                        <span>Making charges ({b.makingPercent}%)</span>
                                        <span>{formatPKR(b.lines.making)}</span>
                                    </div>
                                    {b.stone.type !== 'none' && (
                                        <div className="breakdown__row">
                                            <span>
                                                {b.stone.label} · {b.stone.carat} ct
                                            </span>
                                            <span>{formatPKR(b.lines.stone)}</span>
                                        </div>
                                    )}
                                    <div className="breakdown__row breakdown__row--total">
                                        <span>Total at today's gold rate</span>
                                        <span>{formatPKR(b.total)}</span>
                                    </div>
                                </div>

                                {/* ---------- Price lock ---------- */}
                                <div className={`lock${lockActive ? ' lock--active' : ''}`}>
                                    {lockActive ? (
                                        <>
                                            <p className="lock__title">Price locked</p>
                                            <p className="lock__timer" aria-live="off">
                                                {countdown(remaining)}
                                            </p>
                                            <p className="lock__text">
                                                {lock.savings > 0
                                                    ? `You are saving ${formatPKR(lock.savings)} compared with today's rate.`
                                                    : 'This price is held for you, even if the gold rate moves.'}
                                            </p>
                                            <p className="lock__id">Lock ID: {lock.id}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="lock__title">Gold rates move through the day</p>
                                            <p className="lock__text">
                                                {lock
                                                    ? 'Your earlier lock has expired. You can lock today\u2019s price again.'
                                                    : 'Lock today\u2019s price for 24 hours, then decide.'}
                                            </p>
                                            <button type="button" className="btn btn-ghost" onClick={createLock} disabled={lockBusy}>
                                                {lockBusy ? 'Locking...' : 'Lock this price for 24 hours'}
                                            </button>
                                        </>
                                    )}
                                    {lockError && <p className="modal__error">{lockError}</p>}
                                </div>

                                {/* ---------- Reserve ---------- */}
                                {reference ? (
                                    <div className="modal__success">
                                        <p className="modal__success-title">Thank you. Your piece is reserved.</p>
                                        <p>
                                            Reference <strong>{reference}</strong>. Our team will call you to confirm the details.
                                        </p>
                                    </div>
                                ) : showForm ? (
                                    <form className="mform" onSubmit={submit}>
                                        <p className="mform__title">
                                            Reserve {lockActive ? 'at your locked price' : 'this piece'}
                                        </p>
                                        <div className="mfield">
                                            <label htmlFor="rv-name">Your name</label>
                                            <input id="rv-name" value={form.name} onChange={change('name')} required maxLength={60} autoComplete="name" />
                                        </div>
                                        <div className="mform__two">
                                            <div className="mfield">
                                                <label htmlFor="rv-phone">Phone</label>
                                                <input
                                                    id="rv-phone"
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={change('phone')}
                                                    required
                                                    maxLength={20}
                                                    autoComplete="tel"
                                                    placeholder="+92 300 0000000"
                                                />
                                            </div>
                                            <div className="mfield">
                                                <label htmlFor="rv-email">Email (optional)</label>
                                                <input id="rv-email" type="email" value={form.email} onChange={change('email')} maxLength={100} autoComplete="email" />
                                            </div>
                                        </div>
                                        <div className="mfield">
                                            <label htmlFor="rv-note">Note (optional)</label>
                                            <textarea id="rv-note" rows="2" value={form.note} onChange={change('note')} maxLength={500} />
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
                                        Reserve this piece
                                    </button>
                                )}

                                {/* ---------- Related ---------- */}
                                {data.related.length > 0 && (
                                    <div className="related">
                                        <p className="related__title">You may also love</p>
                                        <div className="related__row">
                                            {data.related.map((r) => (
                                                <button key={r.id} type="button" className="related__item" onClick={() => setId(r.id)}>
                                                    <img
                                                        src={r.image}
                                                        alt=""
                                                        loading="lazy"
                                                        style={{ objectPosition: r.objectPosition || 'center' }}
                                                    />
                                                    <span className="related__name">{r.name}</span>
                                                    <span className="related__price">{formatPKR(r.price)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}