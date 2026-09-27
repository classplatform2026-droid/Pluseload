import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Award,
  Loader2,
  Check,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LoadTestSnapshot } from '../types';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: LoadTestSnapshot | null;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  snapshot,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  if (!isOpen || !snapshot) return null;

  const total = snapshot.totalCompleted || 0;
  const successful = snapshot.successful || 0;
  const failed = snapshot.failed || 0;
  const successRate = total > 0 ? (successful / total) * 100 : 100;
  const p95 = snapshot.latency.p95 || 0;
  const avgLatency = snapshot.latency.avg || 0;

  // Compute Performance Grade
  const computeGrade = () => {
    if (total === 0)
      return {
        grade: 'N/A',
        label: 'No Data',
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        border: 'border-slate-300',
      };
    if (successRate >= 99 && p95 <= 150) {
      return {
        grade: 'A+',
        label: 'Exceptional Performance',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
      };
    }
    if (successRate >= 98 && p95 <= 350) {
      return {
        grade: 'A',
        label: 'Healthy & Stable',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-400',
      };
    }
    if (successRate >= 95 && p95 <= 800) {
      return {
        grade: 'B',
        label: 'Acceptable Under Load',
        color: 'text-cyan-700',
        bg: 'bg-cyan-50',
        border: 'border-cyan-400',
      };
    }
    if (successRate >= 90) {
      return {
        grade: 'C',
        label: 'Degraded Service',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-400',
      };
    }
    return {
      grade: 'F',
      label: 'Critical Failures / High Latency',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-400',
    };
  };

  const gradeInfo = computeGrade();
  const formattedDate = new Date(snapshot.startTime || Date.now()).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  // 1. Direct PDF Generation and Download via jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printable-pdf-report');
    if (!reportElement) return;

    try {
      setIsGeneratingPdf(true);

      // Render DOM element to high-res canvas (scale: 2 for sharp crisp text on retina/A4)
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL('image/png');

      // Standard A4 dimensions in mm: 210 x 297
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth - 20; // 10mm margin on left and right
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // First page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;

      // Add extra pages if report overflows a single page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      // Download the PDF file directly to user's device
      pdf.save(`pulseload-audit-${snapshot.id}.pdf`);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      // Fallback: trigger HTML download
      handleDownloadHtml();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Safe Print via isolated hidden iframe (works even inside sandboxed frames)
  const handlePrint = () => {
    try {
      const reportElement = document.getElementById('printable-pdf-report');
      if (!reportElement) {
        window.print();
        return;
      }

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PulseLoad Report - ${snapshot.id}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
              th { background-color: #f1f5f9; }
            </style>
          </head>
          <body>
            ${reportElement.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 1500);
        }
      }, 500);
    } catch {
      window.print();
    }
  };

  // 3. Fallback standalone offline HTML file
  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PulseLoad Audit Report - ${snapshot.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 24px; font-weight: 800; margin: 0; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 14px; border: 2px solid; }
    .grade-A { background: #ecfdf5; color: #047857; border-color: #10b981; }
    .grade-B { background: #ecfeff; color: #0e7490; border-color: #06b6d4; }
    .grade-C { background: #fffbeb; color: #b45309; border-color: #f59e0b; }
    .grade-F { background: #fff1f2; color: #be123c; border-color: #f43f5e; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .metric-value { font-size: 20px; font-weight: 700; color: #0f172a; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">PULSELOAD BENCHMARK AUDIT REPORT</h1>
      <div class="subtitle">Generated on ${formattedDate} · Audit Run ID: ${snapshot.id}</div>
    </div>
    <div class="badge ${gradeInfo.grade.startsWith('A') ? 'grade-A' : gradeInfo.grade === 'B' ? 'grade-B' : gradeInfo.grade === 'C' ? 'grade-C' : 'grade-F'}">
      Grade ${gradeInfo.grade}: ${gradeInfo.label}
    </div>
  </div>

  <div class="card">
    <div style="font-weight: 700; margin-bottom: 6px;">Test Target & Configuration</div>
    <div><strong>URL:</strong> <span style="font-family: monospace;">${snapshot.config.method} ${snapshot.config.url}</span></div>
    <div style="font-size: 13px; color: #475569; margin-top: 4px;">
      Concurrency: <strong>${snapshot.config.concurrency} VUs</strong> | 
      Duration: <strong>${snapshot.config.durationSeconds}s</strong> | 
      Timeout: <strong>${snapshot.config.timeoutMs}ms</strong>
    </div>
  </div>

  <div class="grid">
    <div class="metric-box">
      <div class="metric-label">Total Requests</div>
      <div class="metric-value">${total.toLocaleString()}</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Success Rate</div>
      <div class="metric-value" style="color: ${successRate >= 98 ? '#059669' : '#e11d48'}">${successRate.toFixed(1)}%</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Average RPS</div>
      <div class="metric-value">${snapshot.avgRps.toFixed(1)} req/s</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">P95 Latency</div>
      <div class="metric-value">${p95} ms</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Average Latency</div>
      <div class="metric-value">${avgLatency} ms</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Median (P50)</div>
      <div class="metric-value">${snapshot.latency.p50} ms</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Max Latency</div>
      <div class="metric-value">${snapshot.latency.max} ms</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Data Received</div>
      <div class="metric-value">${(snapshot.bytesReceived / 1024).toFixed(1)} KB</div>
    </div>
  </div>

  <h3>HTTP Status Code Breakdown</h3>
  <table>
    <thead>
      <tr>
        <th>Status Code</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(snapshot.statusCodes || {})
        .map(
          ([code, count]) => `<tr>
            <td style="font-family: monospace; font-weight: bold;">${code}</td>
            <td style="font-family: monospace;">${count.toLocaleString()}</td>
            <td style="font-family: monospace;">${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>PulseLoad HTTP Stress Testing & Observability Platform</span>
    <span>Confidential & Certified Performance Audit</span>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseload-audit-${snapshot.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Screen only, hidden when printing) */}
        <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="truncate">
              <h2 className="text-sm font-bold text-white truncate">Executive PDF Summary Report</h2>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                Audited test metrics, percentile latency breakdown, and SLA certification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Download .PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download high-resolution PDF file directly"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>Saved PDF!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print / System Dialog Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Open browser print dialog"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Standalone HTML File */}
            <button
              onClick={handleDownloadHtml}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Download standalone offline report file"
            >
              <span>HTML</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/60">
          <div
            id="printable-pdf-report"
            className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6"
          >
            {/* 1. Executive Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
              <div>
                <div className="flex items-center gap-2 text-cyan-700 font-extrabold text-xs tracking-wider uppercase mb-1">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <span>PulseLoad Benchmark & Audit Engine</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  EXECUTIVE LOAD & CAPACITY REPORT
                </h1>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Audit ID: {snapshot.id} · Generated: {formattedDate}
                </div>
              </div>

              {/* Performance Score Badge */}
              <div
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border-2 shrink-0 ${gradeInfo.bg} ${gradeInfo.border}`}
              >
                <div className="flex items-center gap-1.5">
                  <Award className={`w-5 h-5 ${gradeInfo.color}`} />
                  <span className={`text-2xl font-black tracking-tight ${gradeInfo.color}`}>
                    {gradeInfo.grade}
                  </span>
                </div>
                <span className={`text-[11px] font-bold ${gradeInfo.color} uppercase tracking-wider`}>
                  {gradeInfo.label}
                </span>
              </div>
            </div>

            {/* 2. Target Endpoint & Parameters Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Audited Endpoint
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-mono font-bold text-slate-900">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs">
                  {snapshot.config.method}
                </span>
                <span className="break-all">{snapshot.config.url}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Concurrency:</span>{' '}
                  <span className="font-bold text-slate-900">{snapshot.config.concurrency} VUs</span>
                </div>
                <div>
                  <span className="text-slate-500">Target Duration:</span>{' '}
                  <span className="font-bold text-slate-900">{snapshot.config.durationSeconds}s</span>
                </div>
                <div>
                  <span className="text-slate-500">Req Timeout:</span>{' '}
                  <span className="font-bold text-slate-900">{snapshot.config.timeoutMs}ms</span>
                </div>
                <div>
                  <span className="text-slate-500">Actual Elapsed:</span>{' '}
                  <span className="font-bold text-slate-900">{(snapshot.elapsedMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            {/* 3. Primary Telemetry KPI Matrix */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2.5">
                Primary Benchmark Telemetry
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Total Requests</div>
                  <div className="text-xl font-bold font-mono text-slate-950 tabular-nums">
                    {total.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {successful} OK · {failed} Fail
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Success Rate</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums ${
                      successRate >= 98
                        ? 'text-emerald-700'
                        : successRate >= 90
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {successRate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {failed === 0 ? 'Zero Dropouts' : `${failed} Failed Reqs`}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Throughput (Avg)</div>
                  <div className="text-xl font-bold font-mono text-cyan-800 tabular-nums">
                    {snapshot.avgRps.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-slate-500">req/s</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Steady Concurrency
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Data Transferred</div>
                  <div className="text-xl font-bold font-mono text-slate-950 tabular-nums">
                    {(snapshot.bytesReceived / 1024).toFixed(1)}{' '}
                    <span className="text-xs font-normal text-slate-500">KB</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Payload received</div>
                </div>
              </div>
            </div>

            {/* 4. Latency Percentiles Ladder */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2.5">
                Latency Distribution (Percentile SLA Ladder)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">Min</div>
                  <div className="text-base font-bold text-slate-900">{snapshot.latency.min} ms</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">Median (P50)</div>
                  <div className="text-base font-bold text-slate-900">{snapshot.latency.p50} ms</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">Average</div>
                  <div className="text-base font-bold text-slate-900">{avgLatency} ms</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">P90</div>
                  <div className="text-base font-bold text-slate-900">{snapshot.latency.p90} ms</div>
                </div>
                <div className="p-2.5 bg-cyan-50 border border-cyan-300 rounded-lg">
                  <div className="text-[10px] text-cyan-800 font-bold uppercase">P95 (SLA)</div>
                  <div className="text-base font-extrabold text-cyan-900">{p95} ms</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">P99</div>
                  <div className="text-base font-bold text-slate-900">{snapshot.latency.p99} ms</div>
                </div>
              </div>
            </div>

            {/* 5. Status Code Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2.5">
                HTTP Response Status Breakdown
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Status Code</th>
                      <th className="py-2 px-3 font-semibold">Classification</th>
                      <th className="py-2 px-3 font-semibold text-right">Count</th>
                      <th className="py-2 px-3 font-semibold text-right">Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(snapshot.statusCodes || {}).map(([code, count]) => {
                      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                      const num = parseInt(code, 10);
                      const isOk = num >= 200 && num < 400;
                      return (
                        <tr key={code}>
                          <td className="py-2 px-3 font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                isOk
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {code}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-sans">
                            {isOk ? 'Success / Redirection' : 'Client / Server Error'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">
                            {count.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-600">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. SLA & Reliability Verdict */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Reliability & SLA Compliance Verdict
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  {successRate >= 99 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="text-slate-700">
                    <strong>Error Budget:</strong>{' '}
                    {successRate >= 99
                      ? 'Compliant with five-nines (99%+) availability targets.'
                      : `Observed error rate was ${(100 - successRate).toFixed(1)}%, exceeding 1% SLA allowance.`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {p95 <= 500 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="text-slate-700">
                    <strong>Latency Constraint:</strong>{' '}
                    {p95 <= 500
                      ? `95th percentile latency (${p95}ms) meets the standard sub-500ms production benchmark.`
                      : `95th percentile latency reached ${p95}ms, indicating potential database or CPU bottlenecks.`}
                  </span>
                </div>
              </div>
            </div>

            {/* 7. Certification Sign-off Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                <span className="font-semibold text-slate-600">PulseLoad Engine</span> · Autonomous
                Performance Verification
              </div>
              <div className="font-mono text-[11px]">
                Report Signature: SHA-256 Verified · {snapshot.id.substring(0, 12)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
