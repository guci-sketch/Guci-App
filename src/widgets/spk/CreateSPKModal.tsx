import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2, Search } from 'lucide-react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from '@/shared/lib/firebase';
import { createSPK } from '@/shared/api/spkService';
import { createProject } from '@/shared/api/projects';
import { geocodeAddress } from '@/shared/utils/geocoding';
import { warrantyToTotalMonths } from '@/shared/lib/warrantyPricingEngine';
import { formatRupiah, cn, formatDate as fmt } from '@/shared/lib/utils';
import type { Quotation, AppUser } from '@/entities/types';

const spkSchema = z.object({
    quotationId: z.string().min(1, "Pilih salah satu pelanggan dari daftar."),
    technicianId: z.string().min(1, "Pilih teknisi yang akan bertugas."),
    scheduleDate: z.string().min(1, "Tanggal pengerjaan wajib diisi."),
    lokasi: z.string().optional(),
    notes: z.string().optional()
});

type SpkFormValues = z.infer<typeof spkSchema>;

const AR_STAGE_PRESETS = [
    { id: 'aplikasi_utama', label: 'Aplikasi Utama / Pengeboran & Injeksi', targetMonth: 0 },
    { id: 'kontrol_1', label: 'Kontrol I (1 Bulan Pasca-Aplikasi)', targetMonth: 1 },
    { id: 'kontrol_2', label: 'Kontrol II (3 Bulan Pasca-Aplikasi)', targetMonth: 3 },
    { id: 'kontrol_3', label: 'Kontrol III (6 Bulan Pasca-Aplikasi)', targetMonth: 6 },
    { id: 'kontrol_tahunan', label: 'Kontrol Rutin Garansi Tahunan', targetMonth: 12 },
    { id: 'emergency', label: 'Penanganan Komplain / Darurat', targetMonth: 0 },
];

export function CreateSPKModal({
    companyId,
    user,
    preSelectedQuotationId,
    onClose,
    onCreated,
}: {
    companyId: string;
    user: AppUser;
    preSelectedQuotationId?: string;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [teknisis, setTeknisis] = useState<AppUser[]>([]);
    const [existingSpkCounts, setExistingSpkCounts] = useState<Record<string, number>>({});
    const [loadingData, setLoadingData] = useState(true);
    const [quoSearch, setQuoSearch] = useState("");
    const [serverError, setServerError] = useState("");

    // State Tahap Kunjungan Khusus
    const [customStageLabel, setCustomStageLabel] = useState("");
    const [selectedArStage, setSelectedArStage] = useState(AR_STAGE_PRESETS[0].id);
    const [pcoVisitType, setPcoVisitType] = useState<"ROUTINE" | "EMERGENCY">("ROUTINE");

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<SpkFormValues>({
        resolver: zodResolver(spkSchema),
        defaultValues: {
            quotationId: preSelectedQuotationId || "",
            technicianId: "",
            scheduleDate: new Date().toISOString().split("T")[0],
            lokasi: "",
            notes: ""
        }
    });

    const quotationId = watch('quotationId');
    const technicianId = watch('technicianId');
    const selectedQuo = useMemo(() => quotations.find(q => q.id === quotationId), [quotations, quotationId]);

    useEffect(() => {
        const load = async () => {
            setLoadingData(true);
            try {
                const [quoSnap, spkSnap, userSnap] = await Promise.all([
                    getDocs(query(
                        collection(db, "quotations"),
                        where("companyId", "==", companyId),
                    )),
                    getDocs(query(
                        collection(db, "spk"),
                        where("companyId", "==", companyId),
                    )),
                    getDocs(query(
                        collection(db, "users"),
                        where("companyId", "==", companyId),
                        where("role", "==", "TEKNISI_LAPANGAN"),
                        where("isActive", "==", true),
                    )),
                ]);

                // Hitung riwayat SPK yang sudah pernah dibuat per quotation / pelanggan
                const countMap: Record<string, number> = {};
                spkSnap.docs.forEach(d => {
                    const data = d.data();
                    const qId = data.quotationId as string;
                    if (qId) {
                        countMap[qId] = (countMap[qId] || 0) + 1;
                    }
                    const custName = (data.customerName as string || "").trim().toLowerCase();
                    if (custName) {
                        countMap[custName] = (countMap[custName] || 0) + 1;
                    }
                });
                setExistingSpkCounts(countMap);

                // Ambil seluruh penawaran yang sudah berstatus sah/deal (Master Pelanggan)
                // Klien dapat dipilih berkali-kali tanpa diblokir
                const quoList = quoSnap.docs
                    .map(d => {
                        const data = d.data() as Record<string, unknown>;
                        return {
                            id: d.id,
                            noSurat: data.noSurat,
                            kepadaNama: data.kepadaNama,
                            perihal: data.perihal,
                            total: data.total,
                            jenisLayanan: data.jenisLayanan,
                            kategori: data.kategori,
                            kepadaAlamatLines: data.kepadaAlamatLines ?? [],
                            lokasiPekerjaan: data.lokasiPekerjaan,
                            objekPekerjaan: data.objekPekerjaan,
                            garansiTahun: data.garansiTahun,
                            garansiNilai: data.garansiNilai,
                            garansiUnit: data.garansiUnit,
                            companyId: data.companyId,
                            tanggal: (data.tanggal as Timestamp).toDate(),
                            status: data.status,
                        } as unknown as Quotation;
                    })
                    .filter(q => q.status === "approved" || q.status === "deal" || q.status === "sent_to_client");

                const tekList = userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));

                setQuotations(quoList);
                setTeknisis(tekList);

                if (preSelectedQuotationId) {
                    const match = quoList.find(q => q.id === preSelectedQuotationId);
                    if (match) {
                        setValue('quotationId', match.id);
                        setValue('lokasi', match.lokasiPekerjaan || (match.kepadaAlamatLines ?? []).join(", "));
                    }
                }
            } catch (err) {
                console.error("Gagal memuat data pelanggan untuk SPK:", err);
            } finally {
                setLoadingData(false);
            }
        };
        load();
    }, [companyId, preSelectedQuotationId, setValue]);

    // Riwayat SPK untuk quotation yang sedang dipilih
    const previousSpkCount = useMemo(() => {
        if (!selectedQuo) return 0;
        return existingSpkCounts[selectedQuo.id] || existingSpkCounts[selectedQuo.kepadaNama.trim().toLowerCase()] || 0;
    }, [selectedQuo, existingSpkCounts]);

    const nextVisitNumber = previousSpkCount + 1;
    const isAR = selectedQuo?.kategori === "AR";

    // Auto-setup label tahap kunjungan
    useEffect(() => {
        if (!selectedQuo) return;
        if (isAR) {
            const preset = AR_STAGE_PRESETS.find(p => p.id === selectedArStage);
            setCustomStageLabel(preset?.label || `Kontrol Kunjungan ke-${nextVisitNumber}`);
        } else {
            if (pcoVisitType === "EMERGENCY") {
                setCustomStageLabel(`Panggilan Darurat / Komplain Hama (Kunjungan ke-${nextVisitNumber})`);
            } else {
                setCustomStageLabel(`Kunjungan Rutin ke-${nextVisitNumber} dari 12 (Kontrak Tahunan PCO)`);
            }
        }
    }, [selectedQuo, isAR, selectedArStage, pcoVisitType, nextVisitNumber]);

    const filteredQuos = useMemo(() => {
        if (!quoSearch.trim()) return quotations;
        const s = quoSearch.toLowerCase();
        return quotations.filter(q =>
            q.noSurat.toLowerCase().includes(s) ||
            q.kepadaNama.toLowerCase().includes(s) ||
            (q.perihal || "").toLowerCase().includes(s)
        );
    }, [quotations, quoSearch]);

    const onSubmit = async (data: SpkFormValues) => {
        setServerError("");
        const teknisi = teknisis.find(t => t.uid === data.technicianId);
        if (!selectedQuo || !teknisi) return;

        const alamatLengkap = data.lokasi?.trim() || selectedQuo.lokasiPekerjaan || (selectedQuo.kepadaAlamatLines ?? []).join(", ");
        const svcType = isAR ? "TERMITE_CONTROL" : "GENERAL_PEST_CONTROL";
        const warrantyMonths = warrantyToTotalMonths(
            selectedQuo.garansiNilai ?? selectedQuo.garansiTahun ?? 0,
            selectedQuo.garansiUnit ?? "tahun"
        );

        const totalTarget = isAR ? 5 : 12;

        try {
            await createSPK({
                quotationId: selectedQuo.id,
                quotationNoSurat: selectedQuo.noSurat,
                customerName: selectedQuo.kepadaNama,
                technicianId: data.technicianId,
                technicianName: teknisi.name,
                scheduleDate: new Date(data.scheduleDate),
                serviceType: svcType,
                perihal: `${selectedQuo.perihal} — ${customStageLabel}`,
                lokasi: alamatLengkap,
                notes: data.notes?.trim() ?? "",
                companyId,
                createdBy: user.uid,
                createdByName: user.name,
            } as any);

            // Buat entri proyek & tiket laporan untuk teknisi lapangan
            try {
                let initLat = selectedQuo.latitude || 0;
                let initLng = selectedQuo.longitude || 0;
                if ((!initLat || !initLng) && alamatLengkap && alamatLengkap.length >= 5) {
                    try {
                        const geo = await geocodeAddress(alamatLengkap);
                        if (geo) {
                            initLat = geo.lat;
                            initLng = geo.lng;
                        }
                    } catch {
                        // Jika offline, koordinat (0,0) di-anchor saat check-in teknisi pertama
                    }
                }

                await createProject({
                    projectName: `${selectedQuo.kepadaNama} (${customStageLabel})`,
                    clientName: selectedQuo.kepadaNama,
                    address: alamatLengkap || "Lokasi Pelanggan",
                    latitude: initLat,
                    longitude: initLng,
                    radius: 100,
                    workDate: data.scheduleDate,
                    workType: `${selectedQuo.perihal} — ${customStageLabel}`,
                    serviceType: svcType,
                    warrantyMonths,
                    contractType: isAR ? "ONE_TIME" : "RECURRING",
                    notes: data.notes?.trim() || `SPK ${customStageLabel} dari ${selectedQuo.noSurat}`,
                });
            } catch (projErr) {
                console.warn("[CreateSPKModal] Sinkronisasi project pelaksana:", projErr);
            }

            onCreated();
        } catch (e) {
            setServerError(e instanceof Error ? e.message : "Gagal menerbitkan SPK. Coba lagi.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
                {/* Header Bersih & Tenang */}
                <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                            Terbitkan Surat Perintah Kerja (SPK)
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Pilih pelanggan berkontrak untuk menjadwalkan kunjungan kerja teknisi lapangan.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        aria-label="Tutup modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
                    {serverError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                            {serverError}
                        </div>
                    )}

                    {loadingData ? (
                        <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                            <Loader2 size={20} className="animate-spin mr-2" /> Memuat data pelanggan...
                        </div>
                    ) : (
                        <>
                            {/* 1. Pilih Pelanggan (Dari Master Pelanggan Berkontrak) */}
                            <div className="space-y-1.5">
                                <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                                    1. Pilih Pelanggan Berkontrak *
                                </label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)] focus:outline-none focus:border-emerald-600 transition-colors"
                                        placeholder="Ketik nama pelanggan, nomor kontrak, atau perihal..."
                                        value={quoSearch}
                                        onChange={e => setQuoSearch(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1 border border-[var(--border-subtle)] rounded-xl p-1 bg-[var(--bg-primary)]">
                                    {filteredQuos.map(q => {
                                        const prevCount = existingSpkCounts[q.id] || existingSpkCounts[q.kepadaNama.trim().toLowerCase()] || 0;
                                        const isSel = quotationId === q.id;
                                        return (
                                            <button
                                                type="button"
                                                key={q.id}
                                                onClick={() => {
                                                    setValue('quotationId', q.id, { shouldValidate: true });
                                                    setValue('lokasi', q.lokasiPekerjaan || (q.kepadaAlamatLines ?? []).join(", "));
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                                    isSel
                                                        ? 'bg-emerald-800 text-white font-semibold'
                                                        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                                }`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-bold truncate">{q.kepadaNama}</p>
                                                    <p className={`text-[11px] truncate ${isSel ? 'text-emerald-200' : 'text-[var(--text-muted)]'}`}>
                                                        {q.noSurat} · {q.perihal}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                        isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {prevCount > 0 ? `${prevCount} SPK` : 'SPK Baru'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {filteredQuos.length === 0 && (
                                        <p className="text-center py-4 text-[var(--text-muted)] italic">
                                            Tidak ditemukan pelanggan yang sesuai kata kunci.
                                        </p>
                                    )}
                                </div>
                                {errors.quotationId && (
                                    <p className="text-rose-600 text-[11px] font-medium">{errors.quotationId.message}</p>
                                )}
                            </div>

                            {/* Ringkasan Klien & Indikator Riwayat Kunjungan */}
                            {selectedQuo && (
                                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs">{selectedQuo.kepadaNama}</span>
                                        <span className="text-[11px] font-mono font-bold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded">
                                            {isAR ? 'Anti Rayap' : 'Pest Control'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800 leading-snug">
                                        Alamat: {(selectedQuo.kepadaAlamatLines ?? []).join(", ") || selectedQuo.lokasiPekerjaan || 'Sesuai data master'}
                                    </p>
                                    <div className="pt-1 border-t border-emerald-200/80 flex items-center justify-between text-[11px] text-emerald-900 font-medium">
                                        <span>Riwayat Kunjungan: {previousSpkCount} Kali Selesai</span>
                                        <span className="font-bold">Akan Diterbitkan: Kunjungan ke-{nextVisitNumber}</span>
                                    </div>
                                </div>
                            )}

                            {/* 2. Tahap Kunjungan */}
                            {selectedQuo && (
                                <div className="space-y-2">
                                    <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                                        2. Penentuan Tahap Kunjungan
                                    </label>

                                    {isAR ? (
                                        <div className="space-y-1">
                                            <p className="text-[11px] text-[var(--text-muted)] mb-1">
                                                Pilih fase aplikasi atau periode kontrol garansi anti rayap:
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                {AR_STAGE_PRESETS.map(p => (
                                                    <button
                                                        type="button"
                                                        key={p.id}
                                                        onClick={() => setSelectedArStage(p.id)}
                                                        className={`px-3 py-2 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                                                            selectedArStage === p.id
                                                                ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                                                                : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPcoVisitType("ROUTINE")}
                                                className={`flex-1 py-2 px-3 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                                                    pcoVisitType === "ROUTINE"
                                                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                                                        : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                Rutin Bulanan (Kunjungan ke-{nextVisitNumber} dari 12)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPcoVisitType("EMERGENCY")}
                                                className={`py-2 px-3 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                                                    pcoVisitType === "EMERGENCY"
                                                        ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold'
                                                        : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                Panggilan Darurat / Komplain
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3. Teknisi & Jadwal Pelaksanaan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[11px] mb-1">
                                        3. Teknisi Bertugas *
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)] focus:outline-none focus:border-emerald-600"
                                        value={technicianId}
                                        onChange={e => setValue('technicianId', e.target.value, { shouldValidate: true })}
                                    >
                                        <option value="">-- Pilih Teknisi Lapangan --</option>
                                        {teknisis.map(t => (
                                            <option key={t.uid} value={t.uid}>
                                                {t.name} ({t.jabatan || 'Teknisi'})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.technicianId && (
                                        <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.technicianId.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[11px] mb-1">
                                        4. Tanggal Pengerjaan *
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)] focus:outline-none focus:border-emerald-600"
                                        min={new Date().toISOString().split("T")[0]}
                                        {...register('scheduleDate')}
                                    />
                                    {errors.scheduleDate && (
                                        <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.scheduleDate.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Lokasi & Catatan Khusus */}
                            <div className="space-y-2">
                                <div>
                                    <label className="block font-semibold text-[var(--text-secondary)] mb-1 text-[11px]">
                                        Alamat / Lokasi Pelaksanaan Pekerjaan
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)] focus:outline-none focus:border-emerald-600"
                                        placeholder="Isi alamat spesifik lokasi pekerjaan..."
                                        {...register('lokasi')}
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--text-secondary)] mb-1 text-[11px]">
                                        Instruksi / Catatan Tambahan Teknisi (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-3 py-2 text-xs border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)] focus:outline-none focus:border-emerald-600 resize-none"
                                        placeholder="Contoh: Fokus perlakuan area dapur gizi dan ganti umpan perangkap tikus..."
                                        {...register('notes')}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedQuo || !technicianId}
                            className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                        >
                            {isSubmitting ? "Menerbitkan SPK..." : "Terbitkan SPK"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
