import { CheckCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import './Toast.css'

export default function Toast() {
    const { toast } = useToast()

    return (
        <div className={`toast ${toast.show ? 'show' : ''}`}>
            <CheckCircle size={20} className="toast-icon" />
            <span className="toast-msg">{toast.msg}</span>
        </div>
    )
}