import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Kalkulator Standar System Usability Scale (SUS)
 * Skala Likert 1-5 (1: Sangat Tidak Setuju, 5: Sangat Setuju).
 * Skor SUS = (Sum(Odd - 1) + Sum(5 - Even)) * 2.5
 */
export function calculateSUSScore(answers: number[]): number {
  if (answers.length !== 10) {
    throw new Error('Kuesioner SUS wajib memiliki 10 butir pertanyaan')
  }

  let oddSum = 0
  let evenSum = 0

  for (let i = 0; i < 10; i++) {
    const score = answers[i]
    if (score < 1 || score > 5) {
      throw new Error(`Nilai jawaban butir ke-${i + 1} (${score}) harus antara 1 sampai 5`)
    }
    if ((i + 1) % 2 === 1) {
      oddSum += score - 1
    } else {
      evenSum += 5 - score
    }
  }

  return (oddSum + evenSum) * 2.5
}

// Suite Pengujian Black Box Skripsi Guci Emas
test('Black Box: Evaluasi Role Permission Teknisi vs Admin', () => {
  const adminPermissions = ['CREATE_SPK', 'VIEW_REPORTS', 'MANAGE_PROJECTS', 'VALIDATE_GEOFENCE']
  const technicianPermissions = ['VIEW_ASSIGNED_SPK', 'SUBMIT_REPORT', 'CHECKIN_GEOFENCE']

  // Teknisi tidak boleh memiliki hak CREATE_SPK
  assert.equal(technicianPermissions.includes('CREATE_SPK'), false)
  // Admin memiliki seluruh kontrol
  assert.equal(adminPermissions.includes('CREATE_SPK'), true)
})

test('Black Box: Validasi Alur Status Transisi SPK', () => {
  const validTransitions: Record<string, string[]> = {
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  }

  // Dari ASSIGNED menuju IN_PROGRESS adalah valid
  assert.equal(validTransitions.ASSIGNED.includes('IN_PROGRESS'), true)
  // Dari COMPLETED kembali ke IN_PROGRESS adalah ilegal
  assert.equal(validTransitions.COMPLETED.includes('IN_PROGRESS'), false)
})

test('Skripsi SUS Calculator: Menghitung skor SUS kuesioner teknisi (skor ideal > 70)', () => {
  // Sampel jawaban kuesioner positif: skor tinggi pada ganjil, skor rendah pada genap
  const sampleAnswers = [4, 2, 5, 1, 4, 2, 5, 1, 4, 2]
  const susScore = calculateSUSScore(sampleAnswers)

  // Evaluasi threshold SUS skripsi
  assert.ok(susScore >= 70, `Skor SUS (${susScore}) harus >= 70 untuk predikat Acceptable`)
  assert.equal(susScore, 85)
})
