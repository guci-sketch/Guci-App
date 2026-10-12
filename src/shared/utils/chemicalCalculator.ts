/**
 * Chemical Audit Calculator: Standar SNI 2404 / 2405:2015
 * 
 * 1. SNI 2404: Pra-Konstruksi
 *    - Dosis larutan kerja: 5.0 Liter per meter persegi (m2) lantai dan parit pondasi.
 * 2. SNI 2405: Pasca-Konstruksi
 *    - Jarak lubang bor: 30 cm s.d 40 cm.
 *    - Dosis larutan kerja: 1.5 s.d 2.0 Liter per titik lubang bor, atau 5.0 Liter per meter lari (m1).
 */

export interface PreConstructionCalculation {
  areaSquareMeters: number
  standardSolutionLiters: number
  concentrateLitersNeeded: number // Konsentrat murni berdasarkan dosis ml/L
}

export interface PostConstructionCalculation {
  perimeterMeters: number
  drillHoleSpacingCm: number
  totalDrillHoles: number
  standardSolutionLiters: number
  concentrateLitersNeeded: number
}

/**
 * Kalkulasi kebutuhan larutan termitisida pra-konstruksi (SNI 2404).
 */
export function calculatePreConstructionSNI(
  areaSquareMeters: number,
  doseMlPerLiter = 2.5 // Default Premise 200 SL (2.5 ml / L air)
): PreConstructionCalculation {
  const standardSolutionLiters = areaSquareMeters * 5.0
  const concentrateLitersNeeded = (standardSolutionLiters * doseMlPerLiter) / 1000

  return {
    areaSquareMeters,
    standardSolutionLiters,
    concentrateLitersNeeded: Math.round(concentrateLitersNeeded * 100) / 100
  }
}

/**
 * Kalkulasi kebutuhan lubang bor & termitisida pasca-konstruksi (SNI 2405).
 */
export function calculatePostConstructionSNI(
  perimeterMeters: number,
  drillHoleSpacingCm = 35, // Standar rekomendasi 30-40 cm
  doseMlPerLiter = 2.5
): PostConstructionCalculation {
  const spacingMeters = drillHoleSpacingCm / 100
  const totalDrillHoles = Math.ceil(perimeterMeters / spacingMeters)
  const standardSolutionLiters = totalDrillHoles * 1.75 // Rata-rata 1.75 L per lubang
  const concentrateLitersNeeded = (standardSolutionLiters * doseMlPerLiter) / 1000

  return {
    perimeterMeters,
    drillHoleSpacingCm,
    totalDrillHoles,
    standardSolutionLiters: Math.round(standardSolutionLiters * 100) / 100,
    concentrateLitersNeeded: Math.round(concentrateLitersNeeded * 100) / 100
  }
}
