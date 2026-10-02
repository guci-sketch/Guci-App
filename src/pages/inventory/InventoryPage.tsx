import { useState } from "react";
import { Package, FileText, Search, Plus, Download, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

const DUMMY_STOK = [
    { id: "1", nama: "Cypergard 100 EC", kategori: "Chemical", satuan: "ml", stok: 70300, minAlert: 5000 },
    { id: "2", nama: "Safe 1 200 SL", kategori: "Chemical", satuan: "ml", stok: 11540, minAlert: 2000 },
    { id: "3", nama: "Portal", kategori: "Chemical", satuan: "ml", stok: 3900, minAlert: 1000 },
    { id: "4", nama: "Origin", kategori: "Chemical", satuan: "ml", stok: 800, minAlert: 500 },
    { id: "5", nama: "Antimus", kategori: "Perangkap", satuan: "gram", stok: 6518, minAlert: 1000 },
    { id: "6", nama: "Papan Lem", kategori: "Perangkap", satuan: "lembar", stok: 50, minAlert: 10 },
    { id: "7", nama: "Mesin Inject Dinamo", kategori: "Alat", satuan: "Unit", stok: 2, minAlert: 1 },
    { id: "8", nama: "B & G Sprayer", kategori: "Alat", satuan: "Unit", stok: 3, minAlert: 1 },
];

const DUMMY_LOGS = [
    { id: "l1", tanggal: "2026-10-01", item: "Cypergard 100 EC", masuk: 0, keluar: 1500, sisa: 68800, proyek: "Bapak Agung Nugroho", ket: "-" },
    { id: "l2", tanggal: "2026-10-01", item: "Safe 1 200 SL", masuk: 0, keluar: 50, sisa: 11490, proyek: "Bapak Agung Nugroho", ket: "-" },
    { id: "l3", tanggal: "2026-09-30", item: "Cypergard 100 EC", masuk: 70300, keluar: 0, sisa: 70300, proyek: "-", ket: "Stok Awal" },
];

export function InventoryPage() {
    const { user } = useAuthStore();
    const [tab, setTab] = useState<"stok" | "log" | "rekap">("stok");
    const [searchQ, setSearchQ] = useState("");

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([
            ["Nama Item", "Kategori (Chemical/Alat/Perangkap)", "Satuan", "Stok Awal", "Min Alert"]
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "Master_Stok");
        XLSX.writeFile(wb, "Template_Stok_Gudang.xlsx");
    };

    const [isImporting, setIsImporting] = useState(false);

    const handleImportBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.companyId) return;
        
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
                
                const insertPayload = data.map(row => ({
                    company_id: user.companyId,
                    nama: String(row["Nama Item"] || "Tanpa Nama"),
                    kategori: String(row["Kategori (Chemical/Alat/Perangkap)"] || "Lainnya"),
                    satuan: String(row["Satuan"] || "Pcs"),
                    stok: Number(row["Stok Awal"]) || 0,
                    min_alert: Number(row["Min Alert"]) || 0
                }));

                const { error } = await supabase.from('inventory_items').insert(insertPayload);
                if (error) throw error;

                alert(`Berhasil mengimpor ${insertPayload.length} item stok ke database!`);
                // Reload data here if there is a fetch function
            } catch (err) {
                console.error("Bulk Import Error:", err);
                alert(`Gagal import: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setIsImporting(false);
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };
    return (
        <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Package size={20} className="text-blue-600" /> Inventori & Gudang
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Kelola stok chemical, alat, dan pantau log pemakaian.</p>
                </div>
                {tab === "stok" && (
                    <div className="flex items-center gap-2">
                        <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <Download size={13} /> Template
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                            <UploadCloud size={13} /> Import
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportBulk} />
                        </label>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors shadow-sm">
                            <Plus size={13} /> Item Baru
                        </button>
                    </div>
                )}
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-max">
                <button onClick={() => setTab("stok")} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${tab === "stok" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                    Stok Gudang
                </button>
                <button onClick={() => setTab("log")} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${tab === "log" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                    Riwayat Keluar/Masuk
                </button>
                <button onClick={() => setTab("rekap")} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${tab === "rekap" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                    Rekap Bulanan
                </button>
            </div>

            {tab === "stok" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            <input type="text" placeholder="Cari item..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <th className="py-3 px-4 font-semibold">Nama Item</th>
                                    <th className="py-3 px-4 font-semibold">Kategori</th>
                                    <th className="py-3 px-4 font-semibold">Stok Saat Ini</th>
                                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {DUMMY_STOK.filter(s => s.nama.toLowerCase().includes(searchQ.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 font-bold text-slate-800">{s.nama}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">{s.kategori}</span>
                                        </td>
                                        <td className="py-3 px-4 font-mono font-medium">
                                            {s.stok.toLocaleString("id-ID")} {s.satuan}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {s.stok <= s.minAlert ? (
                                                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Stok Menipis</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Aman</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "log" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                                    <th className="py-3 px-4 font-semibold">Item</th>
                                    <th className="py-3 px-4 font-semibold">Masuk</th>
                                    <th className="py-3 px-4 font-semibold">Keluar</th>
                                    <th className="py-3 px-4 font-semibold">Sisa</th>
                                    <th className="py-3 px-4 font-semibold">Proyek / Klien</th>
                                    <th className="py-3 px-4 font-semibold">Ket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {DUMMY_LOGS.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{l.tanggal}</td>
                                        <td className="py-3 px-4 font-bold text-slate-800">{l.item}</td>
                                        <td className="py-3 px-4 text-emerald-600 font-mono">{l.masuk > 0 ? `+${l.masuk}` : "-"}</td>
                                        <td className="py-3 px-4 text-rose-600 font-mono">{l.keluar > 0 ? `-${l.keluar}` : "-"}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{l.sisa}</td>
                                        <td className="py-3 px-4 text-slate-700">{l.proyek}</td>
                                        <td className="py-3 px-4 text-slate-500 text-xs">{l.ket}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "rekap" && (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-slate-500">
                    <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-700">Modul Rekap Bulanan</p>
                    <p className="text-sm mt-1">Laporan komprehensif pemakaian obat per bulan akan tampil di sini.</p>
                </div>
            )}

        </div>
    );
}