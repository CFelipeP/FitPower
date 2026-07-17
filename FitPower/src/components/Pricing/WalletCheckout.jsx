import { useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

let instanceCounter = 0

export default function WalletCheckout({ amount, description, planId, billing, onSuccess }) {
    const { showToast } = useToast()
    const id = instanceCounter++

    useEffect(() => {
        const s = document.createElement('script')
        s.src = 'http://192.168.3.27:8000/api/v1/widget/checkout.js'
        s.setAttribute('data-vw-widget', 'true')
        s.setAttribute('data-client-id', 'pk_sandbox_aCbf6n7uMkdfH2Ej')
        s.setAttribute('data-secret-key', 'sk_live_yUYtlkoLwQLR')
        s.setAttribute('data-amount-id', `vw_monto_${id}`)
        s.setAttribute('data-desc-id', `vw_desc_${id}`)
        s.async = true
        document.body.appendChild(s)

        window.handleWalletPayment = async (transactionId) => {
            try {
                const res = await apiFetch('/wallet/create-subscription', {
                    method: 'POST',
                    body: JSON.stringify({
                        planId,
                        billing,
                        transactionId,
                    }),
                })
                if (res?.subscriptionId) {
                    showToast('Subscription activated!')
                    if (onSuccess) onSuccess(res)
                } else {
                    showToast('Error activating subscription')
                }
            } catch {
                showToast('Payment recorded but subscription failed — contact support')
            }
        }

        return () => {
            if (s.parentNode) s.parentNode.removeChild(s)
            delete window.handleWalletPayment
        }
    }, [id, planId, billing, onSuccess, showToast])

    return (
        <div>
            <span id={`vw_monto_${id}`} style={{ display: 'none' }}>{amount}</span>
            <span id={`vw_desc_${id}`} style={{ display: 'none' }}>{description}</span>
            <div id={`virtual-wallet-checkout-${id}`} style={{ textAlign: 'center', marginTop: 20 }} />
        </div>
    )
}
