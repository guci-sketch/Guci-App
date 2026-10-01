import { useState, useMemo } from "react";
import { Users, Calendar, AlertCircle } from "lucide-react";

// Dummy data based on KONTROL RAYAP.xls
const DUMMY_KONTROL = [
    { id: "1", nama: "Ibu Lince Susanty", telp: "0811-9922-781", alamat: "Metland Puri, Blok F4 No. 28B", expiry: "2025-01-15", status: "Rumah Kosong belum ada yang nempati", type: "Retreatment" },
    { id: "2", nama: "Bapak Heri Mukti", telp: "0811-116-860", alamat: "Citra Fine Homes L05 No. 12", expiry: "2025-01-20", status: "Tidak bisa dihubungi", type: "Retreatment" },
    { id: "3", nama: "Bapak Johan", telp: "0819-0590-7420", alamat: "Jl. Alamanda Utama Blok 9F", expiry: "2024-11-10", status: "Sudah Retreatment Nov 2024", type: "Done" },
    { id: "4", nama: "Ibu Santi", telp: "0812-5938-1517", alamat: "Cluster Elista Sosenki No. 5", expiry: "2025-02-05", status: "Sudah Konfirmasi", type: "Retreatment" },
    { id: "5", nama: "Bapak Nico Nursalim", telp: "0811-8888-846", alamat: "Menteng Bintaro FB 2 No. 2", expiry: "2025-02-28", status: "Sudah Survey", type: "Follow Up" },
];

export function KontrolRayapPage() {
    const [month, setMonth] = useState("all");

    const filtered = useMemo(() => {
        if (month === "all") return DUMMY_KONTROL;
        return DUMMY_KONTROL.filter(d => d.expiry.startsWith(month));
    }, [month]);

    return (
        <div className="p-4 md:p-6 max-w-screen-lg mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-600" /> Kontrol Garansi & Retreatment
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Pantau jadwal habis garansi Anti Rayap pelanggan.</p>
                </div>
                <select 
                    value={month} 
                    onChange={e => setMonth(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                    <option value="all">Semua Bulan</option>
                    <option value="2024-11">November 2024</option>
                    <option value="2025-01">Januari 2025</option>
                    <option value="2025-02">Februari 2025</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-3 px-4 font-semibold">Nama / Kontak</th>
                            <th className="py-3 px-4 font-semibold">Alamat</th>
                            <th className="py-3 px-4 font-semibold">Habis Garansi</th>
                            <th className="py-3 px-4 font-semibold">Status / Keterangan</th>
                            <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4">
                                    <p className="font-bold text-slate-800">{row.nama}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Users size={12}/> {row.telp}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-xs max-w-[200px] truncate" title={row.alamat}>
                                    {row.alamat}
                                </td>
                                <td className="py-3 px-4">
                                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 w-max">
                                        <Calendar size={13} /> {row.expiry}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">{row.status}</td>
                                <td className="py-3 px-4 text-center">
                                    <button className="px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[var(--accent-hover)] transition-colors">
                                        Buat SPK
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">Tidak ada data retreatment di bulan ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}