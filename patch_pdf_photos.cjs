const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

code = code.replace(
  "doc.save(`Report_${project.name.replace(/\\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);",
  `  if (report.photos && report.photos.length > 0) {
    doc.setFontSize(14);
    doc.text('Dokumentasi Foto', 14, finalY + 15);
    const photoBody = report.photos.map(p => {
      return [
        p.photoType.replace(/_/g, ' '),
        p.photoTag === 'BEFORE' ? 'Sebelum' : p.photoTag === 'AFTER' ? 'Sesudah' : '-',
        new Date(p.capturedAt).toLocaleString('id-ID'),
        \`\${window.location.origin}\${p.url}\`
      ];
    });
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Jenis Foto', 'Kondisi', 'Waktu Pengambilan', 'Tautan (Link) Foto']],
      body: photoBody,
    });
  }

  doc.save(\`Report_\${project.name.replace(/\\s/g, '_')}_\${new Date().toISOString().slice(0, 10)}.pdf\`);`
);

fs.writeFileSync('src/utils/pdfExport.ts', code);
