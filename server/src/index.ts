import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import newsRoutes from './routes/news'
import { CONFIG } from './config'

dotenv.config()

const app = express()
const PORT = CONFIG.PORT

// CORS configuration
app.use(
  cors({
    origin: CONFIG.CLIENT_URL,
    credentials: true,
  }),
)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'WORLDVIEW API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// API routes
app.use('/api', newsRoutes)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  })
})

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  })
})

const server = app.listen(PORT, () => {
  console.log(`WORLDVIEW API server running on http://localhost:${PORT}`)
  console.log(`Environment: ${CONFIG.NODE_ENV}`)
  console.log(`GDELT endpoint: ${CONFIG.GDALT_DOC_API}`)
})

export default server
