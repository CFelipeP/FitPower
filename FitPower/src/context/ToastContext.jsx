import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
    const [toast, setToast] = useState({ show: false, msg: '' })

    const showToast = useCallback((msg) => {
        setToast({ show: true, msg })
        setTimeout(() => setToast({ show: false, msg: '' }), 3000)
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