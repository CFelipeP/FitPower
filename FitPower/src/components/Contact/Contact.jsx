import { useState } from 'react'
import { Mail, MessageCircle, Clock } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'
import { apiFetch } from '../../lib/api'
import './Contact.css'

export default function Contact() {
    const { t } = useI18n()
    const sectionRef = useScrollReveal()
    const { showToast } = useToast()
    const [sending, setSending] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSending(true)
        const form = e.target
        try {
            await apiFetch('/contact', {
                method: 'POST',
                body: JSON.stringify({
                    firstName: form.firstName.value,
                    email: form.email.value,
                    subject: form.subject.value,
                    message: form.message.value,
                }),
            })
            showToast(t('contact.success'))
            form.reset()
        } catch {
            showToast(t('contact.error'))
        } finally {
            setSending(false)
        }
    }

    return (
        <section id="contact" className="section" ref={sectionRef}>
            <div className="container">
                <div className="contact-grid">
                    <div className="contact-info reveal-left">
                        <div className="section-header">
                            <div className="section-header-line"></div>
                            <span className="section-header-label">{t('contact.label')}</span>
                        </div>
                        <h2 className="section-title" style={{ marginBottom: '24px' }}>{t('contact.title')}</h2>
                        <p className="contact-desc">{t('contact.subtitle')}</p>

                        <div className="contact-list">
                            <div className="contact-item">
                                <div className="contact-icon"><Mail size={20} className="text-power" /></div>
                                <div>
                                    <div className="contact-label">Email</div>
                                    <div className="contact-value">hello@fitpower.com</div>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon"><MessageCircle size={20} className="text-power" /></div>
                                <div>
                                    <div className="contact-label">WhatsApp</div>
                                    <div className="contact-value">+1 (555) 123-4567</div>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon"><Clock size={20} className="text-power" /></div>
                                <div>
                                    <div className="contact-label">Business Hours</div>
                                    <div className="contact-value">Mon–Fri, 8:00 AM – 8:00 PM</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form className="contact-form reveal-right" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" name="firstName" placeholder={t('contact.name')} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" placeholder={t('contact.email')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <select name="subject" required defaultValue="">
                                <option disabled>Select an option</option>
                                <option value="planes">Plan information</option>
                                <option value="tecnico">Technical support</option>
                                <option value="coach">Become a coach</option>
                                <option value="otro">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea name="message" rows="4" placeholder={t('contact.message')} required></textarea>
                        </div>
                        <button type="submit" className="btn-shine form-submit" disabled={sending}>
                            {sending ? t('common.loading') : t('contact.send')}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    )
}
