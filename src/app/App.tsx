import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { AdminDashboard } from "@/widgets/admin/AdminDashboard";
import { ExecutorHome } from "@/widgets/executor/ExecutorHome";
import { LoginPage as LoginForm } from "@/widgets/auth/LoginForm";

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

    // Role mapping
    const role = user.role;
    if (role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MARKETING') {
        return <AdminDashboard />;
    } else {
        return <ExecutorHome />;
    }
};

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/*" element={<Shell />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}