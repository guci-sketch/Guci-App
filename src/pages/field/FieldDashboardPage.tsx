import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export function FieldDashboardPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<"idle" | "working">("idle");

    const checkIn = () => {
        // Mock checkin
        setStatus("working");
    };

    const checkOut = () => {
        // Mock checkout
        setStatus("idle");
    };

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-2">Halo, {user?.name}</h2>
                <p className="text-gray-600 text-sm">Selamat bekerja dan utamakan keselamatan.</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800">Tugas Saat Ini</h3>
                {status === "idle" ? (
                    <button 
                        onClick={checkIn}
                        className="bg-green-600 text-white p-4 rounded-lg font-bold shadow-md hover:bg-green-700 active:scale-95 transition-transform"
                    >
                        SAYA SUDAH SAMPAI DI LOKASI
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                            Anda sedang dalam mode pengerjaan.
                        </div>
                        <a 
                            href="/field/ar-measure"
                            className="flex items-center justify-center bg-primary text-white p-3 rounded-lg font-bold shadow hover:bg-primary/90"
                        >
                            📐 Ukur Panjang Kerja (Meteran Kamera)
                        </a>
                        <button 
                            onClick={checkOut}
                            className="w-full bg-red-600 text-white p-3 rounded-lg font-bold shadow hover:bg-red-700"
                        >
                            Pekerjaan Selesai & Tutup Tugas
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
