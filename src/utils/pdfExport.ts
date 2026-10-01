import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkReport, Project } from '../types';

export async function exportReportToPdf(report: WorkReport, project: Project) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Laporan Hasil Pekerjaan (Fieldwork Report)', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Proyek: ${project.projectName}`, 14, 32);
  doc.text(`Klien: ${project.clientName}`, 14, 38);
  doc.text(`Pelaksana: ${report.executorName || '-'}`, 14, 44);
  doc.text(`Waktu Mulai: ${report.checkInAt ? new Date(report.checkInAt).toLocaleString('id-ID') : '-'}`, 14, 50);
  doc.text(`Waktu Selesai: ${report.checkOutAt ? new Date(report.checkOutAt).toLocaleString('id-ID') : '-'}`, 14, 56);
  
  // Service Data
  doc.setFontSize(14);
  doc.text('Rincian Layanan', 14, 70);
  
  autoTable(doc, {
    startY: 75,
    head: [['Informasi', 'Detail']],
    body: [
      ['Jenis Layanan', project.serviceType.replace(/_/g, ' ')],
      ['Hama Sasaran', project.pestTarget || '-'],
      ['Status', report.status],
      ['Skor Risiko', String(report.riskScore)],
    ],
  });

  let finalY = (doc as any).lastAutoTable.finalY || 75;

  if (report.treatmentRecord) {
    doc.setFontSize(14);
    doc.text('Data Treatment (Perlakuan)', 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Metode', 'Bahan Kimia', 'Dosis', 'Area (m2)']],
      body: [
        [
          report.treatmentRecord.applicationMethod.replace(/_/g, ' '),
          report.treatmentRecord.chemicalName,
          report.treatmentRecord.dosage,
          report.treatmentRecord.treatmentAreaSqm?.toString() || '-'
        ]
      ],
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  if (report.customerName) {
    doc.setFontSize(14);
    doc.text('Review Pelanggan', 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Nama', 'Telepon', 'Feedback']],
      body: [
        [report.customerName, report.customerPhone || '-', report.customerFeedback || '-']
      ],
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  doc.save(`Report_${project.projectName.replace(/\\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
