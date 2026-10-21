import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPKR } from '../lib/api'
import useReveal from '../hooks/useReveal'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'

const ORDER = ['rings', 'earrings', 'bracelets', 'necklaces']

const CATEGORIES = {
    rings: {
        label: 'Rings',
        number: '01',
        image: '/images/ring.jpg',
        position: 'center',
        intro: 'Sapphires, diamonds and sculpted gold, made to be noticed from across the table.',
    },
    earrings: {
        label: 'Earrings',
        number: '02',
        image: '/images/earrings2.jpg',
        position: 'center 40%',
        intro: 'Drops, studs and statements that frame the face and move with you.',
    },
    bracelets: {
        label: 'Bracelets',
        number: '03',
        image: '/images/bracelet.jpg',
        position: 'center',
        intro: 'Tennis lines, bangles and cuffs. One piece on the wrist is a signature.',
    },
    necklaces: {
        label: 'Necklaces',
        number: '04',
        image: '/images/necklace.jpg',
        position: 'center 40%',
        intro: 'Pendants, chokers and layered chains for the neckline.',
    },
}

const metalText = (p) => `${p.metal.replace('-', ' ')}${p.karat ? ` · ${p.karat}K` : ''}`
const pad = (n) => String(n).padStart(2, '0')

/* A row that scrolls sideways. On desktop you can also grab it with the mouse and drag. */
function DragRow({ children }) {
    const ref = useRef(null)
    const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false })
    const [dragging, setDragging] = useState(false)

    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        drag.current = { active: true, startX: e.clientX, startLeft: ref.current.scrollLeft, moved: false }
    }

    const onPointerMove = (e) => {
        const d = drag.current
        if (!d.active) return
        const dx = e.clientX - d.startX
        if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true
            setDragging(true)
            try {
                ref.current.setPointerCapture(e.pointerId)
            } catch {
                /* ignore */
            }
        }
        if (d.moved) ref.current.scrollLeft = d.startLeft - dx
    }

    const onPointerEnd = (e) => {
        const d = drag.current
        if (!d.active) return
        d.active = false
        if (d.moved) {
            setDragging(false)
            try {
                ref.current.releasePointerCapture(e.pointerId)
            } catch {
                /* ignore */
            }
        }
    }

    const onClickCapture = (e) => {
        if (drag.current.moved) {
            e.preventDefault()
            e.stopPropagation()
            drag.current.moved = false
        }
    }

    return (
        <div
            ref={ref}
            className={`hscroll${dragging ? ' is-dragging' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClickCapture={onClickCapture}
            onDragStart={(e) => e.preventDefault()}
        >
            {children}
        </div>
    )
}

/* Bracelets: a large sticky picture that changes as you scroll through the list. */
function BraceletStory({ items, onOpen }) {
    const [active, setActive] = useState(0)
    const refs = useRef([])

    useEffect(() => {
        if (!('IntersectionObserver' in window)) return undefined
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(Number(entry.target.dataset.index))
                })
            },
            { rootMargin: '-45% 0px -45% 0px' }
        )
        refs.current.forEach((el) => el && io.observe(el))
        return () => io.disconnect()
    }, [items])

    return (
        <div className="story">
            <div className="story__stage" aria-hidden="true">
                {items.map((p, i) => (
                    <img
                        key={p.id}
                        className={`story__img${i === active ? ' is-active' : ''}`}
                        src={p.image}
                        alt=""
                        draggable="false"
                        style={{ objectPosition: p.objectPosition || 'center' }}
                    />
                ))}
                <span className="story__count">
                    {pad(active + 1)} / {pad(items.length)}
                </span>
            </div>

            <ol className="story__list">
                {items.map((p, i) => (
                    <li
                        key={p.id}
                        ref={(el) => {
                            refs.current[i] = el
                        }}
                        data-index={i}
                        className={`story__item${i === active ? ' is-active' : ''}`}
                    >
                        <img
                            className="story__inline"
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            style={{ objectPosition: p.objectPosition || 'center' }}
                        />
                        <span className="story__metal">{metalText(p)}</span>
                        <h3>{p.name}</h3>
                        <p className="story__tagline">{p.tagline}</p>
                        <span className="story__price">{formatPKR(p.price)}</span>
                        <button type="button" className="btn btn-ghost" onClick={() => onOpen(p)}>
                            View details
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default function CategoryPage({ category }) {
    const meta = CATEGORIES[category]
    const [products, setProducts] = useState([])
    const [status, setStatus] = useState('loading')
    const [attempt, setAttempt] = useState(0)
    const [openId, setOpenId] = useState(null)

    useEffect(() => {
        let alive = true
        setStatus('loading')
        api(`/products?category=${category}`)
            .then((data) => {
                if (!alive) return
                setProducts(data.products)
                setStatus('ready')
            })
            .catch(() => alive && setStatus('error'))
        return () => {
            alive = false
        }
    }, [category, attempt])

    useReveal([status])

    const onOpen = (p) => setOpenId(p.id)
    const minPrice = products.length ? Math.min(...products.map((p) => p.price)) : 0

    let body = null
    if (category === 'rings') {
        body = (
            <div className="stagger">
                {products.map((p, i) => (
                    <ProductCard key={p.id} product={p} variant={i === 0 ? 'lg' : 'md'} delay={i * 90} onOpen={onOpen} />
                ))}
            </div>
        )
    } else if (category === 'earrings') {
        body = (
            <DragRow>
                {products.map((p, i) => (
                    <ProductCard key={p.id} product={p} variant="md" delay={i * 80} onOpen={onOpen} />
                ))}
            </DragRow>
        )
    } else if (category === 'bracelets') {
        body = <BraceletStory items={products} onOpen={onOpen} />
    } else {
        body = (
            <div className="panels reveal">
                {products.map((p) => (
                    <button key={p.id} type="button" className="panel" onClick={() => onOpen(p)}>
                        <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            draggable="false"
                            style={{ objectPosition: p.objectPosition || 'center' }}
                        />
                        <span className="panel__shade" />
                        <span className="panel__info">
                            <span className="panel__metal">{metalText(p)}</span>
                            <strong className="panel__name">{p.name}</strong>
                            <span className="panel__price">{formatPKR(p.price)}</span>
                        </span>
                    </button>
                ))}
            </div>
        )
    }

    return (
        <div className={`cat-page cat-page--${category}`}>
            {/* ---------------- Hero ---------------- */}
            <section className="cat-hero">
                <img className="cat-hero__img" src={meta.image} alt="" style={{ objectPosition: meta.position }} />
                <div className="cat-hero__shade" />
                <div className="container cat-hero__content">
                    <Link to="/collections" className="cat-hero__back hero-in" style={{ '--d': '0.1s' }}>
                        <span aria-hidden="true">←</span> All collections
                    </Link>
                    <p className="eyebrow hero-in" style={{ '--d': '0.2s' }}>
                        Collection {meta.number}
                    </p>
                    <h1 className="cat-hero__title" aria-label={meta.label}>
                        <span className="hero__line" aria-hidden="true">
                            <span className="gold-text hero__italic" style={{ '--d': '0.35s' }}>
                                {meta.label}
                            </span>
                        </span>
                    </h1>
                    <p className="cat-hero__intro hero-in" style={{ '--d': '0.9s' }}>
                        {meta.intro}
                    </p>
                    {status === 'ready' && (
                        <div className="cat-hero__stats hero-in" style={{ '--d': '1.1s' }}>
                            <span>
                                <strong>{products.length}</strong> pieces
                            </span>
                            <span>
                                From <strong>{formatPKR(minPrice)}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* ---------------- Products ---------------- */}
            <section className="cat-body">
                <div className="container">
                    {status === 'loading' && (
                        <div className="cat-state">
                            <span className="cat-state__dot" />
                            <p>Loading the collection...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="cat-state">
                            <p>We could not load this collection. Please check that the server is running.</p>
                            <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                                Try again
                            </button>
                        </div>
                    )}

                    {status === 'ready' && body}
                </div>
            </section>

            {/* ---------------- Other collections ---------------- */}
            <section className="cat-next">
                <div className="container">
                    <p className="eyebrow reveal">Keep exploring</p>
                    <div className="cat-next__grid">
                        {ORDER.filter((k) => k !== category).map((k, i) => (
                            <Link
                                key={k}
                                to={`/${k}`}
                                className="cat-next__card reveal"
                                style={{ '--d': `${i * 100}ms` }}
                            >
                                <img src={CATEGORIES[k].image} alt="" loading="lazy" style={{ objectPosition: CATEGORIES[k].position }} />
                                <span className="cat-next__shade" />
                                <span className="cat-next__label">
                                    <em>{CATEGORIES[k].number}</em>
                                    {CATEGORIES[k].label}
                                </span>
                            </Link>
                        ))}
                    </div>

                    <div className="cat-next__cta reveal">
                        <h3>
                            Prefer something <span className="gold-text">only yours?</span>
                        </h3>
                        <Link to="/studio" className="btn btn-gold">
                            Design your own
                        </Link>
                    </div>
                </div>
            </section>

            {openId && <ProductModal productId={openId} onClose={() => setOpenId(null)} />}
        </div>
    )
}