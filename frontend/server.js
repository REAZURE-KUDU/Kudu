import express from 'express'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = process.env.PORT || 3000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. Proxy FIRST — before static files and before the catch-all
app.use('/api', createProxyMiddleware({
    target: process.env.BACKEND_URL || 'http://localhost:5000',
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
    on: {
        error: (err, req, res) => {
            console.error('Proxy error:', err.message)
            res.status(502).json({ error: 'Backend unavailable' })
        }
    }
}))

// 2. Static files second
app.use(express.static(path.join(__dirname, 'build')))

// 3. Catch-all LAST — only for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
    console.log(`Proxying /api → ${process.env.BACKEND_URL || 'http://localhost:5000'}`)
})