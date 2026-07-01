import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import './NotFound.css'

export default function NotFound() {
    return (
        <div className="not-found-page noise grid-pattern">
            <div className="not-found-content">
                <div className="not-found-code">404</div>
                <h1 className="not-found-title">Page not found</h1>
                <p className="not-found-desc">The page you're looking for doesn't exist or has been moved.</p>
                <div className="not-found-actions">
                    <Link to="/" className="not-found-btn not-found-btn-primary">
                        <Zap size={16} /> Go Home
                    </Link>
                    <Link to="/login" className="not-found-btn not-found-btn-secondary">
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    )
}
