import { Bug, Home, Wind, Rat, Bird, ShieldAlert, Sparkles, type LucideIcon } from 'lucide-react';
import { ApplicationMethod, ServiceType } from '../types';

interface ServiceTypeMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badgeClass: string;
  description: string;
}

export const SERVICE_TYPE_META: Record<ServiceType, ServiceTypeMeta> = {
  GENERAL_PEST_CONTROL: {
    label: 'Pest Control Umum',
    shortLabel: 'Pest Control',
    icon: Bug,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Pengendalian tikus, kecoa, semut, lalat, nyamuk, dan hama umum lainnya.',
  },
  TERMITE_CONTROL: {
    label: 'Anti Rayap',
    shortLabel: 'Anti Rayap',
    icon: Home,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    description: 'Pengendalian rayap tanah, rayap kayu kering, dll.',
  },
  FUMIGATION: {
    label: 'Fumigasi',
    shortLabel: 'Fumigasi',
    icon: Wind,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Fumigasi komoditas/ruangan — melibatkan gas beracun.',
  },
};

export const SERVICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Layanan' },
  ...Object.entries(SERVICE_TYPE_META).map(([value, meta]) => ({ value, label: meta.label })),
];

export const APPLICATION_METHOD_LABELS: Record<ApplicationMethod, string> = {
  SPRAYING: 'Penyemprotan (Spraying)',
  BAITING: 'Sistem Umpan (Baiting)',
  DRILLING: 'Pengeboran & Injeksi (Drilling)',
  TRENCHING: 'Parit Kimia (Trenching)',
  FOGGING: 'Pengasapan (Fogging)',
  MISTING: 'Pengabutan (Misting)',
  DUSTING: 'Penaburan Bubuk (Dusting)',
  GEL_INJECTION: 'Gel Umpan Titik Injeksi',
};

export const APPLICATION_METHOD_OPTIONS: { value: ApplicationMethod; label: string }[] = (
  Object.entries(APPLICATION_METHOD_LABELS) as [ApplicationMethod, string][]
).map(([value, label]) => ({ value, label }));

export function getServiceTypeMeta(type: ServiceType): ServiceTypeMeta {
  return SERVICE_TYPE_META[type] ?? SERVICE_TYPE_META.GENERAL_PEST_CONTROL;
}
