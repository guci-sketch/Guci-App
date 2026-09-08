import { query } from '../../db/pool.js';
import { RiskConfig } from '../../types.js';
import { DEFAULT_RISK_CONFIG } from './riskEngine.js';

interface RiskConfigRow {
  late_checkin_threshold_minutes: number;
  late_checkin_points: number;
  outside_radius_points: number;
  short_duration_critical_minutes: number;
  short_duration_critical_points: number;
  short_duration_warning_minutes: number;
  short_duration_warning_points: number;
  min_total_photos: number;
  min_total_photos_points: number;
  require_progress_photo: boolean;
  no_progress_photo_points: number;
  location_drift_threshold_meters: number;
  location_drift_points: number;
  missing_treatment_record_points: number;
  fumigation_missing_aeration_points: number;
  review_threshold: number;
  high_risk_threshold: number;
  critical_threshold: number;
  low_risk_threshold: number;
}

function rowToConfig(row: RiskConfigRow): RiskConfig {
  return {
    lateCheckinThresholdMinutes: row.late_checkin_threshold_minutes,
    lateCheckinPoints: row.late_checkin_points,
    outsideRadiusPoints: row.outside_radius_points,
    shortDurationCriticalMinutes: row.short_duration_critical_minutes,
    shortDurationCriticalPoints: row.short_duration_critical_points,
    shortDurationWarningMinutes: row.short_duration_warning_minutes,
    shortDurationWarningPoints: row.short_duration_warning_points,
    minTotalPhotos: row.min_total_photos,
    minTotalPhotosPoints: row.min_total_photos_points,
    requireProgressPhoto: row.require_progress_photo,
    noProgressPhotoPoints: row.no_progress_photo_points,
    locationDriftThresholdMeters: row.location_drift_threshold_meters,
    locationDriftPoints: row.location_drift_points,
    missingTreatmentRecordPoints: row.missing_treatment_record_points,
    fumigationMissingAerationPoints: row.fumigation_missing_aeration_points,
    reviewThreshold: row.review_threshold,
    highRiskThreshold: row.high_risk_threshold,
    criticalThreshold: row.critical_threshold,
    lowRiskThreshold: row.low_risk_threshold,
  };
}

export async function getRiskConfig(): Promise<RiskConfig> {
  const rows = await query<RiskConfigRow>('select * from risk_config where id = 1');
  if (rows.length === 0) return DEFAULT_RISK_CONFIG;
  return rowToConfig(rows[0]);
}

export async function updateRiskConfig(
  partial: Partial<RiskConfig>,
  updatedBy: string
): Promise<RiskConfig> {
  const current = await getRiskConfig();
  const merged: RiskConfig = { ...current, ...partial };

  const rows = await query<RiskConfigRow>(
    `update risk_config set
      late_checkin_threshold_minutes = $1,
      late_checkin_points = $2,
      outside_radius_points = $3,
      short_duration_critical_minutes = $4,
      short_duration_critical_points = $5,
      short_duration_warning_minutes = $6,
      short_duration_warning_points = $7,
      min_total_photos = $8,
      min_total_photos_points = $9,
      require_progress_photo = $10,
      no_progress_photo_points = $11,
      location_drift_threshold_meters = $12,
      location_drift_points = $13,
      missing_treatment_record_points = $14,
      fumigation_missing_aeration_points = $15,
      review_threshold = $16,
      high_risk_threshold = $17,
      critical_threshold = $18,
      low_risk_threshold = $19,
      updated_by = $20,
      updated_at = now()
     where id = 1
     returning *`,
    [
      merged.lateCheckinThresholdMinutes,
      merged.lateCheckinPoints,
      merged.outsideRadiusPoints,
      merged.shortDurationCriticalMinutes,
      merged.shortDurationCriticalPoints,
      merged.shortDurationWarningMinutes,
      merged.shortDurationWarningPoints,
      merged.minTotalPhotos,
      merged.minTotalPhotosPoints,
      merged.requireProgressPhoto,
      merged.noProgressPhotoPoints,
      merged.locationDriftThresholdMeters,
      merged.locationDriftPoints,
      merged.missingTreatmentRecordPoints,
      merged.fumigationMissingAerationPoints,
      merged.reviewThreshold,
      merged.highRiskThreshold,
      merged.criticalThreshold,
      merged.lowRiskThreshold,
      updatedBy,
    ]
  );
  return rowToConfig(rows[0]);
}
