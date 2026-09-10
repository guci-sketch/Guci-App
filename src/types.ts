/**
 * FIELDWORK — Types & Data Contracts
 * Mirrors the JSON shapes returned by the Express API (see backend/src/types.ts
 * and backend/src/modules/*\/reportMapper.ts). Kept camelCase end-to-end.
 */

export type UserRole = 'ADMIN' | 'EXECUTOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nip?: string | null;
}

export type WorkReportStatus = 'DRAFT' | 'READY' | 'WORKING' | 'COMPLETED' | 'FLAGGED' | 'REVIEWED';

export type RiskLevel = 'NORMAL' | 'LOW_RISK' | 'REVIEW' | 'HIGH_RISK' | 'CRITICAL';

export type PhotoType = 'CHECK_IN' | 'PROGRESS' | 'CHECK_OUT';

export type PhotoTag = 'BEFORE' | 'AFTER' | null;

/** Pest control service taxonomy. */
export type ServiceType =
  | 'GENERAL_PEST_CONTROL'
  | 'TERMITE_CONTROL'
  | 'FUMIGATION';

export type ApplicationMethod =
  | 'SPRAYING'
  | 'BAITING'
  | 'DRILLING'
  | 'TRENCHING'
  | 'FOGGING'
  | 'MISTING'
  | 'DUSTING'
  | 'GEL_INJECTION';

export type ContractType = 'ONE_TIME' | 'RECURRING';

export interface TreatmentRecord {
  applicationMethod: ApplicationMethod;
  chemicalName: string;
  activeIngredient?: string | null;
  dosage: string;
  treatmentAreaSqm?: number | null;
  drillingPointsCount?: number | null;
  fumigantType?: string | null;
  gasConcentrationPpm?: number | null;
  sealingStartedAt?: string | null;
  aerationCompletedAt?: string | null;
  safetyNotes?: string | null;
  technicianNotes?: string | null;
}

export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  workDate: string;
  workType: string;
  serviceType: ServiceType;
  pestTarget?: string | null;
  targetPests: string[];
  buildingAreaSqm?: number | null;
  contractType: ContractType;
  warrantyMonths: number;
  nextServiceDate?: string | null;
  scheduledStartTime: string;
  notes?: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  lockedAt?: string | null;
}

export interface DocumentationPhoto {
  id: string;
  photoType: PhotoType;
  photoTag?: PhotoTag;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceToProject: number;
  isWithinRadius: boolean;
  capturedAt: string;
  metadata: { projectName?: string; executorName?: string; caption?: string | null };
  purgedAt?: string | null; // set once the file (not the record) has been deleted by retention
  url: string; // e.g. "/photos/{id}/file" — fetch via AuthedImage, never a bare <img src>
}

export interface RiskEvent {
  id: string;
  eventType:
    | 'LATE_CHECK_IN'
    | 'OUTSIDE_RADIUS'
    | 'SHORT_DURATION'
    | 'NO_PROGRESS_PHOTO'
    | 'INSUFFICIENT_PHOTOS'
    | 'LOCATION_DRIFT'
    | 'MISSING_TREATMENT_RECORD'
    | 'FUMIGATION_SAFETY_INCOMPLETE';
  points: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  expectedValue?: string | null;
  actualValue?: string | null;
  createdAt: string;
}

export interface WorkReport {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  projectAddress: string;
  projectLatitude: number;
  projectLongitude: number;
  projectRadius: number;
  scheduledStartTime: string;
  serviceType: ServiceType;
  pestTarget?: string | null;
  targetPests: string[];
  buildingAreaSqm?: number | null;
  contractType: ContractType;
  warrantyMonths: number;
  nextServiceDate?: string | null;

  executorId: string;
  executorName: string;
  executorEmail: string;

  status: WorkReportStatus;

  checkInAt?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAccuracy?: number | null;
  checkInDistance?: number | null;
  checkInValid?: boolean | null;

  checkOutAt?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAccuracy?: number | null;
  checkOutDistance?: number | null;
  checkOutValid?: boolean | null;

  durationSeconds?: number | null;

  riskScore: number;
  riskLevel: RiskLevel;
  riskEvents: RiskEvent[];
  treatmentRecord: TreatmentRecord | null;

  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;

  customerName?: string | null;
  customerPhone?: string | null;
  customerFeedback?: string | null;
  customerSignature?: string | null;

  notes?: string | null;
  photos: DocumentationPhoto[];

  createdAt: string;
  updatedAt: string;
}

/** Lighter row shape used by the admin report list/table (no photos/events). */
export interface WorkReportListItem {
  id: string;
  status: WorkReportStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  durationSeconds: number | null;
  riskScore: number;
  riskLevel: RiskLevel;
  checkInValid: boolean | null;
  checkOutValid: boolean | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  createdAt: string;
  project: { id: string; name: string; clientName: string; address: string; serviceType: ServiceType; pestTarget: string | null; targetPests?: string[] };
  executor: { id: string; name: string };
  treatmentSummary: { applicationMethod: ApplicationMethod; chemicalName: string; dosage: string } | null;
}

export interface AuditLogEntry {
  id: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string;
  createdAt: string;
}

export interface KPIStats {
  totalJobs: number;
  completedJobs: number;
  workingJobs: number;
  flaggedJobs: number;
  highRiskCount: number;
  avgDurationMinutes: number;
  avgRiskScore: number;
}

export interface ExecutorStats {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  phone: string | null;
  isActive: boolean;
  totalJobs: number;
  completedJobs: number;
  highRiskJobs: number;
  avgDurationMinutes: number;
}

export interface RiskConfig {
  lateCheckinThresholdMinutes: number;
  lateCheckinPoints: number;
  outsideRadiusPoints: number;
  shortDurationCriticalMinutes: number;
  shortDurationCriticalPoints: number;
  shortDurationWarningMinutes: number;
  shortDurationWarningPoints: number;
  minTotalPhotos: number;
  minTotalPhotosPoints: number;
  requireProgressPhoto: boolean;
  noProgressPhotoPoints: number;
  locationDriftThresholdMeters: number;
  locationDriftPoints: number;
  missingTreatmentRecordPoints: number;
  fumigationMissingAerationPoints: number;
  reviewThreshold: number;
  highRiskThreshold: number;
  criticalThreshold: number;
  lowRiskThreshold: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  timeStart?: string;
  timeEnd?: string;
  executorId: string; // 'ALL' or user id
  projectId: string; // 'ALL' or project id
  riskLevel: string; // 'ALL' or RiskLevel
  status: string; // 'ALL' or WorkReportStatus
  serviceType: string; // 'ALL' or ServiceType
  search: string;
}

export const DEFAULT_FILTERS: ReportFilters = {
  executorId: 'ALL',
  projectId: 'ALL',
  riskLevel: 'ALL',
  status: 'ALL',
  serviceType: 'ALL',
  search: '',
};
