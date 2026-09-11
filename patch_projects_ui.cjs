const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const targetUI = `{activeTab === 'projects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(proj => {`;

const newUI = `{activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari proyek, klien, alamat, pelaksana..." 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={projectServiceType}
                    onChange={e => setProjectServiceType(e.target.value)}
                  >
                    <option value="ALL">Semua Layanan</option>
                    {SERVICE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select 
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={projectStatus}
                    onChange={e => setProjectStatus(e.target.value)}
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="OPEN">Terbuka</option>
                    <option value="LOCKED">Terkunci</option>
                  </select>
                </div>
                
                {projects.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm font-semibold">Tidak ada proyek yang sesuai dengan pencarian Anda.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map(proj => {`;

code = code.replace(targetUI, newUI);

const targetBottom = `              </div>
            )}`;

const newBottom = `              </div>
            
                    {projectTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <span className="text-xs font-semibold text-[var(--text-muted)]">
                          Menampilkan halaman {projectPage} dari {projectTotalPages} (Total: {projectTotalCount} Proyek)
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setProjectPage(p => Math.max(1, p - 1))}
                            disabled={projectPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Sebelumnya
                          </button>
                          <button 
                            onClick={() => setProjectPage(p => Math.min(projectTotalPages, p + 1))}
                            disabled={projectPage === projectTotalPages}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}`;

code = code.replace(targetBottom, newBottom);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
