export default function Avatar({ name, src, size = 40, className = '', style = {} }) {
    const initials = String(name || '?')
        .split(' ')
        .filter(Boolean)
        .map(s => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    if (src) {
        return <img loading="lazy" src={src} alt={name || ''} className={className} style={{ width: size, height: size, ...style }} />
    }

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(255,214,0,.14)',
                color: 'var(--power-500, #FFD600)',
                fontWeight: 700,
                fontSize: Math.max(10, Math.round(size * 0.36)),
                flexShrink: 0,
                ...style,
            }}
        >
            {initials}
        </div>
    )
}
