import { Lock, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEntitlements } from '../context/EntitlementsContext'
import './FeatureGate.css'

/**
 * Centralized UI gate for plan features.
 *
 * Props:
 *  - feature: feature_key from the backend catalog (e.g. 'ai_programming')
 *  - mode: 'hidden' (render nothing) | 'locked' (render a lock + upgrade CTA)
 *  - children: rendered when the user HAS the feature
 *  - fallbackTitle / fallbackDesc: optional copy for the locked state
 *
 * The backend remains the authority; this only mirrors access for UX.
 */
export default function FeatureGate({ feature, mode = 'locked', children, fallbackTitle, fallbackDesc }) {
    const { entitlements, loading, hasFeature } = useEntitlements()

    if (loading && entitlements === null) return null
    if (entitlements === null) {
        // Unauthenticated or entitlements failed to load: show the children
        // (public pages) rather than blocking content incorrectly.
        return <>{children}</>
    }

    if (hasFeature(feature)) return <>{children}</>

    if (mode === 'hidden') return null

    return (
        <div className="fg-locked">
            <div className="fg-locked-icon"><Lock size={22} /></div>
            <h4 className="fg-locked-title">{fallbackTitle || 'This feature requires an upgrade'}</h4>
            <p className="fg-locked-desc">
                {fallbackDesc || 'This feature is not available on your current plan.'}
            </p>
            <Link to="/plans" className="fg-upgrade-btn">
                <Crown size={16} /> Upgrade
            </Link>
        </div>
    )
}
