import { RiskLevel } from '../types';

interface RiskLevelMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const META: Record<RiskLevel, RiskLevelMeta> = {
  NORMAL: { label: 'Normal', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  LOW_RISK: { label: 'Risiko Rendah', badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200', dotClass: 'bg-yellow-500' },
  REVIEW: { label: 'Perlu Ditinjau', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', dotClass: 'bg-amber-500' },
  HIGH_RISK: { label: 'Risiko Tinggi', badgeClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-600' },
  CRITICAL: { label: 'Kritis', badgeClass: 'bg-red-100 text-red-900 border-red-300', dotClass: 'bg-red-700' },
};

export function getRiskLevelMeta(level: RiskLevel): RiskLevelMeta {
  return META[level] ?? META.NORMAL;
}

export const RISK_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Level' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW_RISK', label: 'Risiko Rendah' },
  { value: 'REVIEW', label: 'Perlu Ditinjau' },
  { value: 'HIGH_RISK', label: 'Risiko Tinggi' },
  { value: 'CRITICAL', label: 'Kritis' },
];

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'READY', label: 'Siap Check-in' },
  { value: 'WORKING', label: 'Berlangsung' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'FLAGGED', label: 'Ditandai' },
  { value: 'REVIEWED', label: 'Sudah Ditinjau' },
];
