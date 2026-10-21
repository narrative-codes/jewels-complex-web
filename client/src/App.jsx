import { useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import Dock from './components/Dock'
import CategoryPage from './components/CategoryPage'
import Home from './pages/Home'
import Collections from './pages/Collections'
import Studio from './pages/Studio'
import Contact from './pages/Contact'
import './App.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <section className="coming">
      <p className="eyebrow">Evelyn Jewels</p>
      <h1>Page not found</h1>
      <p className="coming__text">The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-ghost">
        Back to Home
      </Link>
    </section>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <>
      <ScrollToTop />
      <Link to="/" className="site-logo" aria-label="Evelyn Jewels, home">
        Evelyn Jewels
        <i aria-hidden="true" />
      </Link>
      <main key={location.pathname} className="page">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/rings" element={<CategoryPage category="rings" />} />
          <Route path="/earrings" element={<CategoryPage category="earrings" />} />
          <Route path="/bracelets" element={<CategoryPage category="bracelets" />} />
          <Route path="/necklaces" element={<CategoryPage category="necklaces" />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Dock />
    </>
  )
}