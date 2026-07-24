import { useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

const VW_SERVER = 'http://192.168.3.27:8000'
const VW_PROXY = '/vw'

let instanceCounter = 0

function setupVWProxy() {
    const origFetch = window.fetch
    window.fetch = function (url, opts) {
        if (typeof url === 'string' && url.startsWith(VW_SERVER)) {
            url = url.replace(VW_SERVER, VW_PROXY)
        }
        return origFetch.call(this, url, opts)
    }

    const origOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (typeof url === 'string' && url.startsWith(VW_SERVER)) {
            url = url.replace(VW_SERVER, VW_PROXY)
        }
        return origOpen.call(this, method, url, ...rest)
    }

    return () => {
        window.fetch = origFetch
        XMLHttpRequest.prototype.open = origOpen
    }
}

export default function WalletCheckout({ amount, description, planId, billing, onSuccess }) {
    const { showToast } = useToast()
    const id = instanceCounter++

    useEffect(() => {
        const restore = setupVWProxy()

        const s = document.createElement('script')
        s.src = `${VW_PROXY}/api/v1/widget/checkout.js`
        s.setAttribute('data-vw-widget', 'true')
        s.setAttribute('data-client-id', 'pk_sandbox_U3W3VwVyr98wsEF9')
        s.setAttribute('data-secret-key', 'sk_live_FIS1yAqU5ap6')
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
            restore()
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
