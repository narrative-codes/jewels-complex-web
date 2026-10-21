import { useEffect } from 'react'

// Adds the "in" class to every .reveal element when it scrolls into view.
// Pass values that change when new content appears (e.g. loaded products).
export default function useReveal(deps = []) {
    useEffect(() => {
        const els = document.querySelectorAll('.reveal:not(.in)')
        if (!('IntersectionObserver' in window)) {
            els.forEach((el) => el.classList.add('in'))
            return undefined
        }
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in')
                        io.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        )
        els.forEach((el) => io.observe(el))
        return () => io.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}