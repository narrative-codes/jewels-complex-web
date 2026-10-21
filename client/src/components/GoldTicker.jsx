import { useEffect, useState } from 'react'
import { api, formatPKR } from '../lib/api'

export default function GoldTicker() {
    const [rate, setRate] = useState(null)

    useEffect(() => {
        let alive = true
        const load = () =>
            api('/pricing/rate')
                .then((data) => alive && setRate(data))
                .catch(() => { })
        load()
        const timer = setInterval(load, 60000)
        return () => {
            alive = false
            clearInterval(timer)
        }
    }, [])

    if (!rate) return <div className="ticker ticker--empty" aria-hidden="true" />

    const arrow = rate.trend === 'up' ? '▲' : '▼'
    const items = [
        { label: '24K Gold / Tola', value: formatPKR(rate.perTola24k), change: `${arrow} ${Math.abs(rate.changePct)}%`, trend: rate.trend },
        { label: '24K / Gram', value: formatPKR(rate.perGram[24]) },
        { label: '22K / Gram', value: formatPKR(rate.perGram[22]) },
        { label: '21K / Gram', value: formatPKR(rate.perGram[21]) },
        { label: '18K / Gram', value: formatPKR(rate.perGram[18]) },
        { label: 'Silver / Gram', value: formatPKR(rate.silverPerGram) },
    ]

    const row = (suffix) =>
        items.map((item) => (
            <span className="ticker__item" key={`${item.label}-${suffix}`}>
                <span className="ticker__label">{item.label}</span>
                <span className="ticker__value">{item.value}</span>
                {item.change && <span className={`ticker__change ticker__change--${item.trend}`}>{item.change}</span>}
                <span className="ticker__dot" aria-hidden="true">◆</span>
            </span>
        ))

    return (
        <div className="ticker" role="region" aria-label="Live gold rate">
            <div className="ticker__track">
                {row('a')}
                {row('b')}
            </div>
        </div>
    )
}