/**
 * Generator PDF "LAPORAN KUNJUNGAN" — meniru contoh laporan resmi:
 *   hal. 1  kop perusahaan, judul, identitas customer, tabel temuan (Hama / Quantity / Penanganan / Lokasi / Notes)
 *   hal. 2  Catatan, Saran dan Rekomendasi, kotak tanda tangan Petugas & Customer
 *   hal. 3+ dokumentasi foto ("Foto - N", 2 kolom)
 *   footer  "created by: <pembuat> datetime: <tanggal jam> (GMT +07:00)" di setiap halaman
 *
 * Murni jsPDF (teks vektor) agar tajam, ringan, dan bisa dites di Node. Kop memakai Letterhead yang sama
 * dengan surat penawaran sehingga tiap perusahaan (multi-tenant) mencetak identitasnya sendiri.
 */
import jsPDF from 'jspdf';
import type { Letterhead } from './quotationLetterPdf';
import { GUCI_LETTERHEAD } from './quotationLetterPdf';
import { DOC_TIMEZONE } from './quotationConfig';
import type { WorkReport } from '@/entities/types';

export interface VisitFinding {
    hama: string;
    quantity: number | string;
    penanganan: string;
    lokasi: string;
    notes: string;
}

export interface VisitReportData {
    letterhead?: Letterhead;
    /** Judul dokumen (template perusahaan). Default "LAPORAN KUNJUNGAN". */
    judul?: string;
    /** Tampilkan baris "created by: ... datetime: ..." di tiap halaman. Default true. */
    tampilkanFooter?: boolean;
    idCustomer?: string;
    customerName: string;
    kategori?: string;
    alamat: string;
    tanggal: Date;
    petugas: string;
    jenisPekerjaan: string;
    findings: VisitFinding[];
    catatan?: string;
    saran?: string;
    petugasSignature?: string;   // data URL PNG (opsional)
    customerNama?: string;
    customerSignature?: string;  // data URL PNG (opsional)
    photos: { dataUrl?: string; caption?: string }[];
    createdBy: string;
    createdAt?: Date;
}

const PW = 210, PH = 297, ML = 12, MR = 12, TW = PW - ML - MR;
const FOOT_Y = 288;
const BOTTOM = 280;

const fmtLongDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: DOC_TIMEZONE }).replace(/\//g, '-');

/** "23 Aug 2026 - 11:27:08 (GMT +07:00)" — selalu WIB, apa pun zona waktu perangkat. */
function fmtStamp(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: DOC_TIMEZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(d);
    const g = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return `${g('day')} ${g('month')} ${g('year')} - ${g('hour')}:${g('minute')}:${g('second')} (GMT +07:00)`;
}

class VisitRenderer {
    private doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    private y = 0;
    private lh: Letterhead;
    private stamp: string;

    constructor(private d: VisitReportData) {
        this.lh = d.letterhead ?? GUCI_LETTERHEAD;
        this.stamp = `created by: ${d.createdBy} datetime: ${fmtStamp(d.createdAt ?? new Date())}`;
    }

    private chrome() {
        const doc = this.doc, lh = this.lh;
        let y = 12;
        if (lh.headerLogo) {
            try {
                const props = doc.getImageProperties(lh.headerLogo);
                const w = Math.min(lh.headerLogoWidthMm ?? 60, 70), h = w * (lh.headerLogoRatio ?? props.height / props.width);
                doc.addImage(lh.headerLogo, props.fileType, ML, y, w, h);
                y += h + 3;
            } catch { /* logo rusak: lewati */ }
        }
        doc.setTextColor('#000000');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.text(lh.companyName.toUpperCase(), ML, y + 3);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        const office = lh.footerLines.find(l => /head office/i.test(l)) ?? lh.footerLines[0];
        if (office) doc.text(office.replace(/\s{2,}/g, ' '), ML, y + 7);
        doc.setFontSize(9);
        if (this.d.tampilkanFooter !== false) doc.text(this.stamp, ML + 3, FOOT_Y);
        this.y = Math.max(y + 22, 52);
    }

    private newPage() { this.doc.addPage(); this.chrome(); }
    private ensure(h: number) { if (this.y + h > BOTTOM) { this.newPage(); this.y = 52; } }

    private header() {
        const doc = this.doc, d = this.d;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(`${(d.judul ?? 'LAPORAN KUNJUNGAN').toUpperCase()} - ${d.customerName.toUpperCase()}`, ML + 3, this.y + 4);
        this.y += 15;

        const row = (l1: string, v1: string, l2?: string, v2?: string, boldVals = true) => {
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold'); doc.text(l1, ML + 3, this.y);
            doc.text(':', ML + 28, this.y);
            doc.setFont('helvetica', boldVals ? 'bold' : 'normal');
            doc.text(v1, ML + 31, this.y);
            if (l2) {
                doc.setFont('helvetica', 'bold'); doc.text(l2, 128, this.y);
                doc.text(':', 148, this.y);
                doc.setFont('helvetica', 'normal'); doc.text(v2 ?? '', 151, this.y);
            }
            this.y += 5.8;
        };
        row('ID Customer', d.idCustomer ?? '-', 'Tanggal', fmtLongDate(d.tanggal));
        row('Customer', d.customerName.length > 34 ? d.customerName.slice(0, 33) + '…' : d.customerName, 'Petugas', d.petugas);
        row('Kategori', d.kategori ?? '');
        // Alamat dapat panjang → bungkus
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.text('Alamat', ML + 3, this.y);
        doc.text(':', ML + 28, this.y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(d.alamat || '-', TW - 34) as string[];
        lines.forEach((l, i) => doc.text(l, ML + 31, this.y + i * 4.2));
        this.y += Math.max(1, lines.length) * 4.2 + 3;

        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Jenis Pekerjaan :', ML + 3, this.y);
        doc.setFont('helvetica', 'normal'); doc.text(d.jenisPekerjaan, ML + 3 + doc.getTextWidth('Jenis Pekerjaan : ') + 1, this.y);
        this.y += 3;
    }

    private findingsTable() {
        const doc = this.doc;
        const cols = [32, 22, 34, 44, 54]; // = 186
        const xs = cols.reduce<number[]>((a, _w, i) => { a.push(i === 0 ? ML : a[i - 1] + cols[i - 1]); return a; }, []);
        const draw = (cells: string[], head: boolean) => {
            const size = head ? 10 : 9, lh = size * 0.3528 * 1.3;
            doc.setFont('helvetica', head ? 'bold' : 'normal'); doc.setFontSize(size);
            const wrapped = cells.map((c, i) => doc.splitTextToSize(c, cols[i] - 4) as string[]);
            const h = Math.max(head ? 7 : 9, Math.max(...wrapped.map(w => w.length)) * lh + 4);
            this.ensure(h);
            cells.forEach((_c, i) => {
                doc.setDrawColor('#000000'); doc.setLineWidth(0.3); doc.rect(xs[i], this.y, cols[i], h);
                const blockH = wrapped[i].length * lh;
                wrapped[i].forEach((ln, k) => doc.text(ln, xs[i] + cols[i] / 2, this.y + (h - blockH) / 2 + lh * 0.78 + k * lh, { align: 'center' }));
            });
            this.y += h;
        };
        draw(['Hama Temuan', 'Quantity', 'Penanganan', 'Lokasi', 'Notes'], true);
        for (const f of this.d.findings) draw([f.hama, String(f.quantity), f.penanganan, f.lokasi, f.notes], false);
        this.y += 6;
    }

    private section(title: string, body?: string) {
        this.ensure(30);
        const doc = this.doc;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(title, ML + 3, this.y);
        this.y += 3;
        doc.setDrawColor('#d0d0d0'); doc.setLineWidth(1.1); doc.line(ML + 3, this.y, PW - MR, this.y);
        this.y += 6;
        if (body?.trim()) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
            for (const ln of doc.splitTextToSize(body, TW - 6) as string[]) { this.ensure(5); doc.text(ln, ML + 3, this.y); this.y += 4.8; }
            this.y += 4;
        } else {
            this.y += 20; // ruang kosong untuk diisi manual, seperti contoh
        }
    }

    private signatures() {
        this.ensure(48);
        const doc = this.doc, d = this.d;
        const bw = 50, bh = 28, gap = 2, x2 = PW - MR - bw, x1 = x2 - bw - gap, top = this.y + 8;
        doc.setFont('times', 'bold'); doc.setFontSize(10);
        doc.text('Petugas', x1 + bw / 2, this.y + 4, { align: 'center' });
        doc.text('Customer', x2 + bw / 2, this.y + 4, { align: 'center' });
        const box = (x: number, sig: string | undefined, name: string) => {
            doc.setDrawColor('#000000'); doc.setLineWidth(0.7); doc.rect(x, top, bw, bh + 8);
            doc.setLineWidth(0.25); doc.line(x, top + bh, x + bw, top + bh);
            if (sig) { try { const p = doc.getImageProperties(sig); const r = Math.min((bw - 6) / p.width, (bh - 4) / p.height); doc.addImage(sig, p.fileType, x + (bw - p.width * r) / 2, top + 2 + ((bh - 4) - p.height * r) / 2, p.width * r, p.height * r); } catch { /* lewati */ } }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
            doc.text(name || '', x + bw / 2, top + bh + 5.2, { align: 'center', maxWidth: bw - 3 });
        };
        box(x1, d.petugasSignature, d.petugas);
        box(x2, d.customerSignature, d.customerNama ?? '');
        this.y = top + bh + 12;
    }

    private photos() {
        const list = this.d.photos;
        if (!list.length) return;
        const doc = this.doc;
        this.newPage(); this.y = 52;
        const bw = 91.5, bh = 52, gx = 3;
        for (let i = 0; i < list.length; i += 2) {
            this.ensure(bh + 9);
            [list[i], list[i + 1]].forEach((p, k) => {
                if (!p) return;
                const n = i + k + 1, x = ML + k * (bw + gx);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#000000');
                doc.text(p.caption ?? `Foto - ${n}`, x + 1, this.y + 3);
                doc.setDrawColor('#000000'); doc.setLineWidth(0.5); doc.rect(x, this.y + 5, bw, bh);
                if (p.dataUrl) {
                    try {
                        const props = doc.getImageProperties(p.dataUrl);
                        const r = Math.min((bw - 4) / props.width, (bh - 4) / props.height);
                        const w = props.width * r, h = props.height * r;
                        doc.addImage(p.dataUrl, props.fileType, x + (bw - w) / 2, this.y + 5 + (bh - h) / 2, w, h);
                    } catch { doc.setFontSize(8); doc.text('(foto tidak dapat dimuat)', x + bw / 2, this.y + 5 + bh / 2, { align: 'center' }); }
                } else {
                    doc.setFontSize(8); doc.setTextColor('#888888');
                    doc.text('(foto tidak tersedia / sudah dihapus sesuai retensi)', x + bw / 2, this.y + 5 + bh / 2, { align: 'center' });
                    doc.setTextColor('#000000');
                }
            });
            this.y += bh + 11;
        }
    }

    render(): Blob {
        this.chrome();
        this.header();
        this.findingsTable();
        this.section('Catatan', this.d.catatan);
        this.section('Saran dan Rekomendasi', this.d.saran);
        this.signatures();
        this.photos();
        return this.doc.output('blob');
    }
}

export function generateVisitReportPDF(data: VisitReportData): Blob {
    return new VisitRenderer(data).render();
}

// ─── Pemetaan dari WorkReport aplikasi ───────────────────────────────────────

const humanize = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase());

/**
 * Menurunkan baris temuan dari data yang BENAR-BENAR tersimpan: target hama proyek + metode/bahan treatment.
 * Quantity & lokasi per-zona tidak dicatat sistem saat ini, jadi ditampilkan "-" (tidak mengarang angka
 * "0 ditemukan"). Teknisi dapat menimpa lewat parameter `findings`.
 */
export function findingsFromReport(report: WorkReport): VisitFinding[] {
    const t = report.treatmentRecord;
    const penanganan = t
        ? `${humanize(t.applicationMethod)}${t.chemicalName ? ` (${t.chemicalName}${t.dosage ? `, ${t.dosage}` : ''})` : ''}`
        : '-';
    const targets = report.targetFocus?.length ? report.targetFocus : report.focusTarget ? [report.focusTarget] : [humanize(report.serviceType)];
    const notes = t?.technicianNotes || report.notes || '-';
    const lokasi = report.targetFocus?.length && report.focusTarget ? report.focusTarget : '-';
    return targets.map(h => ({ hama: h, quantity: '-', penanganan, lokasi, notes }));
}

export function visitReportFromWorkReport(
    report: WorkReport,
    o: { letterhead?: Letterhead; createdBy: string; photos?: VisitReportData['photos']; findings?: VisitFinding[]; saran?: string; idCustomer?: string; judul?: string; jenisPekerjaan?: string; tampilkanFooter?: boolean },
): VisitReportData {
    const t = report.treatmentRecord;
    return {
        letterhead: o.letterhead,
        judul: o.judul,
        tampilkanFooter: o.tampilkanFooter,
        idCustomer: o.idCustomer ?? '-',
        customerName: report.clientName || report.projectName,
        kategori: humanize(report.serviceType),
        alamat: report.projectAddress,
        tanggal: new Date(report.checkInAt ?? report.createdAt),
        petugas: report.executorName,
        jenisPekerjaan: o.jenisPekerjaan ?? (humanize(report.serviceType) === 'General Pest Control' ? 'Treatment' : humanize(report.serviceType)),
        findings: o.findings ?? findingsFromReport(report),
        catatan: [report.notes, t?.safetyNotes && `Catatan keselamatan: ${t.safetyNotes}`].filter(Boolean).join('\n'),
        saran: o.saran,
        customerNama: report.customerName ?? undefined,
        customerSignature: report.customerSignature ?? undefined,
        photos: o.photos ?? [],
        createdBy: o.createdBy,
    };
}
