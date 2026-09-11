const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const targetStr = `                  )}
                </div>
              </div>
            )}`;

const paginationUI = `                  )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      Menampilkan halaman {page} dari {totalPages} (Total: {totalCount} Laporan)
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}`;

code = code.replace(targetStr, paginationUI);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
