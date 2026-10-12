import { useState } from 'react'
import { Coordinates, validateGeofence, GeofenceResult } from '@/shared/utils/geo'
import { MerlinFlowVisualizer } from '@/shared/ui/MerlinFlowVisualizer'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { AppLayout } from '@/widgets/AppLayout'
import { FULL_SIDEBAR_MENU } from '@/shared/config/navigation'
import { QuotationForm } from '@/features/quotation/QuotationForm'
import { WatermarkCamera } from '@/features/camera/WatermarkCamera'
import { CustomerReviewSignature } from '@/features/signature/CustomerReviewSignature'
import { ExecutiveDashboard } from '@/pages/dashboard/ExecutiveDashboard'
import { SPKManagementPage } from '@/pages/spk/SPKManagementPage'
import { TrackingMapPage } from '@/pages/tracking/TrackingMapPage'
import { InventoryManagementPage } from '@/pages/inventory/InventoryManagementPage'
import { WorkReportsPage } from '@/pages/reports/WorkReportsPage'
import { AnomalyAuditPage } from '@/pages/anomalies/AnomalyAuditPage'
import { UserManagementPage } from '@/pages/users/UserManagementPage'
import { offlineQueue } from '@/shared/utils/offlineQueue'
import { evaluateOperationalRisk, RiskAnomalyResult } from '@/shared/utils/riskEngine'
import { calculatePostConstructionSNI } from '@/shared/utils/chemicalCalculator'
import { UserRole } from '@/shared/utils/rbacEngine'
import { REAL_PROJECTS } from '@/shared/data/seedData'

export function App() {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('SUPERVISOR')
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  // State Proyek & GPS
  const [selectedProject, setSelectedProject] = useState(REAL_PROJECTS[0])
  const [techLat, setTechLat] = useState<string>('-6.314800')
  const [techLng, setTechLng] = useState<string>('106.716200')
  const [result, setResult] = useState<GeofenceResult | null>(null)
  const [queueCount, setQueueCount] = useState<number>(0)

  // State Audit Risiko
  const [actualLiters, setActualLiters] = useState<number>(160)
  const [perimeterM1, setPerimeterM1] = useState<number>(100)
  const [durationMins, setDurationMins] = useState<number>(45)
  const [riskEvaluation, setRiskEvaluation] = useState<RiskAnomalyResult | null>(null)

  const handleValidate = () => {
    const techCoord: Coordinates = {
      latitude: parseFloat(techLat),
      longitude: parseFloat(techLng)
    }
    const targetCoord: Coordinates = {
      latitude: selectedProject.latitude,
      longitude: selectedProject.longitude
    }
    const res = validateGeofence(techCoord, targetCoord, selectedProject.geofence_radius_meters)
    setResult(res)

    offlineQueue.enqueue('CHECK_IN', {
      projectId: selectedProject.id,
      coordinates: techCoord,
      isInside: res.isInside,
      distanceMeters: res.distanceMeters
    })
    setQueueCount(offlineQueue.getQueueLength())
  }

  const handleEvaluateRisk = () => {
    const sniCalc = calculatePostConstructionSNI(perimeterM1)
    const evaluated = evaluateOperationalRisk({
      distanceMeters: result ? result.distanceMeters : 25,
      geofenceRadiusMeters: selectedProject.geofence_radius_meters,
      actualChemicalLiters: actualLiters,
      standardChemicalLiters: sniCalc.standardSolutionLiters,
      durationMinutes: durationMins,
      areaSquareMeters: perimeterM1 * 2
    })
    setRiskEvaluation(evaluated)
  }

  const merlinStatus = !result ? 'IDLE' : result.isInside ? 'INSIDE' : 'OUTSIDE'

  return (
    <AppLayout
      currentRole={currentUserRole}
      onRoleChange={(r) => {
        setCurrentUserRole(r)
        const targetMenu = FULL_SIDEBAR_MENU.find((m) => m.id === activeTab)
        if (targetMenu && !targetMenu.allowedRoles.includes(r)) {
          setActiveTab(r === 'TEKNISI_LAPANGAN' ? 'field-execution' : 'dashboard')
        }
      }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      menuItems={FULL_SIDEBAR_MENU}
    >
      {queueCount > 0 && (
        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-[0.75rem]">
          <span className="text-indigo-950 font-medium">Antrean Offline: {queueCount} data siap sinkronisasi</span>
          <Badge variant="valid">AUTO-SYNC READY</Badge>
        </div>
      )}

      {/* 1. Dashboard Ikhtisar */}
      {activeTab === 'dashboard' && <ExecutiveDashboard />}

      {/* 2. SPK Management */}
      {activeTab === 'spk' && <SPKManagementPage />}

      {/* 3. Tracking Map */}
      {activeTab === 'tracking' && <TrackingMapPage />}

      {/* 4. Presensi Lapangan & Geofencing */}
      {activeTab === 'field-execution' && (
        <div className="space-y-3">
          <MerlinFlowVisualizer
            status={merlinStatus}
            distanceMeters={result?.distanceMeters}
            toleranceMeters={result?.toleranceMeters}
          />

          <Card title="Pilih Proyek SPK Aktif" subtitle="Pilih lokasi klien untuk pengujian geofencing">
            <div className="space-y-1.5">
              {REAL_PROJECTS.map((prj) => (
                <button
                  key={prj.id}
                  onClick={() => {
                    setSelectedProject(prj)
                    setResult(null)
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border text-[0.78rem] transition-all flex items-center justify-between ${
                    selectedProject.id === prj.id
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold">{prj.name}</div>
                    <div className="text-[0.7rem] text-slate-500">{prj.client_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.7rem] font-mono text-slate-600">{prj.geofence_radius_meters}m</div>
                    <div className="text-[0.65rem] text-slate-400">Radius</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Presensi Lapangan Teknisi" subtitle="Koordinat GPS aktual perangkat teknisi">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Latitude GPS"
                  value={techLat}
                  onChange={(e) => setTechLat(e.target.value)}
                  placeholder="-6.314800"
                />
                <Input
                  label="Longitude GPS"
                  value={techLng}
                  onChange={(e) => setTechLng(e.target.value)}
                  placeholder="106.716200"
                />
              </div>

              <Button onClick={handleValidate} className="w-full">
                Validasi Geofence Haversine
              </Button>
            </div>
          </Card>

          {result && (
            <div
              className={`p-3 rounded-lg border text-[0.78rem] space-y-1 ${
                result.isInside
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{result.isInside ? 'Presensi Valid: Di Dalam Radius' : 'Presensi Ditolak: Di Luar Radius'}</span>
                <Badge variant={result.isInside ? 'valid' : 'invalid'}>
                  {result.isInside ? 'VALID' : 'FRAUD ALERT'}
                </Badge>
              </div>
              <div>Jarak dari target: <strong>{result.distanceMeters} meter</strong></div>
              <div>Toleransi radius: <strong>{result.toleranceMeters} meter</strong></div>
              {!result.isInside && (
                <div>Selisih di luar batas: <strong>+{result.differenceMeters} meter</strong></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Kamera Watermark */}
      {activeTab === 'camera' && (
        <WatermarkCamera
          payload={{
            projectName: selectedProject.name,
            clientName: selectedProject.client_name,
            latitude: parseFloat(techLat),
            longitude: parseFloat(techLng),
            timestamp: new Date().toLocaleTimeString('id-ID')
          }}
          onCapture={(_img) => {
            offlineQueue.enqueue('SUBMIT_BAP', {
              projectId: selectedProject.id,
              hasPhoto: true,
              timestamp: new Date().toISOString()
            })
            setQueueCount(offlineQueue.getQueueLength())
          }}
        />
      )}

      {/* 6. Quotation */}
      {activeTab === 'quotation' && <QuotationForm />}

      {/* 7. Inventory */}
      {activeTab === 'inventory' && <InventoryManagementPage />}

      {/* 8. Reports & BAP Signature */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <CustomerReviewSignature
            spkNumber="SPK-GEP-202610-001"
            clientName={selectedProject.client_name}
            onComplete={(bap) => {
              offlineQueue.enqueue('SUBMIT_BAP', {
                bapNumber: bap.bapNumber,
                clientRating: bap.clientRating,
                verificationHash: bap.verificationHash
              })
              setQueueCount(offlineQueue.getQueueLength())
            }}
          />
          <WorkReportsPage />
        </div>
      )}

      {/* 9. Anomalies Audit */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <Card title="Simulasi Pengujian Risk Engine" subtitle="Evaluasi kepatuhan SNI 2405 & rasionalitas durasi">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Panjang Perimeter (m1)"
                  type="number"
                  value={perimeterM1}
                  onChange={(e) => setPerimeterM1(Number(e.target.value))}
                />
                <Input
                  label="Aktual Larutan (L)"
                  type="number"
                  value={actualLiters}
                  onChange={(e) => setActualLiters(Number(e.target.value))}
                />
              </div>

              <Input
                label="Durasi Pengerjaan (Menit)"
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
              />

              <Button onClick={handleEvaluateRisk} className="w-full">
                Jalankan Audit Anomali Risiko
              </Button>

              {riskEvaluation && (
                <div
                  className={`p-3 rounded-lg border text-[0.78rem] space-y-1.5 ${
                    riskEvaluation.riskLevel === 'LOW'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Skor Risiko: {riskEvaluation.riskScore}/100</span>
                    <Badge variant={riskEvaluation.riskLevel === 'LOW' ? 'valid' : 'invalid'}>
                      {riskEvaluation.riskLevel}
                    </Badge>
                  </div>
                  {riskEvaluation.anomalies.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-0.5 text-[0.72rem]">
                      {riskEvaluation.anomalies.map((anom, idx) => (
                        <li key={idx}>{anom}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[0.72rem] text-emerald-700">✓ Operasi memenuhi seluruh standar SNI & kepatuhan radius.</div>
                  )}
                </div>
              )}
            </div>
          </Card>
          <AnomalyAuditPage />
        </div>
      )}

      {/* 10. User Management */}
      {activeTab === 'users' && <UserManagementPage />}
    </AppLayout>
  )
}
