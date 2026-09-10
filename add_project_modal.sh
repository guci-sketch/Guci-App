sed -i '/{viewingPhoto &&/i \
      {/* Project Detail Modal */}\
      {selectedProject && (\
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/60 p-4 sm:p-6" onClick={() => setSelectedProject(null)}>\
          <div className="relative w-full max-w-3xl clean-card bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>\
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">\
              <div className="flex items-center gap-3">\
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${getServiceTypeMeta(selectedProject.serviceType).badgeClass}`}>\
                  {getServiceTypeMeta(selectedProject.serviceType).label}\
                </span>\
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{selectedProject.projectName}</h2>\
              </div>\
              <button onClick={() => setSelectedProject(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-slate-200/60 transition-colors"><X size={20} /></button>\
            </div>\
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">\
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">\
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Informasi Proyek</h4>\
                  <div><span className="text-[var(--text-muted)] block text-[10px]">KLIEN</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.clientName}</span></div>\
                  <div><span className="text-[var(--text-muted)] block text-[10px]">ALAMAT</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.address}</span></div>\
                  <div><span className="text-[var(--text-muted)] block text-[10px]">SASARAN HAMA</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.targetPests?.length ? selectedProject.targetPests.join(", ") : selectedProject.pestTarget || "-"}</span></div>\
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">\
                    <div><span className="text-[var(--text-muted)] block text-[10px]">KONTRAK</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.contractType === "RECURRING" ? "Berkala" : "Sekali Layanan"}</span></div>\
                    <div><span className="text-[var(--text-muted)] block text-[10px]">TANGGAL / JADWAL</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.workDate}</span></div>\
                    <div><span className="text-[var(--text-muted)] block text-[10px]">GARANSI</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.warrantyMonths > 0 ? `${selectedProject.warrantyMonths} bln` : "-"}</span></div>\
                    <div><span className="text-[var(--text-muted)] block text-[10px]">LUAS AREA</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.buildingAreaSqm ? `${selectedProject.buildingAreaSqm} m²` : "-"}</span></div>\
                  </div>\
                </div>\
                <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] h-48 sm:h-auto">\
                  <LocationMap \
                    projectName={selectedProject.projectName}\
                    projectLat={selectedProject.latitude}\
                    projectLng={selectedProject.longitude}\
                    projectRadius={selectedProject.radius}\
                  />\
                </div>\
              </div>\
              <div className="space-y-3">\
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Histori Laporan Pekerjaan</h4>\
                <div className="space-y-2">\
                  {reports.filter(r => r.projectId === selectedProject.id).length === 0 ? (\
                    <div className="text-sm text-[var(--text-muted)] text-center py-6 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">\
                      Belum ada laporan untuk proyek ini.\
                    </div>\
                  ) : (\
                    reports.filter(r => r.projectId === selectedProject.id).map(r => (\
                      <div key={r.id} className="clean-card bg-[var(--bg-card)] p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:border-slate-300 transition-colors">\
                        <div>\
                          <div className="flex items-center gap-2 mb-1">\
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${STATUS_OPTIONS.find(s => s.value === r.status)?.colorClass || "bg-slate-50 text-slate-700 border-slate-200"}`}>\
                              {STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status}\
                            </span>\
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>\
                          </div>\
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{r.executorName}</div>\
                          <div className="text-xs text-[var(--text-muted)]">Check-in: {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</div>\
                        </div>\
                        <button \
                          onClick={() => { setSelectedProject(null); setSelectedReportId(r.id); }}\
                          className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] whitespace-nowrap bg-[var(--accent-muted)] px-3 py-1.5 rounded-lg shrink-0 text-center"\
                        >\
                          Lihat Detail\
                        </button>\
                      </div>\
                    ))\
                  )}\
                </div>\
              </div>\
            </div>\
          </div>\
        </div>\
      )}' src/components/admin/AdminDashboard.tsx
