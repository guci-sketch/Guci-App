import { Shield, Home, Wind, Map, CheckSquare, Target, Sparkles, type LucideIcon } from 'lucide-react';
import { ApplicationMethod, ServiceType } from '@/entities/types';

interface ServiceTypeMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badgeClass: string;
  description: string;
}

export const SERVICE_TYPE_META: Partial<Record<ServiceType, ServiceTypeMeta>> = {
  GENERAL_PEST_CONTROL: {
    label: 'Pengendalian Umum',
    shortLabel: 'Pengendalian',
    icon: Shield,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Tindakan pengendalian hama residensial dan komersial umum.',
  },
  TERMITE_CONTROL: {
    label: 'Anti Rayap',
    shortLabel: 'Anti Rayap',
    icon: Home,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    description: 'Pengerjaan struktur bangunan pasca dan pra konstruksi.',
  },
  FUMIGATION: {
    label: 'Fumigasi',
    shortLabel: 'Fumigasi',
    icon: Wind,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Prosedur pembersihan udara tertutup/pergudangan.',
  },
  RODENT_CONTROL: {
    label: 'Kontrol Hama Tikus',
    shortLabel: 'Rodent',
    icon: Target,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Sistem pengendalian terpadu hama pengerat.',
  },
  MOSQUITO_CONTROL: {
    label: 'Kontrol Vektor Nyamuk',
    shortLabel: 'Vektor',
    icon: Map,
    badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
    description: 'Fogging spasial dan pengendalian vektor lingkungan.',
  },
  BIRD_CONTROL: {
    label: 'Kontrol Burung Liar',
    shortLabel: 'Avian',
    icon: CheckSquare,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description: 'Pemasangan jaring dan halauan struktur atap.',
  },
  BED_BUG_CONTROL: {
    label: 'Kontrol Kutu Kasur',
    shortLabel: 'Sanitasi Kamar',
    icon: Sparkles,
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    description: 'Sanitasi hospitality dan manajemen kutu bedbug.',
  },
  DISINFECTION: {
    label: 'Disinfeksi',
    shortLabel: 'Disinfeksi',
    icon: Sparkles,
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    description: 'Sterilisasi area, virus, dan patogen.',
  },
};

export const SERVICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Layanan' },
  ...Object.entries(SERVICE_TYPE_META).map(([value, meta]) => ({ value, label: meta!.label })),
];

export const APPLICATION_METHOD_LABELS: Partial<Record<ApplicationMethod, string>> = {
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
  return SERVICE_TYPE_META[type] ?? SERVICE_TYPE_META.GENERAL_PEST_CONTROL!;
}