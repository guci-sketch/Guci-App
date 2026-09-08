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
    description: 'Kecoa, semut, laba-laba, dan serangga umum lainnya.',
  },
  TERMITE_CONTROL: {
    label: 'Anti Rayap',
    shortLabel: 'Anti Rayap',
    icon: Home,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    description: 'Baiting, soil treatment, atau pengeboran & injeksi.',
  },
  FUMIGATION: {
    label: 'Fumigasi',
    shortLabel: 'Fumigasi',
    icon: Wind,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Fumigasi gudang, kontainer, atau komoditas ekspor — melibatkan gas beracun.',
  },
  RODENT_CONTROL: {
    label: 'Pengendalian Tikus',
    shortLabel: 'Tikus',
    icon: Rat,
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
    description: 'Bait station dan pengendalian tikus got/rumah.',
  },
  MOSQUITO_CONTROL: {
    label: 'Pengendalian Nyamuk',
    shortLabel: 'Nyamuk',
    icon: Sparkles,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'Fogging atau pengabutan area.',
  },
  BIRD_CONTROL: {
    label: 'Pengendalian Burung',
    shortLabel: 'Burung',
    icon: Bird,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description: 'Bird spike, netting, dan deterrent lainnya.',
  },
  BED_BUG_CONTROL: {
    label: 'Kutu Busuk',
    shortLabel: 'Kutu Busuk',
    icon: ShieldAlert,
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    description: 'Perlakuan panas atau kimia untuk kutu busuk (bed bug).',
  },
  DISINFECTION: {
    label: 'Disinfeksi Area',
    shortLabel: 'Disinfeksi',
    icon: Sparkles,
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    description: 'Penyemprotan disinfektan untuk area publik/komersial.',
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
