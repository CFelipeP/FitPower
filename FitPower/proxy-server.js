import http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'

const PROXY_PORT = 8080
const DIST = path.resolve('./dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function proxyRequest(targetPort, req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${targetPort}`)
  const opts = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  }

  const proxy = http.request(opts, (proxyRes) => {
    const body = []
    proxyRes.on('data', c => body.push(c))
    proxyRes.on('end', () => {
      const data = Buffer.concat(body)
      const ct = proxyRes.headers['content-type'] || ''
      if (ct.includes('text') || ct.includes('json') || ct.includes('javascript') || ct.includes('xml')) {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        res.end(data.toString())
      } else {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        res.end(data)
      }
    })
  })
  proxy.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Proxy error' }))
    }
  })
  req.pipe(proxy)
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PROXY_PORT}`)

  if (url.pathname.startsWith('/api')) {
    proxyRequest(8088, req, res)
    return
  }

  // Path traversal guard: normalize and verify the resolved path stays
  // inside DIST before serving any file.
  let filePath = path.resolve(DIST, '.' + url.pathname)
  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, (err, stat) => {
    if (err || stat.isDirectory()) {
      filePath = path.join(DIST, 'index.html')
    }
    const ext = path.extname(filePath)
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      ...SECURITY_HEADERS,
    }
    if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache'
    } else if (ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    }
    res.writeHead(200, headers)
    const stream = fs.createReadStream(filePath)
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
      }
      res.end()
    })
    stream.pipe(res)
  })
})

const wsProxy = new WebSocketServer({ noServer: true })

wsProxy.on('connection', (browserWs, req) => {
  const url = new URL(req.url, `http://127.0.0.1:${PROXY_PORT}`)
  const pathname = url.pathname.replace(/^\/ws/, '')
  const targetPort = pathname === '/mediasoup' ? 5181
    : pathname === '/chat' ? 5180 : null

  if (!targetPort) {
    browserWs.close(4004, 'Unknown path')
    return
  }

  const targetWs = new WebSocket(`ws://127.0.0.1:${targetPort}${req.url}`)
  let targetOpen = false
  let queue = []

  targetWs.on('open', () => {
    targetOpen = true
    for (const d of queue) targetWs.send(d)
    queue = []
  })

  browserWs.on('message', (data) => {
    if (targetOpen) targetWs.send(data)
    else queue.push(data)
  })

  targetWs.on('message', (data) => {
    browserWs.send(data)
  })

  browserWs.on('close', () => targetWs.close())
  targetWs.on('close', () => browserWs.close())
  browserWs.on('error', () => targetWs.close())
  targetWs.on('error', () => browserWs.close())
})

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://127.0.0.1:${PROXY_PORT}`)
  const pathname = url.pathname.replace(/^\/ws/, '')
  if (pathname === '/mediasoup' || pathname === '/chat') {
    wsProxy.handleUpgrade(req, socket, head, (ws) => {
      wsProxy.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

server.listen(PROXY_PORT, () => {
  console.log(`[Proxy] http://localhost:${PROXY_PORT}`)
})
