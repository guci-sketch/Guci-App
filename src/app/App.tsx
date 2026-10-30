import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { AdminDashboard } from "@/widgets/admin/AdminDashboard";
import { ExecutorHome } from "@/widgets/executor/ExecutorHome";
import { LoginPage as LoginForm } from "@/widgets/auth/LoginForm";
import { SignupPage } from "@/pages/auth/SignupPage";
import { QuotationFormPage } from "@/pages/quotation/QuotationFormPage";
import { QuotationEditPage } from "@/pages/quotation/QuotationEditPage";

const Shell = () => {
    const { user, status } = useAuth();
    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <span className="w-8 h-8 border-2 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'unauthenticated' || !user) {
        return <LoginForm />;
    }

    const role = user.role;
    if (role === 'TEKNISI_LAPANGAN') {
        return <ExecutorHome />;
    }
    return <AdminDashboard />;
};

const ProtectedPage = ({ children, disallowRoles = [] }: { children: React.ReactNode; disallowRoles?: string[] }) => {
    const { user, status } = useAuth();
    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <span className="w-8 h-8 border-2 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
        );
    }
    if (status === 'unauthenticated' || !user) {
        return <LoginForm />;
    }
    // MASTER_SUPER_ADMIN hanya dapat mengakses konsol manajemen Perusahaan & Token Undangan Superadmin
    if (user.role === 'MASTER_SUPER_ADMIN' || disallowRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return <div className="min-h-screen bg-[var(--bg-primary)] p-4 sm:p-6">{children}</div>;
};

const AuthRoute = ({ component: Component }: { component: React.ComponentType }) => {
    const { user, status } = useAuth();
    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <span className="w-8 h-8 border-2 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
        );
    }
    if (user && status === 'authenticated') {
        return <Navigate to="/" replace />;
    }
    return <Component />;
};

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<AuthRoute component={LoginForm} />} />
                    <Route path="/signup" element={<AuthRoute component={SignupPage} />} />
                    <Route path="/quotations/new" element={<ProtectedPage disallowRoles={['SUPERADMIN', 'TEKNISI_LAPANGAN', 'INVENTORY']}><QuotationFormPage /></ProtectedPage>} />
                    <Route path="/quotations/:id/edit" element={<ProtectedPage disallowRoles={['TEKNISI_LAPANGAN', 'INVENTORY']}><QuotationEditPage /></ProtectedPage>} />
                    <Route path="/*" element={<Shell />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}