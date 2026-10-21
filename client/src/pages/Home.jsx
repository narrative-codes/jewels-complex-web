import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPKR } from '../lib/api'
import useReveal from '../hooks/useReveal'
import GoldTicker from '../components/GoldTicker'
import ProductCard from '../components/ProductCard'
import CircularCarousel from '../components/CircularCarousel'

const CATEGORIES = [
    { key: 'rings', label: 'Rings', blurb: 'Sapphires, diamonds and sculpted gold for your hand.', cream: false },
    { key: 'earrings', label: 'Earrings', blurb: 'Drops, studs and statements that frame the face.', cream: true },
    { key: 'bracelets', label: 'Bracelets', blurb: 'Tennis lines, bangles and cuffs for the wrist.', cream: false },
    { key: 'necklaces', label: 'Necklaces', blurb: 'Pendants, chokers and chains for the neckline.', cream: true },
]

const SHOWCASE = [
    { src: '/images/home1.jpg', alt: 'Evelyn Jewels campaign image 1', title: 'After Dark', subtitle: 'The Campaign' },
    { src: '/images/home2.jpg', alt: 'Evelyn Jewels campaign image 2', title: 'Held in Light', subtitle: 'The Campaign' },
    { src: '/images/home3.jpg', alt: 'Evelyn Jewels campaign image 3', title: 'Emerald Hour', subtitle: 'The Campaign' },
    { src: '/images/home4.jpg', alt: 'Evelyn Jewels campaign image 4', title: 'Quiet Power', subtitle: 'The Campaign' },
    { src: '/images/home5.jpg', alt: 'Evelyn Jewels campaign image 5', title: 'Golden Hour', subtitle: 'The Campaign' },
]

const PERKS = [
    { n: '18K - 22K', t: 'Pure gold', d: 'Hallmarked gold in every piece.' },
    { n: 'Live', t: 'Gold rate pricing', d: 'Fair prices that follow the market.' },
    { n: '24 hrs', t: 'Price lock', d: 'Freeze today\u2019s price, decide tomorrow.' },
    { n: '100%', t: 'Made your way', d: 'Design your own in the studio.' },
]

const STUDIO_STEPS = [
    'Pick a ring, earrings, bracelet or necklace',
    'Choose the metal, karat and stone',
    'Watch the price move with the gold rate',
    'Lock it for 24 hours and share the link',
]

const TRUST = ['Hallmarked gold', 'Live gold rate', 'Made your way']

/* Fixed positions so the sparkles never jump around between renders */
const SPARKS = Array.from({ length: 22 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    top: (i * 53 + 7) % 100,
    size: 3 + ((i * 7) % 6),
    delay: ((i * 13) % 90) / 10,
    dur: 6 + ((i * 5) % 7),
}))

function Sparkles() {
    return (
        <div className="sparkles" aria-hidden="true">
            {SPARKS.map((s, i) => (
                <i
                    key={i}
                    style={{
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                        animationDuration: `${s.dur}s`,
                    }}
                />
            ))}
        </div>
    )
}

function pickCardWidth() {
    const w = window.innerWidth
    if (w < 640) return 150
    if (w < 1024) return 200
    return 240
}

function useCardWidth() {
    const [width, setWidth] = useState(pickCardWidth)
    useEffect(() => {
        const onResize = () => setWidth(pickCardWidth())
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    return width
}

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

function CategorySection({ cat, index, items }) {
    let body = null

    if (cat.key === 'rings') {
        body = (
            <div className="stagger">
                {items.map((p, i) => (
                    <ProductCard key={p.id} product={p} variant={i === 0 ? 'lg' : 'md'} delay={i * 90} />
                ))}
            </div>
        )
    } else if (cat.key === 'earrings') {
        body = (
            <DragRow>
                {items.map((p, i) => (
                    <ProductCard key={p.id} product={p} variant="md" delay={i * 80} />
                ))}
            </DragRow>
        )
    } else if (cat.key === 'bracelets') {
        body = (
            <div className="feature">
                {items[0] && <ProductCard product={items[0]} variant="lg" />}
                <div className="feature__grid">
                    {items.slice(1).map((p, i) => (
                        <ProductCard key={p.id} product={p} variant="sm" delay={i * 90} />
                    ))}
                </div>
            </div>
        )
    } else {
        body = (
            <div className="panels reveal">
                {items.map((p) => (
                    <Link key={p.id} to={`/${p.category}`} className="panel">
                        <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            draggable="false"
                            style={{ objectPosition: p.objectPosition || 'center' }}
                        />
                        <span className="panel__shade" />
                        <span className="panel__info">
                            <span className="panel__metal">
                                {p.metal.replace('-', ' ')}
                                {p.karat ? ` · ${p.karat}K` : ''}
                            </span>
                            <strong className="panel__name">{p.name}</strong>
                            <span className="panel__price">{formatPKR(p.price)}</span>
                        </span>
                    </Link>
                ))}
            </div>
        )
    }

    return (
        <section className={`cat cat--${cat.key} section${cat.cream ? ' on-cream' : ''}`} id={cat.key}>
            <div className="container">
                <div className="cat__head reveal">
                    <div className="cat__title">
                        <span className="cat__num">0{index + 1}</span>
                        <h2>{cat.label}</h2>
                    </div>
                    <p className="cat__blurb">{cat.blurb}</p>
                    <Link to={`/${cat.key}`} className="cat__link">
                        View all {cat.label.toLowerCase()} <span aria-hidden="true">→</span>
                    </Link>
                </div>
                {body}
            </div>
        </section>
    )
}

export default function Home() {
    const [products, setProducts] = useState([])
    const [status, setStatus] = useState('loading')
    const [attempt, setAttempt] = useState(0)
    const cardWidth = useCardWidth()
    const editorialRef = useRef(null)
    const parallaxRef = useRef(null)

    useEffect(() => {
        let alive = true
        setStatus('loading')
        api('/products')
            .then((data) => {
                if (!alive) return
                setProducts(data.products)
                setStatus('ready')
            })
            .catch(() => alive && setStatus('error'))
        return () => {
            alive = false
        }
    }, [attempt])

    useReveal([status])

    /* Gentle parallax on the editorial image */
    const updateParallax = useCallback(() => {
        const wrap = editorialRef.current
        const img = parallaxRef.current
        if (!wrap || !img) return
        const rect = wrap.getBoundingClientRect()
        const vh = window.innerHeight
        if (rect.bottom < 0 || rect.top > vh) return
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh
        img.style.transform = `translate3d(0, ${(progress * -40).toFixed(1)}px, 0) scale(1.15)`
    }, [])

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
        let raf = 0
        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                raf = 0
                updateParallax()
            })
        }
        updateParallax()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [updateParallax])

    return (
        <>
            {/* ---------------- Hero ---------------- */}

            <section className="vhero">
                <div className="vhero__bg" aria-hidden="true">
                    <video src="/videos/hero.mp4" autoPlay muted loop playsInline preload="auto" tabIndex={-1} />
                </div>

                <div className="vhero__stage">
                    <video
                        className="vhero__video"
                        src="/videos/hero.mp4"
                        poster="/images/hero-poster.jpg"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        aria-label="Evelyn Jewels jewellery film"
                    />
                </div>

                <div className="vhero__shade" aria-hidden="true" />

                <div className="vhero__headline">
                    <p className="eyebrow hero-in" style={{ '--d': '0.3s' }}>
                        Fine Jewellery
                    </p>
                    <h1 className="vhero__title">
                        <span className="hero__line">
                            <span style={{ '--d': '0.4s' }}>Made to be</span>
                        </span>
                        <span className="hero__line">
                            <span className="hero__italic" style={{ '--d': '0.6s' }}>
                                noticed.
                            </span>
                        </span>
                    </h1>
                </div>

                <div className="vhero__cta hero-in" style={{ '--d': '1.2s' }}>
                    <Link to="/collections" className="btn btn-gold">
                        Explore Collections
                    </Link>
                    <Link to="/studio" className="btn btn-ghost">
                        Design Your Own
                    </Link>
                </div>
            </section>

            {/* ---------------- Gold rate ---------------- */}
            <GoldTicker />

            {/* ---------------- Perks ---------------- */}
            <section className="perks">
                <div className="container perks__grid">
                    {PERKS.map((p, i) => (
                        <article className="perk reveal" key={p.t} style={{ '--d': `${i * 90}ms` }}>
                            <strong className="perk__n gold-text">{p.n}</strong>
                            <h3>{p.t}</h3>
                            <p>{p.d}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* ---------------- 3D carousel ---------------- */}
            <section className="showcase section">
                <div className="container showcase__head reveal">
                    <p className="eyebrow">The Campaign</p>
                    <h2>
                        Moments in <span className="gold-text">gold</span>
                    </h2>
                    <p className="showcase__hint">Drag to turn the ring. Click any picture to bring it forward.</p>
                </div>

                <div className="showcase__stage reveal">
                    <CircularCarousel
                        items={SHOWCASE}
                        preset="cylinder"
                        intro="rise"
                        cardWidth={cardWidth}
                        aspectRatio={0.75}
                        gap={34}
                        speed={10}
                        cornerRadius={18}
                        depthFade={0.75}
                        fadeColor="#0a0a0a"
                        captions
                    />
                </div>
            </section>

            {/* ---------------- Categories ---------------- */}
            {status === 'loading' && (
                <div className="container cat-state">
                    <span className="cat-state__dot" />
                    <p>Loading the collection...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="container cat-state">
                    <p>We could not load the collection. Please check that the server is running.</p>
                    <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                        Try again
                    </button>
                </div>
            )}

            {status === 'ready' &&
                CATEGORIES.map((cat, index) => (
                    <CategorySection
                        key={cat.key}
                        cat={cat}
                        index={index}
                        items={products.filter((p) => p.category === cat.key)}
                    />
                ))}

            {/* ---------------- Design Studio block ---------------- */}
            <section className="section studio-wrap">
                <div className="container">
                    <div className="studio-promo on-wine reveal">
                        <div className="studio-promo__text">
                            <p className="eyebrow">Design Studio</p>
                            <h2>
                                Design a piece that is <span className="gold-text">only yours.</span>
                            </h2>
                            <ol className="studio-promo__steps">
                                {STUDIO_STEPS.map((s, i) => (
                                    <li key={s}>
                                        <span>{i + 1}</span>
                                        {s}
                                    </li>
                                ))}
                            </ol>
                            <div className="studio-promo__cta">
                                <Link to="/studio" className="btn btn-gold">
                                    Start designing
                                </Link>
                                <Link to="/studio?tab=quiz" className="btn btn-ghost">
                                    Gift Finder
                                </Link>
                            </div>
                        </div>

                        <div className="studio-promo__visual" aria-hidden="true">
                            <span className="studio-promo__badge">
                                <i /> Live gold rate
                            </span>
                            <svg viewBox="0 0 400 400" className="studio-promo__ring">
                                <defs>
                                    <linearGradient id="hp-metal" gradientUnits="userSpaceOnUse" x1="60" y1="60" x2="340" y2="340">
                                        <stop offset="0" stopColor="#F6E3A6" />
                                        <stop offset="0.5" stopColor="#D4AF37" />
                                        <stop offset="1" stopColor="#8A6A17" />
                                    </linearGradient>
                                </defs>
                                <circle cx="200" cy="262" r="92" fill="none" stroke="url(#hp-metal)" strokeWidth="24" />
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
                                <path d="M166 166 Q200 216 234 166" fill="none" stroke="url(#hp-metal)" strokeWidth="8" strokeLinecap="round" />
                                <g transform="translate(200 150) scale(1.1)">
                                    <polygon
                                        points="-26,-8 -14,-24 14,-24 26,-8 0,32"
                                        fill="#EAF6FF"
                                        stroke="rgba(255,255,255,0.7)"
                                        strokeWidth="1.2"
                                        strokeLinejoin="round"
                                    />
                                    <polygon points="-14,-24 14,-24 7,-8 -7,-8" fill="rgba(255,255,255,0.5)" />
                                </g>
                            </svg>
                            <span className="studio-promo__chip">22K Yellow Gold · Diamond</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------- Editorial ---------------- */}
            <section className="editorial">
                <div className="container editorial__grid">
                    <div className="editorial__media reveal" ref={editorialRef}>
                        <img
                            ref={parallaxRef}
                            className="editorial__img"
                            src="/images/home3.jpg"
                            alt="Evelyn Jewels editorial portrait"
                            loading="lazy"
                        />
                    </div>
                    <div className="editorial__text">
                        <p className="eyebrow reveal">The Evelyn Woman</p>
                        <h2 className="reveal" style={{ '--d': '100ms' }}>
                            Worn with intention.
                            <br />
                            <em className="gold-text">Remembered for years.</em>
                        </h2>
                        <p className="editorial__copy reveal" style={{ '--d': '200ms' }}>
                            Every piece begins with a simple idea: jewellery should feel like a part of you. We work with 18K to
                            22K gold, fine diamonds and rich coloured stones, and finish each design to sit comfortably, day after
                            day.
                        </p>
                        <div className="reveal" style={{ '--d': '300ms' }}>
                            <Link to="/collections" className="btn btn-ghost">
                                Discover the pieces
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------- Gift Finder card ---------------- */}
            <section className="giftwrap">
                <div className="container">
                    <div className="gift on-cream reveal">
                        <div>
                            <p className="eyebrow">Gift Finder</p>
                            <h2>
                                Not sure what to <span className="gold-text">gift?</span>
                            </h2>
                            <p className="gift__copy">
                                Answer six quick questions and we will choose a handful of pieces that suit her, and your budget.
                            </p>
                        </div>
                        <Link to="/studio?tab=quiz" className="btn btn-dark">
                            Find the perfect gift
                        </Link>
                    </div>
                </div>
            </section>

            {/* ---------------- Footer ---------------- */}
            <footer className="footer">
                <p className="footer__brand gold-text">Evelyn Jewels</p>
                <nav className="footer__links" aria-label="Footer">
                    <Link to="/collections">Collections</Link>
                    <Link to="/studio">Design Studio</Link>
                    <Link to="/studio?tab=quiz">Gift Finder</Link>
                    <Link to="/contact">Contact</Link>
                </nav>
                <p className="footer__text">Fine gold and diamond jewellery</p>
            </footer>
        </>
    )
}