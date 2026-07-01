import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, loading, role } = useAuth()

    if (loading) {
        return <div className="page-loader" />
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to={`/${role || 'client'}/dashboard`} replace />
    }

    return children
}
