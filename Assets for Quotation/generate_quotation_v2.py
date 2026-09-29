"""
PDF Generator v2 — PT Guci Emas Pratama
Perubahan dari v1:
  - Nama + nomor WA marketing dari profil user muncul di bagian penutup
  - Paragraf pembuka dibedakan antara Anti Rayap vs Pest Control
  - Fungsi helper untuk sistem nomor surat otomatis
  - Modul NomorSurat: generate, simpan ke log (JSON), query log
"""

import os
import json
import re
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable

# ─── BRAND ─────────────────────────────────────────────────────────────────────
GREEN        = HexColor("#1a5c38")
GREEN_LIGHT  = HexColor("#e8f4ed")
DARK         = HexColor("#1a1a1a")
GRAY         = HexColor("#555555")
GRAY_LIGHT   = HexColor("#888888")
BORDER       = HexColor("#cccccc")
TABLE_HEADER = HexColor("#2d7a4f")
TABLE_ALT    = HexColor("#f2f8f5")
TOTAL_BG     = HexColor("#1a5c38")

W, H = A4
MARGIN_L = 20*mm
MARGIN_R = 20*mm
MARGIN_T = 15*mm
MARGIN_B = 20*mm

COMPANY = {
    "name":   "PT GUCI EMAS PRATAMA",
    "head":   "Jln. Ganda Sasmita No.1 Serua, Ciputat – Tangerang Selatan 15414",
    "telp":   "(021) 74637054",
    "wa":     "0817 0795 959",
    "email":  "info@gucimaspratama.co.id",
    "web":    "www.gucimaspratama.co.id",
    "branch": "Pondok Trosobo Indah Blok I No.3, Sidoarjo – Jawa Timur. Telp : (031) 70235866",
}

# ════════════════════════════════════════════════════════════════════════════════
# MODUL NOMOR SURAT
# ════════════════════════════════════════════════════════════════════════════════

# Lokasi file log (JSON sederhana — di produksi, ganti dengan Firestore)
LOG_PATH = os.path.join(os.path.dirname(__file__), "nomor_surat_log.json")

# Kategori & tipe
KATEGORI = {
    "AR":  "Anti Rayap",
    "PCO": "Pest Control",
}

TIPE = {
    "U": "Umum",     # Penawaran biasa / satu kali
    "K": "Kontrak",  # Kerjasama berkala / tahunan
}

# Pemetaan jenis layanan ke kategori
LAYANAN_KATEGORI = {
    # Anti Rayap
    "anti_rayap_injeksi":    "AR",
    "anti_rayap_pipanisasi": "AR",
    "anti_rayap_baiting":    "AR",
    "anti_rayap_pra":        "AR",
    "anti_rayap_soil":       "AR",
    # Pest Control
    "pest_spraying":         "PCO",
    "pest_fogging":          "PCO",
    "pest_rodent":           "PCO",
    "pest_baiting":          "PCO",
    "pest_fumigasi":         "PCO",
    "pest_umum":             "PCO",
}


def _load_log() -> list:
    """Muat log dari file JSON."""
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_log(log: list) -> None:
    """Simpan log ke file JSON."""
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)


def generate_nomor_surat(
    kategori: str,
    tipe: str,
    kepada: str,
    by_uid: str,
    by_name: str,
    layanan: str = "",
    dry_run: bool = False,
) -> dict:
    """
    Generate nomor surat baru dan simpan ke log.

    Format: GP-{kategori}/{tipe}/{YYYY}/{MM}/{XXXX}
    Contoh: GP-AR/U/2026/03/0001
            GP-PCO/K/2026/03/0002

    Args:
        kategori : "AR" atau "PCO"
        tipe     : "U" (Umum) atau "K" (Kontrak)
        kepada   : Nama klien/perusahaan tujuan
        by_uid   : UID user yang membuat
        by_name  : Nama user yang membuat
        layanan  : Nilai dari LAYANAN_KATEGORI (opsional, untuk info)
        dry_run  : Jika True, tidak simpan ke log (preview saja)

    Returns:
        dict dengan nomor surat dan metadata
    """
    if kategori not in KATEGORI:
        raise ValueError(f"Kategori '{kategori}' tidak valid. Gunakan: {list(KATEGORI.keys())}")
    if tipe not in TIPE:
        raise ValueError(f"Tipe '{tipe}' tidak valid. Gunakan: {list(TIPE.keys())}")

    now = datetime.now()
    yyyy = str(now.year)
    mm   = now.strftime("%m")

    # Cari seq terakhir bulan ini untuk prefix yang sama
    log  = _load_log()
    prefix = f"GP-{kategori}/{tipe}/{yyyy}/{mm}/"
    existing_seqs = [
        int(e["no_surat"].split("/")[-1])
        for e in log
        if e["no_surat"].startswith(prefix)
    ]
    next_seq = max(existing_seqs, default=0) + 1
    no_surat = f"{prefix}{str(next_seq).zfill(4)}"

    entry = {
        "id":        f"{by_uid}_{now.strftime('%Y%m%d%H%M%S')}",
        "no_surat":  no_surat,
        "kategori":  kategori,
        "tipe":      tipe,
        "tipe_label":TIPE[tipe],
        "layanan":   layanan,
        "kepada":    kepada,
        "by_uid":    by_uid,
        "by_name":   by_name,
        "dibuat":    now.isoformat(),
        "status":    "draft",   # draft → pending → approved / rejected
        "quo_id":    None,
    }

    if not dry_run:
        log.append(entry)
        _save_log(log)

    return entry


def update_status_nomor(no_surat: str, status: str, quo_id: str = None) -> bool:
    """Update status dan quo_id dari nomor surat di log."""
    log = _load_log()
    for e in log:
        if e["no_surat"] == no_surat:
            e["status"]  = status
            if quo_id:
                e["quo_id"] = quo_id
            _save_log(log)
            return True
    return False


def get_log(
    by_uid: str = None,
    kategori: str = None,
    tipe: str = None,
    status: str = None,
    tahun: int = None,
    bulan: int = None,
) -> list:
    """
    Ambil log dengan filter opsional.

    - by_uid  : filter per marketing (None = semua)
    - kategori: "AR" / "PCO" / None
    - tipe    : "U" / "K" / None
    - status  : "draft" / "pending" / "approved" / "rejected" / None
    - tahun   : filter tahun (int)
    - bulan   : filter bulan 1–12 (int)
    """
    log = _load_log()

    if by_uid:
        log = [e for e in log if e["by_uid"] == by_uid]
    if kategori:
        log = [e for e in log if e["kategori"] == kategori]
    if tipe:
        log = [e for e in log if e["tipe"] == tipe]
    if status:
        log = [e for e in log if e["status"] == status]
    if tahun:
        log = [e for e in log if e["no_surat"].split("/")[3] == str(tahun)]
    if bulan:
        log = [e for e in log if e["no_surat"].split("/")[4] == str(bulan).zfill(2)]

    return sorted(log, key=lambda e: e["dibuat"], reverse=True)


def print_log_table(entries: list) -> None:
    """Print log sebagai tabel teks (untuk debug / CLI)."""
    if not entries:
        print("  (tidak ada data)")
        return
    print(f"  {'No. Surat':<28} {'Tipe':<8} {'Kepada':<30} {'By':<18} {'Status':<10} {'Dibuat'}")
    print(f"  {'-'*28} {'-'*8} {'-'*30} {'-'*18} {'-'*10} {'-'*16}")
    for e in entries:
        tgl = e["dibuat"][:10]
        print(f"  {e['no_surat']:<28} {e['tipe_label']:<8} {e['kepada'][:28]:<30} {e['by_name']:<18} {e['status']:<10} {tgl}")


# ════════════════════════════════════════════════════════════════════════════════
# HELPERS PDF
# ════════════════════════════════════════════════════════════════════════════════

def fmt_idr(amount):
    if amount is None:
        return "-"
    return "Rp {:,.0f}".format(amount).replace(",", ".")


def fmt_date_id(d):
    MONTHS = ["","Januari","Februari","Maret","April","Mei","Juni",
              "Juli","Agustus","September","Oktober","November","Desember"]
    return f"{d.day} {MONTHS[d.month]} {d.year}"


def calc_totals(items, biaya_tambahan=None, diskon_pct=0, ppn=False, ppn_dpp_faktor=None):
    subtotal     = sum(i["qty"] * i["harga"] for i in items)
    biaya_extra  = sum(b["amount"] for b in (biaya_tambahan or []))
    subtotal_gross = subtotal + biaya_extra
    diskon_rp    = subtotal_gross * diskon_pct / 100
    setelah_diskon = subtotal_gross - diskon_rp

    if ppn:
        if ppn_dpp_faktor:
            dpp    = setelah_diskon * ppn_dpp_faktor
            ppn_rp = dpp * 0.12
        else:
            dpp    = None
            ppn_rp = setelah_diskon * 0.11
    else:
        dpp    = None
        ppn_rp = 0

    return {
        "subtotal": subtotal, "biaya_extra": biaya_extra,
        "subtotal_gross": subtotal_gross, "diskon_pct": diskon_pct,
        "diskon_rp": diskon_rp, "setelah_diskon": setelah_diskon,
        "dpp": dpp, "ppn_rp": ppn_rp, "total": setelah_diskon + ppn_rp,
    }


def _angka_ke_kata(n):
    return {1:"satu",2:"dua",3:"tiga",4:"empat",5:"lima"}.get(n, str(n))


def _is_anti_rayap(jenis_layanan: str) -> bool:
    return LAYANAN_KATEGORI.get(jenis_layanan, "PCO") == "AR"


def _paragraf_pembuka_default(quo: dict) -> str:
    """
    Generate paragraf pembuka yang berbeda antara Anti Rayap dan Pest Control.
    Jika quo sudah punya 'paragraf_pembuka', gunakan itu.
    """
    if quo.get("paragraf_pembuka"):
        return quo["paragraf_pembuka"]

    nama    = quo.get("kepada_nama", "Bapak/Ibu")
    alamat  = ", ".join(quo.get("kepada_alamat_lines", []))
    layanan = quo.get("jenis_layanan", "")

    if _is_anti_rayap(layanan):
        # ── Anti Rayap template ──
        return (
            f"Kami ucapkan terima kasih telah memberikan kesempatan kepada kami PT Guci Emas Pratama "
            f"untuk melakukan survey dan memberikan penawaran untuk pekerjaan Jasa Anti Rayap pada "
            f"bangunan yang berlokasi di {alamat}."
            if alamat else
            f"Kami ucapkan terima kasih telah memberikan kesempatan kepada kami PT Guci Emas Pratama "
            f"untuk melakukan survey dan memberikan penawaran untuk pekerjaan Jasa Anti Rayap."
        )
    else:
        # ── Pest Control template ──
        return (
            f"Terima kasih atas kesempatan yang diberikan kepada kami PT Guci Emas Pratama untuk "
            f"mengajukan surat penawaran harga Jasa Pengendalian Hama (Pest Control) "
            f"untuk {nama}"
            + (f" yang beralamat di {alamat}." if alamat else ".")
        )


# ════════════════════════════════════════════════════════════════════════════════
# FLOWABLES
# ════════════════════════════════════════════════════════════════════════════════

class KopSurat(Flowable):
    def __init__(self, width):
        super().__init__()
        self.width  = width
        self.height = 28*mm

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        c.setFillColor(GREEN)
        c.rect(0, h - 3*mm, w, 3*mm, fill=1, stroke=0)

        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(0, h - 12*mm, COMPANY["name"])

        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7.5)
        c.drawString(0, h - 15.5*mm, "Jasa Anti Rayap & Pengendalian Hama Profesional  ·  Est. 1985")

        c.setStrokeColor(GREEN)
        c.setLineWidth(1.2)
        c.line(0, h - 17*mm, w, h - 17*mm)

        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7)
        c.drawString(0, h - 20*mm, f"Head Office : {COMPANY['head']}")
        c.drawString(0, h - 23*mm,
            f"Telp : {COMPANY['telp']}  |  WhatsApp : {COMPANY['wa']}  |  "
            f"E-Mail : {COMPANY['email']}  |  {COMPANY['web']}")
        c.drawString(0, h - 26*mm, f"Branch Office : {COMPANY['branch']}")


class FooterKop(Flowable):
    def __init__(self, width):
        super().__init__()
        self.width  = width
        self.height = 14*mm

    def draw(self):
        c = self.canv
        w = self.width

        c.setStrokeColor(GREEN)
        c.setLineWidth(0.8)
        c.line(0, self.height - 1*mm, w, self.height - 1*mm)

        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(0, self.height - 5*mm, COMPANY["name"])

        c.setFillColor(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawString(0, self.height - 8*mm,  f"Head Office : {COMPANY['head']}")
        c.drawString(0, self.height - 11*mm,
            f"Telp : {COMPANY['telp']}  |  WhatsApp : {COMPANY['wa']}  |  "
            f"{COMPANY['email']}  |  {COMPANY['web']}")
        c.drawString(0, self.height - 14*mm, f"Branch Office : {COMPANY['branch']}")


# ════════════════════════════════════════════════════════════════════════════════
# STYLES
# ════════════════════════════════════════════════════════════════════════════════

def get_styles():
    return {
        "normal":  ParagraphStyle("normal",  fontSize=9,  leading=13, fontName="Helvetica",      textColor=DARK),
        "bold":    ParagraphStyle("bold",    fontSize=9,  leading=13, fontName="Helvetica-Bold",  textColor=DARK),
        "small":   ParagraphStyle("small",   fontSize=8,  leading=11, fontName="Helvetica",       textColor=GRAY),
        "green":   ParagraphStyle("green",   fontSize=10, leading=14, fontName="Helvetica-Bold",  textColor=GREEN),
        "center":  ParagraphStyle("center",  fontSize=9,  leading=13, fontName="Helvetica",       textColor=DARK, alignment=TA_CENTER),
        "right":   ParagraphStyle("right",   fontSize=9,  leading=13, fontName="Helvetica",       textColor=DARK, alignment=TA_RIGHT),
        "justify": ParagraphStyle("justify", fontSize=9,  leading=13, fontName="Helvetica",       textColor=DARK, alignment=TA_JUSTIFY),
        "bullet":  ParagraphStyle("bullet",  fontSize=9,  leading=13, fontName="Helvetica",       textColor=DARK, leftIndent=8),
    }


# ════════════════════════════════════════════════════════════════════════════════
# SECTION BUILDERS
# ════════════════════════════════════════════════════════════════════════════════

def build_header_info(quo, S):
    story = []
    tgl   = fmt_date_id(quo["tanggal"])

    # Nomor + tanggal
    t = Table(
        [[Paragraph(f"No: <b>{quo['no_surat']}</b>", S["normal"]),
          Paragraph(f"Tangerang Selatan, {tgl}", S["right"])]],
        colWidths=[W - MARGIN_L - MARGIN_R - 60*mm, 60*mm]
    )
    t.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t)
    story.append(Spacer(1, 5*mm))

    # Kepada Yth
    story.append(Paragraph("Kepada Yth.", S["normal"]))
    story.append(Paragraph(f"<b>{quo['kepada_nama']}</b>", S["bold"]))
    for line in quo.get("kepada_alamat_lines", []):
        story.append(Paragraph(line, S["normal"]))
    if quo.get("kepada_up"):
        story.append(Paragraph(f"Up : {quo['kepada_up']}", S["normal"]))
    story.append(Spacer(1, 4*mm))

    # Perihal — otomatis dibedakan AR vs PCO jika tidak di-set
    perihal = quo.get("perihal") or (
        "Penawaran Harga Anti Rayap"
        if _is_anti_rayap(quo.get("jenis_layanan", ""))
        else "Penawaran Harga Jasa Pengendalian Hama"
    )
    story.append(Paragraph(f"Perihal: <b>{perihal}</b>", S["normal"]))
    story.append(Spacer(1, 5*mm))

    # Paragraf pembuka (otomatis jika kosong)
    story.append(Paragraph("Dengan hormat,", S["normal"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(_paragraf_pembuka_default(quo), S["justify"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Surat penawaran ini berlaku selama <b>30 (tiga puluh) hari</b> sejak tanggal surat dibuat.",
        S["normal"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Mohon proposal ini dipelajari dan kami dengan senang hati membantu apabila masih ada "
        "hal-hal yang kurang jelas. Demikian proposal penawaran ini kami sampaikan, atas "
        "perhatian dan kerjasama anda, kami ucapkan terima kasih.",
        S["justify"]))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Jabat Erat,", S["normal"]))
    story.append(Paragraph("PT Guci Emas Pratama", S["bold"]))
    story.append(Spacer(1, 3*mm))
    return story


def build_biaya_section(quo, S):
    story   = []
    calc    = quo["_calc"]
    usable_w = W - MARGIN_L - MARGIN_R

    story.append(Paragraph("<b>BIAYA PELAKSANAAN</b>", S["green"]))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph("Berdasarkan hasil survey, berikut penawaran harga yang kami ajukan:", S["normal"]))
    story.append(Spacer(1, 2*mm))

    col_no  = 8*mm
    col_pek = usable_w * 0.42
    col_vol = usable_w * 0.14
    col_hs  = usable_w * 0.20
    col_jml = usable_w - col_no - col_pek - col_vol - col_hs

    rows = [[
        Paragraph("<b>No</b>", S["center"]),
        Paragraph("<b>Pekerjaan</b>", S["bold"]),
        Paragraph("<b>Volume Kerja</b>", S["center"]),
        Paragraph("<b>Harga Satuan</b>", S["center"]),
        Paragraph("<b>Jumlah</b>", S["center"]),
    ]]
    for i, item in enumerate(quo["items"], 1):
        sub = item["qty"] * item["harga"]
        rows.append([
            Paragraph(str(i), S["center"]),
            Paragraph(item["desc"], S["normal"]),
            Paragraph(f"{item['qty']:,.0f} {item['unit']}".replace(",", "."), S["center"]),
            Paragraph(fmt_idr(item["harga"]), S["right"]),
            Paragraph(f"<b>{fmt_idr(sub)}</b>", S["right"]),
        ])
    for b in quo.get("biaya_tambahan", []):
        rows.append([
            Paragraph("", S["center"]),
            Paragraph(b["label"], S["normal"]),
            Paragraph("1 ls", S["center"]),
            Paragraph(fmt_idr(b["amount"]), S["right"]),
            Paragraph(fmt_idr(b["amount"]), S["right"]),
        ])

    tbl = Table(rows, colWidths=[col_no, col_pek, col_vol, col_hs, col_jml])
    sty = TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  TABLE_HEADER),
        ("TEXTCOLOR",     (0,0), (-1,0),  white),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 5),
        ("RIGHTPADDING",  (0,0), (-1,-1), 5),
        ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
        ("LINEBELOW",     (0,0), (-1,0),  1.2, GREEN),
    ])
    for idx in range(1, len(rows)):
        sty.add("BACKGROUND", (0,idx), (-1,idx), TABLE_ALT if idx % 2 == 0 else white)
    tbl.setStyle(sty)
    story.append(tbl)

    # Summary
    sum_rows = [["", "Jumlah", fmt_idr(calc["subtotal_gross"])]]
    if calc["diskon_rp"] > 0:
        lbl = f"Diskon ({calc['diskon_pct']:.0f}%)" if calc["diskon_pct"] else "Diskon"
        sum_rows.append(["", lbl, fmt_idr(calc["diskon_rp"])])
        sum_rows.append(["", "Total Biaya", fmt_idr(calc["setelah_diskon"])])
    if calc["dpp"]:
        sum_rows += [
            ["", "DPP Nilai Lain x 11/12", fmt_idr(calc["dpp"])],
            ["", "PPN 12%", fmt_idr(calc["ppn_rp"])],
        ]
    elif calc["ppn_rp"] > 0:
        sum_rows.append(["", "PPN 11%", fmt_idr(calc["ppn_rp"])])
    sum_rows.append(["TOTAL", "", fmt_idr(calc["total"])])

    sum_data = []
    for row in sum_rows:
        is_tot = row[0] == "TOTAL"
        sum_data.append([
            Paragraph("", S["normal"]),
            Paragraph(f"<b>{row[1]}</b>" if is_tot else row[1], S["bold"] if is_tot else S["normal"]),
            Paragraph(f"<b>{row[2]}</b>", S["right"]),
        ])

    col_e = col_no + col_pek + col_vol
    sum_tbl = Table(sum_data, colWidths=[col_e, col_hs, col_jml])
    ss = [
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING",   (1,0), (1,-1),  5),
        ("RIGHTPADDING",  (2,0), (2,-1),  5),
        ("LINEABOVE",     (1,0), (2,0),   0.5, BORDER),
        ("GRID",          (1,0), (2,-1),  0.4, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]
    ti = len(sum_data) - 1
    ss += [
        ("BACKGROUND",    (1,ti), (2,ti), TOTAL_BG),
        ("TEXTCOLOR",     (1,ti), (2,ti), white),
        ("FONTNAME",      (1,ti), (2,ti), "Helvetica-Bold"),
        ("FONTSIZE",      (1,ti), (2,ti), 9.5),
        ("TOPPADDING",    (0,ti), (-1,ti), 5),
        ("BOTTOMPADDING", (0,ti), (-1,ti), 5),
    ]
    sum_tbl.setStyle(TableStyle(ss))
    story.append(sum_tbl)

    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "<i>*Biaya tersebut di atas sudah termasuk PPN (sesuai peraturan yang berlaku).</i>"
        if quo.get("ppn") else
        "<i>*Biaya tersebut di atas belum termasuk PPN (sesuai ketentuan yang berlaku).</i>",
        S["small"]))
    story.append(Spacer(1, 4*mm))
    return story


def build_pembayaran(S):
    story = []
    story.append(Paragraph("<b>PEMBAYARAN</b>", S["green"]))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph("Pembayaran dilakukan 2 (dua) tahap, yaitu:", S["normal"]))
    story.append(Paragraph("• Tahap I, sebesar 50 % dari nilai kontrak, dibayar saat penandatanganan surat kontrak.", S["bullet"]))
    story.append(Paragraph("• Tahap II, sebesar 50 % dari nilai kontrak, dibayarkan setelah pekerjaan selesai.", S["bullet"]))
    story.append(Spacer(1, 4*mm))
    return story


def build_garansi(quo, S):
    story = []
    if not quo.get("garansi_tahun"):
        return story

    thn   = quo["garansi_tahun"]
    jenis = quo.get("jenis_garansi", "Anti Rayap")
    is_pra = "pra" in quo.get("jenis_layanan", "").lower() or "Pra" in quo.get("perihal", "")

    story.append(Paragraph("<b>GARANSI</b>", S["green"]))
    story.append(Spacer(1, 1*mm))
    if is_pra:
        txt = (
            f"Untuk pekerjaan {jenis} ini, kami memberikan garansi bebas rayap yang dinyatakan "
            f"dalam Sertifikat jaminan sesuai standard Dep.PU.SK. SNI 03-2404-2000, yaitu: "
            f"Selama <b>{thn} ({_angka_ke_kata(thn)}) tahun</b> untuk area tanah yang dianti rayap, "
            f"terhitung selambat-lambatnya 1 tahun sejak pekerjaan dimulai."
        )
    else:
        txt = (
            f"Untuk pekerjaan {jenis} ini, kami memberikan garansi bebas rayap yang dinyatakan "
            f"dalam sertifikat jaminan sesuai standard Dep.PU.SK. SNI 03-2404-2000, yaitu: "
            f"Selama <b>{thn} ({_angka_ke_kata(thn)}) tahun</b>, terhitung sejak pekerjaan "
            f"anti rayap selesai secara keseluruhan."
        )
    story.append(Paragraph(txt, S["justify"]))
    story.append(Paragraph("Garansi tidak termasuk penggantian barang/material yang dirusak oleh serangan rayap.", S["normal"]))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("<b>PENGONTROLAN</b>", S["green"]))
    story.append(Spacer(1, 1*mm))
    for ctrl in [
        "Pengontrolan I dilakukan 1 bulan, setelah pekerjaan selesai.",
        "Pengontrolan II dilakukan 3 bulan, setelah pekerjaan selesai.",
        "Pengontrolan III dilakukan 6 bulan, setelah pekerjaan selesai.",
        "Pengontrolan IV dst dilakukan setelah pengontrolan ke III, dan 6 bulan sekali sampai garansi habis masa berlakunya.",
    ]:
        story.append(Paragraph(f"• {ctrl}", S["bullet"]))
    story.append(Spacer(1, 4*mm))
    return story


def build_penutup(quo, S):
    """
    Bagian penutup + tanda tangan.
    Mengambil nama dan nomor WA dari profil marketing yang ada di quo:
      quo["marketing_nama"] — nama marketing
      quo["marketing_wa"]   — nomor WA marketing (dari profil)
    """
    story = []
    story.append(Paragraph("<b>PENUTUP</b>", S["green"]))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph(
        "Demikian proposal penawaran harga dan lampiran ini kami sampaikan. Apabila informasi "
        "yang kami berikan belum memuaskan, kami siap memberikan presentasi di hadapan "
        "Bapak/Ibu. Untuk selanjutnya dapat menghubungi kami :", S["justify"]))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(f"• Kantor : {COMPANY['telp']}", S["bullet"]))
    # ── Nomor WA marketing dari profil ──
    nama_mkt = quo.get("marketing_nama", "")
    wa_mkt   = quo.get("marketing_wa", "")
    if wa_mkt:
        story.append(Paragraph(f"• {nama_mkt} : {wa_mkt}", S["bullet"]))

    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("Atas perhatian dan kerja sama yang diberikan kami ucapkan terima kasih.", S["normal"]))
    story.append(Spacer(1, 5*mm))

    # TTD — nama marketing dari profil di bawah garis
    ttd_data = [
        [Paragraph("Hormat kami,", S["normal"]), ""],
        [Paragraph("<b>PT Guci Emas Pratama</b>", S["bold"]), ""],
        ["", ""], ["", ""], ["", ""],
        [Paragraph(f"<b>{nama_mkt or 'Marketing'}</b>", S["bold"]), ""],
    ]
    ttd_tbl = Table(ttd_data, colWidths=[(W-MARGIN_L-MARGIN_R)*0.45, (W-MARGIN_L-MARGIN_R)*0.55])
    ttd_tbl.setStyle(TableStyle([
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TOPPADDING",    (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("LINEABOVE",     (0,5), (0,5),   0.8, DARK),
    ]))
    story.append(ttd_tbl)
    return story


# ════════════════════════════════════════════════════════════════════════════════
# MAIN GENERATOR
# ════════════════════════════════════════════════════════════════════════════════

def generate_quotation_pdf(quo_data: dict, output_path: str) -> str:
    """
    Generate PDF quotation PT Guci Emas Pratama.

    quo_data kunci penting (baru di v2):
        marketing_nama  : str  — dari profil user (wajib)
        marketing_wa    : str  — dari profil user (wajib, muncul di PDF)
        jenis_layanan   : str  — kunci dari LAYANAN_KATEGORI
                                 (menentukan AR/PCO & paragraf pembuka)
        paragraf_pembuka: str  — override otomatis jika diisi

    Kunci lainnya sama seperti v1.
    """
    quo_data["_calc"] = calc_totals(
        items           = quo_data["items"],
        biaya_tambahan  = quo_data.get("biaya_tambahan", []),
        diskon_pct      = quo_data.get("diskon_pct", 0),
        ppn             = quo_data.get("ppn", False),
        ppn_dpp_faktor  = quo_data.get("ppn_dpp_faktor"),
    )

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T,  bottomMargin=MARGIN_B + 18*mm,
        title=quo_data["no_surat"], author=COMPANY["name"],
    )

    S         = get_styles()
    usable_w  = W - MARGIN_L - MARGIN_R

    def on_page(canvas, doc):
        canvas.saveState()
        kop_h = 28*mm
        canvas.translate(MARGIN_L, H - MARGIN_T - kop_h)
        KopSurat(usable_w).drawOn(canvas, 0, 0)
        canvas.restoreState()

        canvas.saveState()
        canvas.translate(MARGIN_L, MARGIN_B)
        FooterKop(usable_w).drawOn(canvas, 0, 0)
        canvas.setFillColor(GRAY_LIGHT)
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(usable_w, -4*mm, f"Hal. {doc.page}")
        canvas.restoreState()

    story = [Spacer(1, 30*mm)]
    story.extend(build_header_info(quo_data, S))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4*mm))
    story.extend(build_biaya_section(quo_data, S))
    story.extend(build_pembayaran(S))
    story.extend(build_garansi(quo_data, S))
    story.extend(build_penutup(quo_data, S))
    story.append(Spacer(1, 6*mm))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return output_path


# ════════════════════════════════════════════════════════════════════════════════
# DEMO
# ════════════════════════════════════════════════════════════════════════════════

# Profil marketing (simulasi data dari Firestore / profil user)
PROFIL_MARKETING = {
    "u4": {"nama": "Siti Rahayu",     "wa": "0852-1234-5678", "jabatan": "Marketing Executive"},
    "u5": {"nama": "Andi Firmansyah", "wa": "0813-8765-4321", "jabatan": "Marketing Executive"},
    "u6": {"nama": "Jono Prasetyo",   "wa": "0852-8747-5522", "jabatan": "Senior Marketing"},
}

DEMO_QUOTATIONS = [
    # ── Demo 1: Anti Rayap Injeksi — Jono ──
    {
        "no_surat":  None,          # akan di-generate otomatis
        "tanggal":   datetime(2026, 3, 3),
        "kepada_nama": "PT Topindo Atlas Asia",
        "kepada_alamat_lines": ["Jl. Garuda No. 32, Kemayoran", "Jakarta Pusat - 10620"],
        "kepada_up": "Bpk. Hendra Saputra",
        "jenis_layanan": "anti_rayap_injeksi",
        "tipe_surat": "U",
        "items": [
            {"desc": "Anti Rayap Injeksi — Gedung Kantor Lt. 1 & 2", "qty": 631,  "unit": "m2", "harga": 30000},
            {"desc": "Anti Rayap Injeksi — Gudang No. 34",            "qty": 276,  "unit": "m2", "harga": 30000},
            {"desc": "Anti Rayap Injeksi — Gedung No. 39",            "qty": 1031, "unit": "m2", "harga": 30000},
        ],
        "biaya_tambahan": [],
        "diskon_pct": 8.34, "ppn": False,
        "garansi_tahun": 3, "jenis_garansi": "Anti Rayap",
        "_by": "u6",   # Jono
    },
    # ── Demo 2: Pest Control Kontrak — Siti ──
    {
        "no_surat":  None,
        "tanggal":   datetime(2026, 3, 3),
        "kepada_nama": "PT PLN (Persero) UP3 Bulungan",
        "kepada_alamat_lines": ["Jl. Sisingamangaraja No.1, Kebayoran Baru", "Jakarta Selatan"],
        "kepada_up": None,
        "jenis_layanan": "pest_umum",
        "tipe_surat": "K",
        "items": [
            {"desc": "Pest Control — 3 kali kunjungan pengendalian", "qty": 3, "unit": "Kali", "harga": 4900000},
            {"desc": "Rodent Control — 8 kali kunjungan per periode","qty": 1, "unit": "Lot",  "harga": 4500000},
        ],
        "biaya_tambahan": [],
        "diskon_pct": 0, "ppn": True, "ppn_dpp_faktor": 11/12,
        "garansi_tahun": None,
        "_by": "u4",   # Siti
    },
    # ── Demo 3: Anti Rayap Pra-Konstruksi — Andi ──
    {
        "no_surat":  None,
        "tanggal":   datetime(2026, 3, 3),
        "kepada_nama": "PT Oreka Solusi Kreatif",
        "kepada_alamat_lines": ["18 Office Park Lt. 10 Unit A, Jl. TB Simatupang No. 18", "Pasar Minggu, Jakarta Selatan"],
        "kepada_up": "Bapak Chairi",
        "jenis_layanan": "anti_rayap_pra",
        "tipe_surat": "U",
        "items": [
            {"desc": "Anti Rayap Pra-Konstruksi — Luas Permukaan", "qty": 220,   "unit": "m2", "harga": 30000},
            {"desc": "Sistem Pemipaan",                             "qty": 232.5, "unit": "m1", "harga": 35000},
        ],
        "biaya_tambahan": [{"label": "Biaya Transportasi & Akomodasi", "amount": 250000}],
        "diskon_pct": 0, "ppn": False,
        "garansi_tahun": 5, "jenis_garansi": "Anti Rayap Pra-Konstruksi",
        "_by": "u5",   # Andi
    },
    # ── Demo 4: Pest Control Fogging — Jono (demo nomor WA di PDF) ──
    {
        "no_surat":  None,
        "tanggal":   datetime(2026, 3, 3),
        "kepada_nama": "Ibu Dita",
        "kepada_alamat_lines": ["Jl. Dharmawangsa Raya No. 25", "Kebayoran Baru, Jakarta Selatan"],
        "kepada_up": None,
        "jenis_layanan": "pest_fogging",
        "tipe_surat": "U",
        "items": [
            {"desc": "Pest Control Fogging — Rumah Tinggal", "qty": 1, "unit": "Kali", "harga": 550000},
        ],
        "biaya_tambahan": [],
        "diskon_pct": 0, "ppn": False,
        "garansi_tahun": None,
        "_by": "u6",   # Jono
    },
]


if __name__ == "__main__":
    out_dir = "/mnt/user-data/outputs"
    os.makedirs(out_dir, exist_ok=True)

    # Reset log untuk demo bersih — override LOG_PATH ke folder output
    LOG_PATH = os.path.join(out_dir, "nomor_surat_log.json")
    if os.path.exists(LOG_PATH):
        os.remove(LOG_PATH)

    print("=" * 65)
    print("  DEMO: Generate PDF + Nomor Surat Otomatis")
    print("=" * 65)

    for i, q in enumerate(DEMO_QUOTATIONS, 1):
        uid     = q.pop("_by")
        profil  = PROFIL_MARKETING[uid]
        kategori = LAYANAN_KATEGORI.get(q["jenis_layanan"], "PCO")
        tipe     = q.pop("tipe_surat")

        # 1. Generate nomor surat
        entry = generate_nomor_surat(
            kategori  = kategori,
            tipe      = tipe,
            kepada    = q["kepada_nama"],
            by_uid    = uid,
            by_name   = profil["nama"],
            layanan   = q["jenis_layanan"],
        )
        q["no_surat"] = entry["no_surat"]

        # 2. Inject profil marketing ke quo_data
        q["marketing_nama"] = profil["nama"]
        q["marketing_wa"]   = profil["wa"]

        # 3. Generate PDF
        fname = f"{out_dir}/quotation_v2_{i:02d}.pdf"
        generate_quotation_pdf(q, fname)

        calc = q["_calc"]
        kat_label = "🛡 Anti Rayap" if kategori == "AR" else "🦟 Pest Control"
        print(f"\n[{i}] {kat_label} — {'Kontrak' if tipe == 'K' else 'Umum'}")
        print(f"     Nomor   : {entry['no_surat']}")
        print(f"     Kepada  : {q['kepada_nama']}")
        print(f"     Marketing: {profil['nama']} ({profil['wa']})")
        print(f"     Total   : Rp {calc['total']:,.0f}".replace(",", "."))
        print(f"     PDF     : {fname}")

    # 4. Tampilkan log
    print("\n" + "=" * 65)
    print("  LOG NOMOR SURAT (semua)")
    print("=" * 65)
    print_log_table(get_log())

    print("\n  Filter: Anti Rayap saja")
    print_log_table(get_log(kategori="AR"))

    print("\n  Filter: Kontrak saja")
    print_log_table(get_log(tipe="K"))

    print("\n  Filter: Surat milik Jono (u6)")
    print_log_table(get_log(by_uid="u6"))

    print(f"\n✅ Log disimpan di: {LOG_PATH}")
    print("✅ Semua PDF berhasil digenerate!")
