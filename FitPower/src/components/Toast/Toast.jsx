import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import './Toast.css'

const TOAST_ICONS = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
}

export default function Toast() {
    const { toast } = useToast()
    if (!toast || !toast.show) return null

    const Icon = TOAST_ICONS[toast.type] || CheckCircle
    const ariaRole = toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'
    const ariaLive = toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite'

    return (
        <div className="toast show" role={ariaRole} aria-live={ariaLive}>
            <Icon size={20} className="toast-icon" aria-hidden="true" />
            <span className="toast-msg">{toast.msg}</span>
        </div>
    )
}
