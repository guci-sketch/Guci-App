import { createBrowserRouter, Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { AppLayout } from "../components/layout/AppLayout";
import { SuperAdminLayout } from "../components/layout/SuperAdminLayout";
import { ExecutorHome } from "../components/executor/ExecutorHome";

// Auth
import { LoginPage } from "../pages/auth/LoginPage";
import { UnauthorizedPage } from "../pages/auth/UnauthorizedPage";
import { SignupPage } from "../pages/auth/SignupPage";

// Pages — regular
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { QuotationPage } from "../pages/quotation/QuotationPage";
import { QuotationFormPage } from "../pages/quotation/QuotationFormPage";
import { QuotationEditPage } from "../pages/quotation/QuotationEditPage";
import { NomorSuratLogPage } from "../pages/nomor-surat/NomorSuratLogPage";
import { TeamPage } from "../pages/team/TeamPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { CashflowPage } from "../pages/cashflow/CashflowPage";
import { PerformaPage } from "../pages/performance/PerformaPage";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { KontrolRayapPage } from "../pages/customers/KontrolRayapPage";
import { InventoryPage } from "../pages/inventory/InventoryPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { StatusPHPage } from "../pages/status-ph/StatusPHPage";

// Pages — SUPERADMIN
import { CompaniesPage } from "../pages/super-admin/CompaniesPage";
import { CompanyUsersPage } from "../pages/super-admin/CompanyUsersPage";

import { FieldLayout } from "../pages/field/FieldLayout";
import { FieldDashboardPage } from "../pages/field/FieldDashboardPage";
import { ARMeasureTool } from "../pages/field/ARMeasureTool";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/unauthorized",
        element: <UnauthorizedPage />,
    },
    {
        path: "/signup",
        element: <SignupPage />,
    },

    // ── Super Admin routes ─────────────────────────────────────────────────────
    {
        path: "/super-admin",
        element: <SuperAdminLayout />,
        children: [
            {
                index: true,
                element: <Navigate to="/super-admin/companies" replace />,
            },
            {
                path: "companies",
                element: (
                    <RoleGuard allowedRoles={["SUPERADMIN"]}>
                        <CompaniesPage />
                    </RoleGuard>
                ),
            },
            {
                path: "companies/:companyId/users",
                element: (
                    <RoleGuard allowedRoles={["SUPERADMIN"]}>
                        <CompanyUsersPage />
                    </RoleGuard>
                ),
            },
        ],
    },

    // ── Regular app routes ─────────────────────────────────────────────────────
    {
        path: "/",
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: "dashboard",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING", "TEKNISI_LAPANGAN"]}>
                        <DashboardPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING"]}>
                        <QuotationPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations/new",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING"]}>
                        <QuotationFormPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations/:id/edit",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING", "ADMIN"]}>
                        <QuotationEditPage />
                    </RoleGuard>
                ),
            },
            {
                path: "nomor-surat-log",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <NomorSuratLogPage />
                    </RoleGuard>
                ),
            },
            {
                path: "team",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <TeamPage />
                    </RoleGuard>
                ),
            },
            {
                path: "profile",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING", "TEKNISI_LAPANGAN"]}>
                        <ProfilePage />
                    </RoleGuard>
                ),
            },
            {
                path: "customers",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING"]}>
                        <CustomersPage />
                    </RoleGuard>
                ),
            },
            {
                path: "kontrol-rayap",
                element: (
                    <RoleGuard allowedRoles={["ADMIN", "MARKETING"]}>
                        <KontrolRayapPage />
                    </RoleGuard>
                ),
            },
            {
                path: "inventory",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <InventoryPage />
                    </RoleGuard>
                ),
            },
            {
                path: "cashflow",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <CashflowPage />
                    </RoleGuard>
                ),
            },
            {
                path: "performance",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <PerformaPage />
                    </RoleGuard>
                ),
            },
            {
                path: "executor",
                element: (
                    <RoleGuard allowedRoles={["TEKNISI_LAPANGAN", "ADMIN"]}>
                        <ExecutorHome />
                    </RoleGuard>
                ),
            },
            {
                path: "status-ph",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <StatusPHPage />
                    </RoleGuard>
                ),
            },
            {
                path: "settings",
                element: (
                    <RoleGuard allowedRoles={["ADMIN"]}>
                        <SettingsPage />
                    </RoleGuard>
                ),
            },
        ],
    },
    {
        path: "/field",
        element: (
            <RoleGuard allowedRoles={["TEKNISI_LAPANGAN", "ADMIN", "SUPERADMIN"]}>
                <FieldLayout />
            </RoleGuard>
        ),
        children: [
            { path: "dashboard", element: <FieldDashboardPage /> },
            { path: "jobs", element: <div className="p-4">Tugas (Work Orders)</div> },
            { path: "history", element: <div className="p-4">Riwayat Pengerjaan</div> },
        ]
    },
    {
        path: "/field/ar-measure",
        element: (
            <RoleGuard allowedRoles={["TEKNISI_LAPANGAN", "ADMIN", "SUPERADMIN"]}>
                <ARMeasureTool />
            </RoleGuard>
        )
    }
]);