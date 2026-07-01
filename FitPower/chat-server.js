import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = 5180
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8088'

const clients = new Map()

function jwtSub(token) {
    try {
        return Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub)
    } catch { return null }
}

const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', clients: clients.size }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
    const params = new URL(req.url, `http://localhost:${PORT}`).searchParams
    const token = params.get('token')

    if (token) {
      ws.authToken = token
    }
    ws.userId = null
    ws.conversations = new Set()

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw)
            await handleMessage(ws, msg)
        } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido' }))
        }
    })

    ws.on('close', () => {
        for (const [userId, conns] of clients) {
            conns.delete(ws)
            if (conns.size === 0) clients.delete(userId)
        }
    })
})

async function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'auth': {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${msg.token}` },
            })
            const data = await res.json()
            if (!data.success) {
                ws.send(JSON.stringify({ type: 'error', message: 'Token inválido' }))
                return
            }
            ws.userId = data.data.id
            if (!clients.has(ws.userId)) clients.set(ws.userId, new Set())
            clients.get(ws.userId).add(ws)
            ws.send(JSON.stringify({ type: 'auth_ok', userId: ws.userId }))
            break
        }

        case 'subscribe': {
            const convId = msg.conversationId
            if (!convId) break
            ws.conversations.add(convId)
            ws.send(JSON.stringify({ type: 'subscribed', conversationId: convId }))
            break
        }

        case 'message': {
            const { conversationId, content, token } = msg
            if (!conversationId || !content || !token) break

            const res = await fetch(`${API_BASE}/api/messages/${conversationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content }),
            })
            const data = await res.json()
            if (!data.success) {
                ws.send(JSON.stringify({ type: 'error', message: data.message }))
                return
            }

            const senderId = ws.userId || jwtSub(token)

            const messageData = {
                type: 'new_message',
                id: data.data.id,
                conversationId,
                senderId,
                content,
                createdAt: data.data.createdAt || new Date().toISOString(),
            }

            for (const [, conns] of clients) {
                for (const conn of conns) {
                    if (conn.conversations.has(conversationId)) {
                        conn.send(JSON.stringify(messageData))
                    }
                }
            }
            break
        }

        case 'typing': {
            const { conversationId, isTyping } = msg
            for (const [, conns] of clients) {
                for (const conn of conns) {
                    if (conn !== ws && conn.conversations.has(conversationId)) {
                        conn.send(JSON.stringify({
                            type: 'typing',
                            conversationId,
                            userId: ws.userId,
                            isTyping,
                        }))
                    }
                }
            }
            break
        }
    }
}

server.listen(PORT, () => {
    console.log(`[ChatWS] running on ws://localhost:${PORT}`)
})
