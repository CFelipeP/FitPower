import { useState, useEffect } from 'react'

export function Counter({ target, visible }) {
    const [val, setVal] = useState(0)
    useEffect(() => {
        if (!visible) return
        const dur = 1500
        const start = performance.now()
        let raf
        const fn = (now) => {
            const p = Math.min((now - start) / dur, 1)
            const e = 1 - Math.pow(1 - p, 3)
            setVal(Math.floor(e * target))
            if (p < 1) raf = requestAnimationFrame(fn)
            else setVal(target)
        }
        raf = requestAnimationFrame(fn)
        return () => cancelAnimationFrame(raf)
    }, [visible, target])
    return val
}
