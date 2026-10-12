import React, { useState } from 'react'
import { UserRole } from '@/shared/utils/rbacEngine'
import { Badge } from '@/shared/ui/Badge'

export interface SidebarMenuItem {
  id: string
  label: string
  iconText: string
  allowedRoles: UserRole[]
  danger?: boolean
}

export interface AppLayoutProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  activeTab: string
  onTabChange: (tabId: string) => void
  menuItems: SidebarMenuItem[]
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  menuItems,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const visibleMenuItems = menuItems.filter((item) =>
    item.allowedRoles.includes(currentRole)
  )

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header Barventis Scale */}
      <header className="h-12 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none lg:hidden"
            aria-label="Toggle Menu"
          >
            ☰
          </button>
          <div>
            <span className="text-[0.95rem] font-bold text-slate-900 tracking-tight">
              FieldWork Enterprise
            </span>
            <span className="hidden sm:inline-block text-[0.72rem] text-slate-500 font-medium ml-2">
              PT Guci Emas Pratama &bull; Barventis Layout
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="valid">ONLINE</Badge>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[0.68rem] text-slate-500 font-semibold">Peran:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-[0.72rem] font-bold bg-transparent text-indigo-900 focus:outline-none cursor-pointer"
            >
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="TEKNISI_LAPANGAN">TEKNISI_LAPANGAN</option>
              <option value="MARKETING">MARKETING</option>
              <option value="INVENTORY">INVENTORY</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
            </select>
          </div>
        </div>
      </header>

      {/* Body Area with Responsive Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Nav */}
        <aside
          className={`fixed lg:static top-12 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-2.5 border-b border-slate-100 flex items-center justify-between text-[0.72rem] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Menu Operasional</span>
            <span className="text-[0.65rem] font-mono text-indigo-600">{visibleMenuItems.length} Menu</span>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id)
                    setIsSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.82rem] font-medium transition-all text-left ${
                    isActive
                      ? item.danger
                        ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                        : 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <span className="w-5 text-center font-mono text-base">{item.iconText}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="p-2.5 border-t border-slate-100 text-[0.68rem] text-slate-400 text-center">
            PT Guci Emas Pratama &bull; FSD Enterprise
          </div>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
