import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import useReveal from '../hooks/useReveal'
import ProductCard from '../components/ProductCard'

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'rings', label: 'Rings' },
    { key: 'earrings', label: 'Earrings' },
    { key: 'bracelets', label: 'Bracelets' },
    { key: 'necklaces', label: 'Necklaces' },
]

const SORTS = [
    { value: 'featured', label: 'Signature order' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'name', label: 'Name: A to Z' },
]

export default function Collections() {
    const [params, setParams] = useSearchParams()
    const requested = params.get('category')
    const cat = FILTERS.some((f) => f.key === requested) ? requested : 'all'

    const [sort, setSort] = useState('featured')
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let alive = true
        setLoading(true)
        setError('')

        const query = new URLSearchParams()
        if (cat !== 'all') query.set('category', cat)
        if (sort !== 'featured') query.set('sort', sort)
        const qs = query.toString()

        api(`/products${qs ? `?${qs}` : ''}`)
            .then((data) => {
                if (!alive) return
                setProducts(data.products)
                setLoading(false)
            })
            .catch((err) => {
                if (!alive) return
                setError(err.message)
                setLoading(false)
            })

        return () => {
            alive = false
        }
    }, [cat, sort, attempt])

    useReveal([products])

    const chooseCategory = (key) => {
        setParams(key === 'all' ? {} : { category: key }, { replace: true })
    }

    const current = FILTERS.find((f) => f.key === cat)

    return (
        <section className="collections">
            <div className="container">
                <header className="collections__head">
                    <p className="eyebrow">Evelyn Jewels</p>
                    <h1>
                        The <span className="gold-text">Collections</span>
                    </h1>
                    <p className="collections__lead">Every piece, priced today at the live gold rate.</p>
                </header>

                <div className="collections__bar">
                    <div className="chips" role="tablist" aria-label="Filter by category">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                role="tab"
                                aria-selected={cat === f.key}
                                className={`chip${cat === f.key ? ' is-active' : ''}`}
                                onClick={() => chooseCategory(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <label className="sort">
                        <span>Sort</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            {SORTS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <p className="collections__count">
                    {loading && products.length === 0
                        ? 'Loading...'
                        : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
                    {cat !== 'all' && (
                        <Link to={`/${cat}`} className="collections__more">
                            Open the {current.label.toLowerCase()} page <span aria-hidden="true">→</span>
                        </Link>
                    )}
                </p>

                {error ? (
                    <div className="cat-state">
                        <p>{error}</p>
                        <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className={`grid${loading ? ' is-loading' : ''}`}>
                        {products.map((p, i) => (
                            <ProductCard key={p.id} product={p} variant="md" delay={(i % 4) * 70} />
                        ))}
                        {!loading && products.length === 0 && <p className="grid__empty">No pieces found.</p>}
                    </div>
                )}
            </div>
        </section>
    )
}