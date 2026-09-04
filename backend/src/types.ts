export type UserRole = 'ADMIN' | 'EXECUTOR';

export type WorkReportStatus = 'DRAFT' | 'READY' | 'WORKING' | 'COMPLETED' | 'FLAGGED' | 'REVIEWED';

export type RiskLevel = 'NORMAL' | 'LOW_RISK' | 'REVIEW' | 'HIGH_RISK' | 'CRITICAL';

export type PhotoType = 'CHECK_IN' | 'PROGRESS' | 'CHECK_OUT';

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
  reviewThreshold: number;
  highRiskThreshold: number;
  criticalThreshold: number;
  lowRiskThreshold: number;
}

export interface RiskEvent {
  eventType:
    | 'LATE_CHECK_IN'
    | 'OUTSIDE_RADIUS'
    | 'SHORT_DURATION'
    | 'NO_PROGRESS_PHOTO'
    | 'INSUFFICIENT_PHOTOS'
    | 'LOCATION_DRIFT';
  points: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  expectedValue?: string;
  actualValue?: string;
}

export interface RiskEvaluationInput {
  scheduledStartTime?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkInDistance?: number | null;
  checkOutDistance?: number | null;
  projectRadius: number;
  photos: { photoType: PhotoType }[];
}

export interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  events: RiskEvent[];
  isFlagged: boolean;
}
