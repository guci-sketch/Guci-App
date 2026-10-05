import { Outlet } from "react-router-dom";
import { useAuth } from '@/shared/hooks/useAuth';

export function FieldLayout() {
    const { user } = useAuth();
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-primary text-white p-4 shadow flex justify-between items-center">
                <h1 className="text-lg font-bold">FieldWork</h1>
                <div className="text-sm">
                    {user?.name}
                </div>
            </header>
            <main className="flex-1 overflow-auto pb-16">
                <Outlet />
            </main>
            <nav className="bg-white border-t fixed bottom-0 w-full flex justify-around p-3 text-sm text-gray-500 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <a href="/field/dashboard" className="flex flex-col items-center hover:text-primary">
                    <span className="text-lg mb-1">🏠</span>
                    Beranda
                </a>
                <a href="/field/jobs" className="flex flex-col items-center hover:text-primary">
                    <span className="text-lg mb-1">📋</span>
                    Tugas
                </a>
                <a href="/field/history" className="flex flex-col items-center hover:text-primary">
                    <span className="text-lg mb-1">🕒</span>
                    Riwayat
                </a>
            </nav>
        </div>
    );
}
