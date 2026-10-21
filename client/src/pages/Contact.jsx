import { useState } from 'react'
import { api } from '../lib/api'
import useReveal from '../hooks/useReveal'

/* TEMPORARY DETAILS - replace these with the real ones later */
const INFO = {
    phone: '+92 300 0000000',
    phoneLink: 'tel:+923000000000',
    whatsapp: '+92 300 0000000',
    whatsappLink: 'https://wa.me/923000000000?text=Hello%20Evelyn%20Jewels',
    email: 'hello@evelynjewels.example',
    address: ['Evelyn Jewels Showroom', 'Main Boulevard, Gulberg', 'Faisalabad, Punjab, Pakistan'],
    hours: [
        ['Monday to Saturday', '11:00 am to 8:00 pm'],
        ['Sunday', 'By appointment'],
    ],
}

const EMPTY = { name: '', phone: '', email: '', message: '' }

export default function Contact() {
    const [form, setForm] = useState(EMPTY)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [reference, setReference] = useState('')

    useReveal([])

    const change = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        setSending(true)
        setError('')
        try {
            const result = await api('/contact', { method: 'POST', body: form })
            setReference(result.reference)
            setForm(EMPTY)
        } catch (err) {
            setError(err.message)
        } finally {
            setSending(false)
        }
    }

    return (
        <section className="contact">
            <div className="container">
                <header className="contact__head">
                    <p className="eyebrow">Evelyn Jewels</p>
                    <h1>
                        Get in <span className="gold-text">touch</span>
                    </h1>
                    <p className="contact__lead">
                        Questions about a piece, a custom order or a visit to the showroom? Write to us and we will reply
                        personally.
                    </p>
                </header>

                <div className="contact__grid">
                    {/* ---------------- Form ---------------- */}
                    <div className="contact__form reveal">
                        {reference ? (
                            <div className="modal__success">
                                <p className="modal__success-title">Thank you. Your message is with us.</p>
                                <p>
                                    Reference <strong>{reference}</strong>. We usually reply within one working day.
                                </p>
                                <button type="button" className="btn btn-ghost contact__again" onClick={() => setReference('')}>
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form className="mform" onSubmit={submit}>
                                <p className="mform__title">Send us a message</p>
                                <div className="mfield">
                                    <label htmlFor="ct-name">Your name</label>
                                    <input id="ct-name" value={form.name} onChange={change('name')} required maxLength={60} autoComplete="name" />
                                </div>
                                <div className="mform__two">
                                    <div className="mfield">
                                        <label htmlFor="ct-phone">Phone</label>
                                        <input
                                            id="ct-phone"
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
                                        <label htmlFor="ct-email">Email (optional)</label>
                                        <input id="ct-email" type="email" value={form.email} onChange={change('email')} maxLength={100} autoComplete="email" />
                                    </div>
                                </div>
                                <div className="mfield">
                                    <label htmlFor="ct-message">Message</label>
                                    <textarea id="ct-message" rows="6" value={form.message} onChange={change('message')} required minLength={5} maxLength={1000} />
                                </div>
                                {error && <p className="modal__error">{error}</p>}
                                <div className="mform__actions">
                                    <button type="submit" className="btn btn-gold" disabled={sending}>
                                        {sending ? 'Sending...' : 'Send message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* ---------------- Details ---------------- */}
                    <aside className="contact__side">
                        <div className="cinfo reveal" style={{ '--d': '100ms' }}>
                            <p className="cinfo__label">Talk to us</p>
                            <a className="cinfo__big" href={INFO.phoneLink}>
                                {INFO.phone}
                            </a>
                            <a className="cinfo__link" href={INFO.whatsappLink} target="_blank" rel="noopener noreferrer">
                                Chat on WhatsApp <span aria-hidden="true">→</span>
                            </a>
                            <a className="cinfo__link" href={`mailto:${INFO.email}`}>
                                {INFO.email}
                            </a>
                        </div>

                        <div className="cinfo reveal" style={{ '--d': '200ms' }}>
                            <p className="cinfo__label">Visit the showroom</p>
                            <address className="cinfo__address">
                                {INFO.address.map((line) => (
                                    <span key={line}>{line}</span>
                                ))}
                            </address>
                            <ul className="cinfo__hours">
                                {INFO.hours.map(([day, time]) => (
                                    <li key={day}>
                                        <span>{day}</span>
                                        <span>{time}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="cmap reveal" style={{ '--d': '300ms' }} role="img" aria-label="Map placeholder">
                            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                <g fill="none" stroke="rgba(201,169,97,0.22)" strokeWidth="1">
                                    <path d="M0 150 L400 90" />
                                    <path d="M0 60 L400 130" />
                                    <path d="M120 0 L170 200" />
                                    <path d="M270 0 L240 200" />
                                    <path d="M0 105 L400 105" strokeDasharray="4 6" />
                                </g>
                            </svg>
                            <span className="cmap__pin" />
                            <span className="cmap__text">Map goes here once the real address is added</span>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    )
}