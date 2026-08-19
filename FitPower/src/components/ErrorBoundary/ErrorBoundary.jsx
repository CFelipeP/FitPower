import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        // Errors must never disappear silently: log locally and forward to
        // Sentry (initialized in main.jsx) when available.
        console.error('[ErrorBoundary]', error, info)
        const sentry = window.Sentry
        if (sentry && typeof sentry.captureException === 'function') {
            sentry.captureException(error, { contexts: { react: info } })
        }
        if (typeof this.props.onError === 'function') {
            this.props.onError(error, info)
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div role="alert" aria-live="assertive" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '60vh', padding: '40px', textAlign: 'center', color: 'var(--text-primary)',
                    background: 'var(--bg-primary)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="Warning">⚠️</div>
                    <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Something went wrong</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
                        An unexpected error occurred. Please try reloading the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 32px', borderRadius: '12px', border: 'none',
                            background: 'var(--power-500)', color: '#000', fontWeight: 600,
                            cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
