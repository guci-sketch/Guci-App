const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const brokenCode = `              </div>
            
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

code = code.replace(brokenCode, `              </div>\n            )}`);

const targetProjectEnd = `                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}`;

const newProjectEnd = `                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

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

code = code.replace(targetProjectEnd, newProjectEnd);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
