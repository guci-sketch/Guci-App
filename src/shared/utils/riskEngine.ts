/**
 * Risk & Anomaly Evaluation Engine
 * Mendeteksi anomali kunjungan lapangan teknisi:
 * 1. Geofence Breach (Jarak > toleransi radius).
 * 2. Chemical Dosage Deviation (Deviasi dosis larutan > 20% standar SNI).
 * 3. Execution Duration Anomaly (Pengerjaan area luas dalam durasi terlalu singkat).
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RiskEvaluationInput {
  distanceMeters: number
  geofenceRadiusMeters: number
  actualChemicalLiters: number
  standardChemicalLiters: number
  durationMinutes: number
  areaSquareMeters: number
}

export interface RiskAnomalyResult {
  riskScore: number // Skala 0 - 100
  riskLevel: RiskLevel
  anomalies: string[]
  isFlaggedForReview: boolean
}

export function evaluateOperationalRisk(input: RiskEvaluationInput): RiskAnomalyResult {
  const anomalies: string[] = []
  let score = 0

  // 1. Evaluasi Jarak Geofence
  if (input.distanceMeters > input.geofenceRadiusMeters) {
    const excessMeters = input.distanceMeters - input.geofenceRadiusMeters
    if (excessMeters > 500) {
      score += 45
      anomalies.push(`CRITICAL: Jarak presensi ${input.distanceMeters}m berada jauh di luar lokasi (+${excessMeters}m).`)
    } else {
      score += 25
      anomalies.push(`HIGH: Presensi di luar radius toleransi (+${excessMeters}m).`)
    }
  }

  // 2. Evaluasi Deviasi Bahan Kimia SNI
  if (input.standardChemicalLiters > 0) {
    const ratio = input.actualChemicalLiters / input.standardChemicalLiters
    const deviationPercent = Math.abs(ratio - 1) * 100

    if (deviationPercent > 20) {
      if (ratio < 0.8) {
        score += 30
        anomalies.push(`HIGH: Penggunaan bahan kimia under-dosing (-${Math.round(deviationPercent)}% dari standar SNI).`)
      } else {
        score += 20
        anomalies.push(`MEDIUM: Pemborosan bahan kimia over-dosing (+${Math.round(deviationPercent)}% dari standar SNI).`)
      }
    }
  }

  // 3. Evaluasi Durasi Pengerjaan
  if (input.areaSquareMeters >= 100 && input.durationMinutes < 15) {
    score += 25
    anomalies.push(`HIGH: Durasi pengerjaan ${input.durationMinutes} menit terlalu cepat untuk luasan ${input.areaSquareMeters} m2.`)
  }

  let riskLevel: RiskLevel = 'LOW'
  if (score >= 60) riskLevel = 'CRITICAL'
  else if (score >= 40) riskLevel = 'HIGH'
  else if (score >= 20) riskLevel = 'MEDIUM'

  return {
    riskScore: Math.min(100, score),
    riskLevel,
    anomalies,
    isFlaggedForReview: score >= 20
  }
}
