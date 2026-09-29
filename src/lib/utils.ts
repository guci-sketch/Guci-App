import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export const SERVICE_LABELS: Record<string, string> = {
    pest_control: "Pest Control",
    anti_rayap: "Anti Rayap",
    spraying: "Spraying",
    fogging: "Fogging",
    baiting_tikus: "Baiting Tikus",
    injeksi: "Injeksi",
    pipanisasi: "Pipanisasi",
    baiting_system: "Baiting System",
};

export const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    administrator: "Administrator",
    admin_ops: "Admin Ops",
    marketing: "Marketing",
    teknisi: "Teknisi",
};
