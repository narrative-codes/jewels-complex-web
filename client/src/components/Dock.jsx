import { NavLink, useLocation } from 'react-router-dom'

const icons = {
    home: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10v9.5h13V10" />
        </svg>
    ),
    collections: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l3 5-9 13L3 8z" />
            <path d="M3 8h18M9 3l3 5 3-5M12 8v13" />
        </svg>
    ),
    studio: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
            <path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
            <circle cx="12" cy="12" r="2.2" />
        </svg>
    ),
    contact: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="1.5" />
            <path d="m3.5 6.5 8.5 7 8.5-7" />
        </svg>
    ),
}

const ITEMS = [
    { to: '/', label: 'Home', icon: 'home', end: true },
    { to: '/collections', label: 'Collections', icon: 'collections' },
    { to: '/studio', label: 'Design Studio', icon: 'studio' },
    { to: '/contact', label: 'Contact', icon: 'contact' },
]

const CATEGORY_PATHS = ['/rings', '/earrings', '/bracelets', '/necklaces']

export default function Dock() {
    const { pathname } = useLocation()

    return (
        <nav className="dock" aria-label="Main navigation">
            <ul className="dock__list">
                {ITEMS.map((item) => {
                    const active =
                        item.to === '/collections'
                            ? pathname === '/collections' || CATEGORY_PATHS.includes(pathname)
                            : undefined
                    return (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `dock__item${(active !== undefined ? active : isActive) ? ' is-active' : ''}`
                                }
                            >
                                <span className="dock__icon">{icons[item.icon]}</span>
                                <span className="dock__label">{item.label}</span>
                            </NavLink>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}