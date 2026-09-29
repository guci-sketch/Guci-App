import { useState, useRef, useEffect } from "react";
import { Camera, Ruler, Save, RefreshCw, Layers } from "lucide-react";

export function ARMeasureTool() {
    const [mode, setMode] = useState<"ar" | "fallback" | null>(null);
    const [distance, setDistance] = useState<number>(0);
    const [lubangBor, setLubangBor] = useState<number>(0);
    const [kebutuhanObat, setKebutuhanObat] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Cek support WebXR
        if ('xr' in navigator) {
            (navigator as any).xr.isSessionSupported('immersive-ar')
                .then((supported: boolean) => {
                    setMode(supported ? "ar" : "fallback");
                });
        } else {
            setMode("fallback");
        }
    }, []);

    const startCamera = async () => {
        if (!videoRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Camera error:", err);
        }
    };

    useEffect(() => {
        if (mode === "fallback") {
            startCamera();
        }
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
            }
        }
    }, [mode]);

    const handleMockMeasure = () => {
        // MOCK measurement for demo (since real WebXR needs https & device)
        const mockDistance = parseFloat((Math.random() * 15 + 2).toFixed(1)); // 2 to 17 meters
        setDistance(mockDistance);
        
        // Estimasi Lubang Bor Otomatis: Jarak / 0.35
        const lubang = Math.round(mockDistance / 0.35);
        setLubangBor(lubang);

        // Estimasi Obat (SNI 2404: 5 L/m')
        setKebutuhanObat(mockDistance * 5);
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white relative">
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <h1 className="font-bold text-lg">Meteran Kamera</h1>
                <div className="flex gap-2">
                    <span className="bg-primary/80 px-2 py-1 rounded text-xs">
                        {mode === "ar" ? "WebXR Active" : "Tile Scale Fallback"}
                    </span>
                </div>
            </div>

            {/* Viewfinder */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {mode === "fallback" ? (
                    <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 w-full h-full object-cover bg-gray-900 flex items-center justify-center">
                        <span className="text-gray-400">WebXR Session Will Render Here</span>
                    </div>
                )}
                
                {/* Crosshair */}
                <div className="w-12 h-12 border-2 border-green-500 rounded-full z-10 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>

                {/* Guide lines mock */}
                {distance > 0 && (
                    <div className="absolute bottom-1/3 w-3/4 h-1 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] z-10 rotate-3 flex items-center justify-center">
                        <span className="bg-black/70 text-yellow-400 px-2 py-1 rounded font-bold text-sm -mt-8 border border-yellow-400">
                            {distance} m'
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom HUD */}
            <div className="bg-gray-900 pb-safe z-10 rounded-t-2xl border-t border-gray-800">
                <div className="p-4 flex gap-4">
                    <div className="flex-1 bg-gray-800 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">Panjang Tembok</div>
                        <div className="font-mono text-2xl font-bold text-green-400">{distance > 0 ? distance : "--"} <span className="text-sm">m'</span></div>
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">Estimasi Lubang</div>
                        <div className="font-mono text-2xl font-bold text-yellow-400">{lubangBor > 0 ? lubangBor : "--"} <span className="text-sm">titik</span></div>
                    </div>
                </div>
                
                <div className="px-4 pb-4">
                    <div className="mb-3 text-xs text-center text-gray-500">
                        {distance > 0 ? `Kebutuhan obat: ${kebutuhanObat.toFixed(1)} Liter (SNI 2404)` : "Arahkan kamera ke pangkal dinding, ketuk Titik A"}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleMockMeasure}
                            className="flex-1 bg-green-600 active:bg-green-700 py-4 rounded-xl flex items-center justify-center font-bold gap-2"
                        >
                            <Ruler size={20} />
                            Ketuk Titik Ujung
                        </button>
                        <button className="bg-blue-600 active:bg-blue-700 p-4 rounded-xl flex items-center justify-center font-bold">
                            <Save size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
