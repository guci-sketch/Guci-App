sed -i '/<div className="clean-card bg-\[var(--bg-card)\] rounded-xl border border-\[var(--border-subtle)\]  overflow-hidden p-4">/a \
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">\
                  <AllProjectsMap projects={projects.filter(p => p.status === "ACTIVE" || p.status === "PENDING")} userLocations={userLocations} height="400px" />\
                </div>\
' src/components/admin/AdminDashboard.tsx
