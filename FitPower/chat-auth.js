import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load the shared JWT secret from the API .env (dev layout: <repo>/FitPower +
// <repo>/api; flattened layout: <root>/chat-auth.js + <root>/api).
for (const candidate of [
    path.join(__dirname, '..', 'api', '.env'),
    path.join(__dirname, 'api', '.env'),
]) {
    if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate })
        break
    }
}

export const jwtSecret = process.env.JWT_SECRET || ''

function base64urlDecode(s) {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return Buffer.from(padded, 'base64')
}

// Strict HS256 JWT verification mirroring api/helpers/auth.php (verifyJWT).
// Rejects: malformed tokens, wrong signature (forged / wrong secret), alg
// 'none' or non-HS256, and expired tokens. Returns the payload or null.
export function verifyToken(token) {
    if (!jwtSecret) return null
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, signatureB64] = parts
    if (!headerB64 || !payloadB64 || !signatureB64) return null

    try {
        const header = JSON.parse(base64urlDecode(headerB64).toString())
        if (!header || header.alg !== 'HS256') return null

        const expectedSig = crypto
            .createHmac('sha256', jwtSecret)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url')

        const a = Buffer.from(expectedSig)
        const b = Buffer.from(signatureB64)
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

        const data = JSON.parse(base64urlDecode(payloadB64).toString())
        if (typeof data.sub === 'undefined') return null
        if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
        return data
    } catch {
        return null
    }
}
