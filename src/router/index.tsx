import { createBrowserRouter, Navigate } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";
import { AppLayout } from "../components/layout/AppLayout";
import { SuperAdminLayout } from "../components/layout/SuperAdminLayout";

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
import { ComingSoonPage } from "../pages/ComingSoonPage";
import { CashflowPage } from "../pages/cashflow/CashflowPage";
import { PerformaPage } from "../pages/performance/PerformaPage";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { StatusPHPage } from "../pages/status-ph/StatusPHPage";
import { TrackingPage } from "../pages/tracking/TrackingPage";

// Pages — super_admin
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
                    <RoleGuard allowedRoles={["super_admin"]}>
                        <CompaniesPage />
                    </RoleGuard>
                ),
            },
            {
                path: "companies/:companyId/users",
                element: (
                    <RoleGuard allowedRoles={["super_admin"]}>
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
                    <RoleGuard allowedRoles={["administrator", "admin_ops", "marketing", "teknisi"]}>
                        <DashboardPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops", "marketing"]}>
                        <QuotationPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations/new",
                element: (
                    <RoleGuard allowedRoles={["administrator", "marketing"]}>
                        <QuotationFormPage />
                    </RoleGuard>
                ),
            },
            {
                path: "quotations/:id/edit",
                element: (
                    <RoleGuard allowedRoles={["administrator", "marketing", "admin_ops"]}>
                        <QuotationEditPage />
                    </RoleGuard>
                ),
            },
            {
                path: "nomor-surat-log",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops"]}>
                        <NomorSuratLogPage />
                    </RoleGuard>
                ),
            },
            {
                path: "team",
                element: (
                    <RoleGuard allowedRoles={["administrator"]}>
                        <TeamPage />
                    </RoleGuard>
                ),
            },
            {
                path: "profile",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops", "marketing", "teknisi"]}>
                        <ProfilePage />
                    </RoleGuard>
                ),
            },
            {
                path: "customers",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops", "marketing"]}>
                        <CustomersPage />
                    </RoleGuard>
                ),
            },
            {
                path: "cashflow",
                element: (
                    <RoleGuard allowedRoles={["administrator"]}>
                        <CashflowPage />
                    </RoleGuard>
                ),
            },
            {
                path: "performance",
                element: (
                    <RoleGuard allowedRoles={["administrator"]}>
                        <PerformaPage />
                    </RoleGuard>
                ),
            },
            {
                path: "tracking",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops"]}>
                        <TrackingPage />
                    </RoleGuard>
                ),
            },
            {
                path: "status-ph",
                element: (
                    <RoleGuard allowedRoles={["administrator", "admin_ops"]}>
                        <StatusPHPage />
                    </RoleGuard>
                ),
            },
            {
                path: "settings",
                element: (
                    <RoleGuard allowedRoles={["administrator"]}>
                        <SettingsPage />
                    </RoleGuard>
                ),
            },
        ],
    },
    {
        path: "/field",
        element: (
            <RoleGuard allowedRoles={["teknisi", "administrator", "super_admin"]}>
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
            <RoleGuard allowedRoles={["teknisi", "administrator", "super_admin"]}>
                <ARMeasureTool />
            </RoleGuard>
        )
    }
]);