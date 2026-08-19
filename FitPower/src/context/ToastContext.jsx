import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const timerRef = useRef(null)

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

    const showToast = useCallback((msg, type = 'success') => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setToast({ show: true, msg, type })
        timerRef.current = setTimeout(() => {
            setToast({ show: false, msg: '', type })
        }, 3000)
    }, [])

    const value = useMemo(() => ({ toast, showToast }), [toast, showToast])

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
