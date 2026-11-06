import type { WorkReport, Project } from '@/entities/types';
import { generateVisitReportPDF, visitReportFromWorkReport } from '@/shared/lib/visitReportPdf';
import type { VisitFinding } from '@/shared/lib/visitReportPdf';
import type { Letterhead } from '@/shared/lib/quotationLetterPdf';
import { generateMonthlyRecapPDF, type MonthlyRecapReportData } from '@/shared/lib/monthlyRecapPdf';
import { resolveReportCategoryMode } from '@/shared/lib/permenkesRecapEngine';
import { fetchPhotoDataUrl } from '@/shared/utils/photoData';
import { resolveDocumentConfig, reportOptionsFromTemplates } from '@/shared/api/documentConfig';

export interface ExportReportOptions {
  /** Perusahaan pemilik dokumen: kop & template (judul, jenis pekerjaan, saran, footer) diambil dari pengaturannya. */
  companyId?: string | null;
  /** Menimpa kop dari pengaturan (opsional). */
  letterhead?: Letterhead;
  /** Nama pembuat dokumen untuk footer "created by". */
  createdBy?: string;
  findings?: VisitFinding[];
  saran?: string;
  idCustomer?: string;
}

const safeName = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

/**
 * Unduh PDF Laporan Kunjungan — otomatis membedakan format & nama file antara:
 * - Laporan_Anti_Rayap_<Klien>_<Tanggal>.pdf (untuk TERMITE_CONTROL)
 * - Laporan_Pest_Control_<Klien>_<Tanggal>.pdf (untuk layanan Pest Control / PCO)
 */
export async function exportReportToPdf(report: WorkReport, _project?: Project, opts: ExportReportOptions = {}) {
  const order = { CHECK_IN: 0, PROGRESS: 1, CHECK_OUT: 2 } as const;
  const sorted = [...(report.photos ?? [])].sort(
    (a, b) => order[a.photoType] - order[b.photoType] || +new Date(a.capturedAt) - +new Date(b.capturedAt),
  );
  const photos = await Promise.all(
    sorted.map(async p => ({ dataUrl: p.purgedAt ? undefined : await fetchPhotoDataUrl(p.url) })),
  );

  const cfg = await resolveDocumentConfig(opts.companyId);
  const ro = reportOptionsFromTemplates(cfg.templates);
  const data = visitReportFromWorkReport(report, {
    letterhead: opts.letterhead ?? cfg.letterhead,
    judul: ro.judul,
    jenisPekerjaan: ro.jenisPekerjaan,
    tampilkanFooter: ro.tampilkanFooter,
    createdBy: opts.createdBy ?? report.executorName ?? '-',
    photos,
    findings: opts.findings,
    saran: opts.saran ?? ro.saran,
    idCustomer: opts.idCustomer,
  });

  const isTermite = resolveReportCategoryMode(report.serviceType) === 'AR';
  const prefix = isTermite ? 'Laporan_Anti_Rayap' : 'Laporan_Pest_Control';

  const blob = generateVisitReportPDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}_${safeName(report.clientName || report.projectName)}_${new Date(data.tanggal).toISOString().slice(0, 10)}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Unduh PDF Laporan Rekapitulasi Bulanan (Membedakan Mode Pest Control vs Mode Anti Rayap)
 * Khusus Admin (`userRole === 'ADMIN'`).
 */
export async function exportMonthlyRecapToPdf(
  payload: Omit<MonthlyRecapReportData, 'letterhead'> & { companyId?: string | null }
) {
  const cfg = await resolveDocumentConfig(payload.companyId);
  const blob = generateMonthlyRecapPDF({
    ...payload,
    letterhead: cfg.letterhead,
  });
  const isTermite = payload.categoryMode === 'AR';
  const prefix = isTermite ? 'Laporan_Rekapitulasi_Anti_Rayap' : 'Laporan_Rekapitulasi_Pest_Control';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}_${safeName(payload.customerName)}_${safeName(payload.periodLabel)}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
