import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

export default function PayPalSubscribeButton({ planId, billing, onSuccess, onError }) {
    const { showToast } = useToast()
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [paypalClientId, setPaypalClientId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showButtons, setShowButtons] = useState(false)

    function initPayPal() {
        if (!isAuthenticated) {
            navigate('/register')
            return
        }
        setLoading(true)
        setShowButtons(true)
        if (paypalClientId) {
            setLoading(false)
            return
        }
        apiFetch('/paypal/config')
            .then(data => {
                setPaypalClientId(data.client_id || '')
            })
            .catch(() => {
                showToast('PayPal not available')
                setShowButtons(false)
            })
            .finally(() => setLoading(false))
    }

    async function createOrder() {
        const data = await apiFetch('/paypal/create-order', {
            method: 'POST',
            body: JSON.stringify({ plan_id: planId, billing }),
        })
        if (!data.orderID) {
            throw new Error('Could not create PayPal order')
        }
        return data.orderID
    }

    async function onApprove(orderData) {
        try {
            await apiFetch('/paypal/capture-order', {
                method: 'POST',
                body: JSON.stringify({
                    orderID: orderData.orderID,
                    plan_id: planId,
                    billing,
                }),
            })
            if (onSuccess) onSuccess()
            showToast('Payment successful!')
        } catch (err) {
            showToast(err.message || 'Payment capture failed')
            if (onError) onError(err)
        }
    }

    if (!showButtons) {
        return (
            <button
                type="button"
                className="paypal-init-btn"
                onClick={initPayPal}
                disabled={loading}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901A.641.641 0 0 1 5.577.334h6.796c3.25 0 5.501 1.42 6.317 4.323.11.388.17.775.202 1.15.032.374.032.735 0 1.083v.073a5.99 5.99 0 0 1-.944 2.626c-.37.508-.807.97-1.3 1.375a6.66 6.66 0 0 1-1.728.975 7.5 7.5 0 0 1-2.127.44H8.41a.867.867 0 0 0-.856.726l-.478 3.03z" fill="#009cde"/>
                    <path d="M17.5 9.29c.353.05.7.14 1.037.266l.242.092a5.17 5.17 0 0 1 1.65.998c.419.374.79.79 1.109 1.238.41.59.68 1.27.776 1.984.118.88.02 1.776-.285 2.608a6.23 6.23 0 0 1-1.422 2.294c-.556.578-1.227 1.03-1.967 1.322-.676.267-1.4.403-2.129.4h-6.92a.867.867 0 0 0-.856.725l-.463 2.94a.641.641 0 0 1-.633.74H4.914a.641.641 0 0 1-.633-.74L7.385 8.424a.641.641 0 0 1 .633-.567h4.808c.76 0 1.505.082 2.221.243.482.108.96.26 1.425.452.317.13.628.28.93.45.033.02.065.04.098.06z" fill="#003087"/>
                    <path d="M17.906 6.827c-.404.167-.832.26-1.266.278H8.407a.867.867 0 0 0-.856.725l-.478 3.03h2.114a.867.867 0 0 1 .856-.726h2.657c3.25 0 5.501-1.42 6.317-4.323a6.2 6.2 0 0 0-1.11 1.016z" fill="#012169"/>
                </svg>
                Pay with PayPal
            </button>
        )
    }

    if (!paypalClientId) {
        return (
            <div className="paypal-loading">
                <span className="spinner-sm" /> Loading PayPal...
            </div>
        )
    }

    return (
        <div className="paypal-buttons-wrapper">
            <PayPalScriptProvider options={{
                clientId: paypalClientId,
                currency: 'USD',
                intent: 'capture',
            }}>
                <PayPalButtons
                    style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'paypal' }}
                    createOrder={createOrder}
                    onApprove={(data) => onApprove(data)}
                    onCancel={() => setShowButtons(false)}
                    onError={(err) => {
                        showToast('PayPal error: ' + (err?.message || 'unknown'))
                        setShowButtons(false)
                    }}
                />
            </PayPalScriptProvider>
        </div>
    )
}
