import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '60vh', padding: '40px', textAlign: 'center', color: 'var(--text-primary)',
                    background: 'var(--bg-primary)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Something went wrong</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
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
