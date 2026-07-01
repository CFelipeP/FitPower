import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Loader } from 'lucide-react'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const { login: authLogin } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      showToast('Google login cancelled or failed')
      navigate('/login')
      return
    }

    if (!code || !state) {
      showToast('Invalid response from Google')
      navigate('/login')
      return
    }

    fetch('/api/auth/google/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          showToast(data.message || 'Google login failed')
          navigate('/login')
          return
        }
        localStorage.setItem('token', data.data.token)
        if (data.data.refresh_token) localStorage.setItem('refresh_token', data.data.refresh_token)
        if (data.data.csrf_token) localStorage.setItem('csrf_token', data.data.csrf_token)
        if (data.data.user?.role) localStorage.setItem('role', data.data.user.role)

        window.location.href = '/client/dashboard'
      })
      .catch(() => {
        showToast('Server connection error')
        navigate('/login')
      })
  }, [searchParams, navigate, showToast, authLogin])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader size={32} className="spin" style={{ margin: '0 auto 16px' }} />
        <p>Completing Google sign-in...</p>
      </div>
    </div>
  )
}
