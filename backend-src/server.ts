import express, { Request, Response, NextFunction } from 'express'
import { validateGeofence } from './utils/geo.ts'
import { quotationRouter } from './modules/quotation/quotationRoutes.ts'

export const app = express()
app.use(express.json())

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'FieldWork Fixed API', timestamp: new Date().toISOString() })
})

// Geofence Validation API (Evaluasi Haversine Lapangan)
app.post('/api/geofence/validate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { technicianCoord, targetCoord, toleranceMeters } = req.body
    if (!technicianCoord || !targetCoord) {
      res.status(400).json({ error: 'technicianCoord dan targetCoord wajib disediakan' })
      return
    }

    const result = validateGeofence(
      technicianCoord,
      targetCoord,
      toleranceMeters !== undefined ? Number(toleranceMeters) : 100
    )

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// Quotation & SPK Routes
app.use('/api/quotations', quotationRouter)

// Central Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err.message)
  res.status(500).json({ error: 'Internal Server Error', message: err.message })
})

const PORT = process.env.PORT || 4000
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
}
