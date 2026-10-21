import type { WorkReport, Project } from '@/entities/types';
import { generateVisitReportPDF, visitReportFromWorkReport } from '@/shared/lib/visitReportPdf';
import type { VisitFinding } from '@/shared/lib/visitReportPdf';
import type { Letterhead } from '@/shared/lib/quotationLetterPdf';
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
 * Unduh "Laporan Kunjungan" (PDF) untuk sebuah work report: identitas customer, tabel temuan,
 * catatan/saran, tanda tangan, dan dokumentasi foto.
 * (Parameter `project` dipertahankan agar pemanggil lama tetap kompatibel; data proyek sudah ada di `report`.)
 */
export async function exportReportToPdf(report: WorkReport, _project?: Project, opts: ExportReportOptions = {}) {
  // Foto diambil paralel; urut: check-in → progres → check-out. Foto yang sudah dihapus (retensi) dilewati.
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

  const blob = generateVisitReportPDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Kunjungan_${safeName(report.clientName || report.projectName)}_${new Date(data.tanggal).toISOString().slice(0, 10)}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
