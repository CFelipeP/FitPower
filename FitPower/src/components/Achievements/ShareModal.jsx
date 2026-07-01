import { useState, useRef, useEffect } from 'react'
import { X, Check, Share2, Link, Download } from 'lucide-react'

export default function ShareModal({ achievement, onClose }) {
    const [copied, setCopied] = useState(false)
    const [canvasUrl, setCanvasUrl] = useState('')
    const canvasRef = useRef(null)
    const text = `I just unlocked "${achievement.name}" on FitPower! 🏆 ${achievement.description}`
    const url = window.location.origin

    const shareData = { title: 'FitPower Achievement', text, url }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const w = canvas.width
        const h = canvas.height

        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, w, h)

        const gradient = ctx.createLinearGradient(0, 0, w, h)
        gradient.addColorStop(0, '#1a1a2e')
        gradient.addColorStop(1, '#0a0a0f')
        ctx.fillStyle = gradient
        ctx.fillRect(20, 20, w - 40, h - 40)

        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 2
        ctx.strokeRect(20, 20, w - 40, h - 40)

        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('🏆', w / 2, 120)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px Arial'
        ctx.fillText(achievement.name || 'Achievement Unlocked', w / 2, 190)

        ctx.fillStyle = '#a0a0a0'
        ctx.font = '18px Arial'
        const desc = achievement.description || ''
        const words = desc.split(' ')
        let line = ''
        let y = 230
        words.forEach(word => {
            const test = line + word + ' '
            if (ctx.measureText(test).width > 360) {
                ctx.fillText(line.trim(), w / 2, y)
                line = word + ' '
                y += 26
            } else {
                line = test
            }
        })
        ctx.fillText(line.trim(), w / 2, y)

        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 14px Arial'
        ctx.fillText('FitPower', w / 2, h - 50)

        setCanvasUrl(canvas.toDataURL('image/png'))
    }, [achievement])

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                if (canvasUrl) {
                    const blob = await (await fetch(canvasUrl)).blob()
                    const file = new File([blob], 'achievement.png', { type: 'image/png' })
                    await navigator.share({ ...shareData, files: [file] })
                } else {
                    await navigator.share(shareData)
                }
                onClose()
            } catch { /* user cancelled */ }
        }
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.download = 'achievement.png'
        link.href = canvasUrl
        link.click()
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(text + ' ' + url)
            setCopied(true)
            setTimeout(() => { setCopied(false); onClose() }, 2000)
        } catch { /* clipboard not available */ }
    }

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal" onClick={e => e.stopPropagation()}>
                <button className="share-modal-close" onClick={onClose}><X size={18} /></button>
                <div className="share-modal-header">
                    <Share2 size={24} className="share-modal-icon" />
                    <h3 className="share-modal-title">Share Achievement</h3>
                </div>
                <canvas ref={canvasRef} width={500} height={400} style={{display:'none'}} />
                {canvasUrl && (
                    <div className="share-modal-preview" style={{textAlign:'center',marginBottom:16}}>
                        <img src={canvasUrl} alt="Achievement" style={{width:'100%',maxWidth:300,borderRadius:12,border:'1px solid rgba(255,255,255,.1)'}} />
                    </div>
                )}
                <p className="share-modal-text">{text}</p>
                <div className="share-modal-buttons">
                    {navigator.share && (
                        <button className="share-btn share-btn-native" onClick={handleNativeShare}>
                            <Share2 size={18} /> Share
                        </button>
                    )}
                    <button className="share-btn share-btn-download" onClick={handleDownload} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>
                        <Download size={18} /> Download
                    </button>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
                       target="_blank" rel="noopener noreferrer" className="share-btn share-btn-twitter">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Twitter
                    </a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`}
                       target="_blank" rel="noopener noreferrer" className="share-btn share-btn-facebook">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                       target="_blank" rel="noopener noreferrer" className="share-btn share-btn-linkedin">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        LinkedIn
                    </a>
                    <button className="share-btn share-btn-copy" onClick={copyLink}>
                        {copied ? <Check size={18} /> : <Link size={18} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>
        </div>
    )
}
