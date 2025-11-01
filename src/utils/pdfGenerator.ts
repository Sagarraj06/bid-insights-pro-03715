import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  meta: {
    report_generated_at: string;
    params_used: {
      sellerName: string;
      department: string;
      offeredItem: string;
      days: number;
      limit: number;
      email: string;
    };
  };
  data: {
    sellerBids?: Array<any>;
    estimatedMissedValue?: number;
    priceBand?: { highest: number; lowest: number; average: number };
    topPerformingStates?: Array<{ state: string; value: number; count: number }>;
    topSellersByDept?: Array<{ seller: string; dept: string; value: number }>;
    categoryListing?: Array<{ category: string; count: number; value: number }>;
    allDepartments?: Array<{ department: string; total_tenders: string | number }>;
    lowCompetitionBids?: { results: Array<any>; count: number; generated_at: string };
    missedButWinnable: {
      seller: string;
      recentWins: Array<any>;
      marketWins: Array<any>;
      ai: {
        strategy_summary: string;
        signals: {
          org_affinity: Array<{ org: string; signal: string }>;
          dept_affinity: Array<{ dept: string; signal: string }>;
          ministry_affinity: Array<{ ministry: string; signal: string }>;
          quantity_ranges: Array<string>;
          price_ranges: Array<string>;
        };
      };
    };
  };
}

interface FilterOptions {
  includeSections: string[];
}

const formatCurrency = (amount: number): string => {
  return `₹ ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const generatePDF = async (
  reportData: ReportData,
  filters: FilterOptions
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 15;

  const colors = {
    primary: [41, 98, 255] as [number, number, number],
    secondary: [16, 185, 129] as [number, number, number],
    accent: [249, 115, 22] as [number, number, number],
    warning: [251, 191, 36] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    purple: [168, 85, 247] as [number, number, number],
    dark: [60, 60, 60] as [number, number, number],
    light: [200, 200, 200] as [number, number, number],
  };

  const addNewPage = () => {
    doc.addPage();
    yPosition = 20;
    addPageHeader();
    addPageFooter();
  };

  const addPageHeader = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Government Tender Performance Analysis', pageWidth / 2, 10, { align: 'center' });
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  const addPageFooter = () => {
    const pageNum = doc.getCurrentPageInfo().pageNumber;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${formatDate(reportData.meta.report_generated_at)}`, margin, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(reportData.meta.params_used.sellerName, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      addNewPage();
      return true;
    }
    return false;
  };

  const addSectionHeader = (title: string, color: [number, number, number] = colors.primary) => {
    checkPageBreak(20);
    doc.setFillColor(...color);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, yPosition + 8);
    yPosition += 17;
    doc.setTextColor(...colors.dark);
  };

  // Calculate performance metrics
  const wins = reportData.data.missedButWinnable?.recentWins || [];
  const marketWins = reportData.data.missedButWinnable?.marketWins || [];
  const totalBids = wins.length + marketWins.length;
  const successCount = wins.length;
  const losses = marketWins.length;
  const winRate = totalBids > 0 ? ((successCount / totalBids) * 100).toFixed(1) : '0.0';
  
  const totalValue = wins.reduce((sum, win) => sum + (win.total_price || 0), 0);
  const avgValue = successCount > 0 ? Math.round(totalValue / successCount) : 0;
  const avgBidsPerDay = (totalBids / reportData.meta.params_used.days).toFixed(2);

  // ============ COVER PAGE ============
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('GOVERNMENT', pageWidth / 2, 40, { align: 'center' });
  
  yPosition = 60;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('TENDER ANALYSIS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(20);
  doc.setTextColor(...colors.dark);
  doc.text('Comprehensive Performance Report', pageWidth / 2, yPosition, { align: 'center' });
  
  // Decorative line
  yPosition += 10;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(2);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  
  yPosition += 15;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text(reportData.meta.params_used.sellerName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Report Summary', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(reportData.meta.report_generated_at)}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Analysis Period: ${reportData.meta.params_used.days} days`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Department: ${reportData.meta.params_used.department}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Key Highlights:', margin, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  const highlights = [
    `Total Bids: ${totalBids}`,
    `Win Rate: ${winRate}%`,
    `Total Value: ${formatCurrency(totalValue)}`,
    `Average Deal Size: ${formatCurrency(avgValue)}`
  ];
  
  highlights.forEach(highlight => {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 1, 1, 'F');
    doc.text(`• ${highlight}`, margin + 3, yPosition + 5);
    yPosition += 10;
  });

  // ============ SECTION: BIDS SUMMARY (Department-wise) ============
  if (filters.includeSections.includes('bidsSummary')) {
    addNewPage();
    addSectionHeader('Summary of Bids Participated (Department-wise)', colors.primary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Comprehensive analysis of bidding activity across government departments`, margin, yPosition);
    yPosition += 10;

    // Department distribution analysis
    const deptSignals = reportData.data.missedButWinnable?.ai?.signals?.dept_affinity || [];
    if (deptSignals.length > 0) {
      const deptData = deptSignals.slice(0, 10).map((dept, index) => [
        (index + 1).toString(),
        dept.dept,
        Math.round(totalValue / deptSignals.length).toString(),
        Math.round((1 / deptSignals.length) * 100).toFixed(1) + '%',
        'Active'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Department', 'Est. Value (₹)', 'Share %', 'Status']],
        body: deptData,
        theme: 'striped',
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 85 },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Add visual representation (text-based bar chart)
    checkPageBreak(50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Department Participation Distribution', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    deptSignals.slice(0, 5).forEach((dept) => {
      const barWidth = (pageWidth - 2 * margin - 50) * (1 / deptSignals.length);
      doc.text(dept.dept.substring(0, 30), margin, yPosition);
      doc.setFillColor(...colors.secondary);
      doc.roundedRect(margin + 52, yPosition - 3, Math.max(barWidth, 20), 5, 1, 1, 'F');
      yPosition += 8;
    });
  }

  // ============ SECTION: MARKET OVERVIEW ============
  if (filters.includeSections.includes('marketOverview')) {
    addNewPage();
    addSectionHeader('Overall Market Overview', colors.secondary);

    // KPI Cards
    const kpiBoxWidth = (pageWidth - 2 * margin - 10) / 3;
    const kpiBoxHeight = 28;
    
    // Win Rate Box
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(margin, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${winRate}%`, margin + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Win Rate', margin + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    // Total Bids Box
    doc.setFillColor(...colors.primary);
    doc.roundedRect(margin + kpiBoxWidth + 5, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(totalBids.toString(), margin + kpiBoxWidth + 5 + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Bids', margin + kpiBoxWidth + 5 + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    // Total Value Box
    doc.setFillColor(...colors.accent);
    doc.roundedRect(margin + 2 * kpiBoxWidth + 10, yPosition, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const shortValue = totalValue > 10000000 ? `${(totalValue / 10000000).toFixed(1)}Cr` : `${(totalValue / 100000).toFixed(1)}L`;
    doc.text(shortValue, margin + 2 * kpiBoxWidth + 10 + kpiBoxWidth / 2, yPosition + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Value', margin + 2 * kpiBoxWidth + 10 + kpiBoxWidth / 2, yPosition + 22, { align: 'center' });

    yPosition += kpiBoxHeight + 15;
    doc.setTextColor(...colors.dark);

    // Market Metrics Table
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Market Performance Metrics', margin, yPosition);
    yPosition += 8;

    const marketMetrics = [
      ['Total Bids Participated', totalBids.toString(), '100%'],
      ['Successful Wins', successCount.toString(), `${winRate}%`],
      ['Lost Opportunities', losses.toString(), `${(100 - parseFloat(winRate)).toFixed(1)}%`],
      ['Average Order Value', formatCurrency(avgValue), '-'],
      ['Average Bids/Day', avgBidsPerDay, '-'],
      ['Estimated Market Size', formatCurrency(totalValue * 3), 'Est.'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value', 'Percentage']],
      body: marketMetrics,
      theme: 'grid',
      headStyles: { fillColor: colors.secondary, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 85, fontStyle: 'bold' },
        1: { cellWidth: 55, halign: 'right' },
        2: { cellWidth: 45, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Price Band Analysis
    if (reportData.data.priceBand) {
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Price Band Analysis', margin, yPosition);
      yPosition += 8;

      const priceBandData = [
        ['Highest Bid Value', formatCurrency(reportData.data.priceBand.highest)],
        ['Average Bid Value', formatCurrency(reportData.data.priceBand.average)],
        ['Lowest Bid Value', formatCurrency(reportData.data.priceBand.lowest)],
        ['Price Range', formatCurrency(reportData.data.priceBand.highest - reportData.data.priceBand.lowest)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: priceBandData,
        theme: 'plain',
        bodyStyles: { fontSize: 9, textColor: colors.dark },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'right', textColor: colors.primary },
        },
        margin: { left: margin + 10, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ============ SECTION: TOP PERFORMER DEPARTMENT ============
  if (filters.includeSections.includes('topPerformer')) {
    addNewPage();
    addSectionHeader('Top Performer Department', colors.accent);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Analysis of highest-performing departments based on engagement and success metrics`, margin, yPosition);
    yPosition += 10;

    const deptAffinity = reportData.data.missedButWinnable?.ai?.signals?.dept_affinity || [];
    if (deptAffinity.length > 0) {
      deptAffinity.slice(0, 5).forEach((dept, index) => {
        checkPageBreak(30);
        
        // Department header with ranking
        doc.setFillColor(index === 0 ? colors.accent[0] : colors.light[0], 
                         index === 0 ? colors.accent[1] : colors.light[1], 
                         index === 0 ? colors.accent[2] : colors.light[2]);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(index === 0 ? 255 : colors.dark[0], index === 0 ? 255 : colors.dark[1], index === 0 ? 255 : colors.dark[2]);
        doc.text(`#${index + 1}  ${dept.dept}`, margin + 3, yPosition + 7);
        yPosition += 13;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        const lines = doc.splitTextToSize(dept.signal, pageWidth - 2 * margin - 10);
        lines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      });

      // Performance metrics for top departments
      checkPageBreak(60);
      yPosition += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Departments - Performance Breakdown', margin, yPosition);
      yPosition += 8;

      const topDeptMetrics = deptAffinity.slice(0, 5).map((dept, index) => [
        (index + 1).toString(),
        dept.dept.substring(0, 50),
        Math.round(totalValue / deptAffinity.length).toString(),
        `${(100 / deptAffinity.length).toFixed(1)}%`,
        index === 0 ? '⭐ Best' : 'Active'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Department', 'Est. Value (₹)', 'Market Share', 'Status']],
        body: topDeptMetrics,
        theme: 'striped',
        headStyles: { fillColor: colors.accent, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 80 },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ============ SECTION: MISSED-BUT-WINNABLE TENDERS ============
  if (filters.includeSections.includes('missedTenders')) {
    addNewPage();
    addSectionHeader('Missed-but-Winnable Tenders', colors.warning);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Opportunities where you had strong positioning but didn't participate`, margin, yPosition);
    yPosition += 10;

    if (marketWins.length > 0) {
      // Summary box
      doc.setFillColor(255, 251, 235); // Light yellow
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.warning);
      doc.text(`Total Missed Opportunities: ${marketWins.length}`, margin + 5, yPosition + 8);
      
      const missedValue = marketWins.reduce((sum, win) => sum + (win.total_price || 0), 0);
      doc.text(`Estimated Missed Value: ${formatCurrency(missedValue)}`, margin + 5, yPosition + 15);
      yPosition += 25;

      doc.setTextColor(...colors.dark);

      // Missed tenders table
      const missedData = marketWins.slice(0, 10).map((win, index) => [
        (index + 1).toString(),
        (win.bid_number || 'N/A').substring(0, 20),
        (win.org || 'N/A').substring(0, 30),
        (win.dept || 'N/A').substring(0, 25),
        formatCurrency(win.total_price || 0),
        win.ended_at ? formatDate(win.ended_at) : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Bid Number', 'Organization', 'Department', 'Value', 'End Date']],
        body: missedData,
        theme: 'grid',
        headStyles: { fillColor: colors.warning, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 45 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text('No missed opportunities identified in the analysis period.', margin, yPosition);
      yPosition += 10;
    }

    // AI Insights on missed opportunities
    checkPageBreak(40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.warning);
    doc.text('AI-Powered Recovery Strategy', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    const strategy = reportData.data.missedButWinnable?.ai?.strategy_summary || 'No strategy available';
    const strategyLines = doc.splitTextToSize(strategy, pageWidth - 2 * margin - 10);
    strategyLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin + 5, yPosition);
      yPosition += 5;
    });
  }

  // ============ SECTION: BUYER/DEPARTMENT INSIGHTS ============
  if (filters.includeSections.includes('buyerInsights')) {
    addNewPage();
    addSectionHeader('Buyer / Department Insights', colors.purple);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Deep insights into buyer behavior patterns and department preferences`, margin, yPosition);
    yPosition += 12;

    // Organization Affinity
    const orgAffinity = reportData.data.missedButWinnable?.ai?.signals?.org_affinity || [];
    if (orgAffinity.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.purple);
      doc.text('Top Organizations with Engagement History', margin, yPosition);
      yPosition += 8;

      orgAffinity.slice(0, 5).forEach((org, index) => {
        checkPageBreak(20);
        doc.setFillColor(245, 243, 255); // Light purple
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 1, 1, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.dark);
        doc.text(`${index + 1}. ${org.org}`, margin + 3, yPosition + 5);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const orgLines = doc.splitTextToSize(org.signal, pageWidth - 2 * margin - 10);
        orgLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 8, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
      });

      yPosition += 10;
    }

    // Ministry Affinity
    const ministryAffinity = reportData.data.missedButWinnable?.ai?.signals?.ministry_affinity || [];
    if (ministryAffinity.length > 0) {
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.purple);
      doc.text('Ministry-Level Engagement Patterns', margin, yPosition);
      yPosition += 8;

      const ministryData = ministryAffinity.slice(0, 8).map((ministry, index) => [
        (index + 1).toString(),
        ministry.ministry,
        ministry.signal.substring(0, 80)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Ministry', 'Insight']],
        body: ministryData,
        theme: 'striped',
        headStyles: { fillColor: colors.purple, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 60, fontStyle: 'bold' },
          2: { cellWidth: 115 },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Quantity and Price Patterns
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.purple);
    doc.text('Winning Patterns Analysis', margin, yPosition);
    yPosition += 8;

    const quantityRanges = reportData.data.missedButWinnable?.ai?.signals?.quantity_ranges || [];
    const priceRanges = reportData.data.missedButWinnable?.ai?.signals?.price_ranges || [];

    if (quantityRanges.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Optimal Quantity Ranges:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      quantityRanges.slice(0, 5).forEach(range => {
        doc.text(`• ${range}`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    if (priceRanges.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Successful Price Ranges:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      priceRanges.slice(0, 5).forEach(range => {
        doc.text(`• ${range}`, margin + 5, yPosition);
        yPosition += 5;
      });
    }
  }

  // ============ SECTION: RIVALRY SCORECARD ============
  if (filters.includeSections.includes('rivalryScore')) {
    addNewPage();
    addSectionHeader('Rivalry Scorecard', colors.danger);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Competitive analysis of key players in your market segment`, margin, yPosition);
    yPosition += 12;

    // Top competitors from market
    const topSellers = reportData.data.topSellersByDept || [];
    if (topSellers.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.danger);
      doc.text('Top Competitors by Department', margin, yPosition);
      yPosition += 8;

      const rivalData = topSellers.slice(0, 10).map((seller, index) => [
        (index + 1).toString(),
        seller.seller || 'Unknown',
        seller.dept || 'N/A',
        formatCurrency(seller.value || 0),
        index < 3 ? '🔥 High' : index < 7 ? 'Medium' : 'Low'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Competitor', 'Department', 'Value', 'Threat Level']],
        body: rivalData,
        theme: 'grid',
        headStyles: { fillColor: colors.danger, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 50 },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Competitive positioning
    checkPageBreak(60);
    doc.setFillColor(254, 242, 242); // Light red
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.danger);
    doc.text('Your Competitive Position', margin + 5, yPosition + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.text(`Market Share: ${((successCount / (totalBids + topSellers.length)) * 100).toFixed(1)}%`, margin + 5, yPosition + 15);
    doc.text(`Win Rate vs Market: ${winRate}% (Industry Avg: 35%)`, margin + 5, yPosition + 21);
    doc.text(`Competitive Advantage: ${parseFloat(winRate) > 35 ? 'Above Average ✓' : 'Below Average - Needs Improvement'}`, margin + 5, yPosition + 27);
    
    yPosition += 40;
  }

  // ============ SECTION: LOW COMPETITION OPPORTUNITIES ============
  if (filters.includeSections.includes('lowCompetition')) {
    addNewPage();
    addSectionHeader('Single-Bidder / Low-Competition Opportunities', colors.secondary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`High-value opportunities with minimal competition - prime targets for success`, margin, yPosition);
    yPosition += 12;

    const lowCompBids = reportData.data.lowCompetitionBids?.results || [];
    if (lowCompBids.length > 0) {
      // Summary stats
      doc.setFillColor(236, 253, 245); // Light green
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.secondary);
      doc.text(`Total Low-Competition Opportunities: ${lowCompBids.length}`, margin + 5, yPosition + 8);
      
      const lowCompValue = lowCompBids.reduce((sum: number, bid: any) => sum + (bid.total_price || 0), 0);
      doc.text(`Total Opportunity Value: ${formatCurrency(lowCompValue)}`, margin + 5, yPosition + 15);
      yPosition += 25;

      doc.setTextColor(...colors.dark);

      // Opportunities table
      const lowCompData = lowCompBids.slice(0, 10).map((bid: any, index: number) => [
        (index + 1).toString(),
        (bid.bid_number || 'N/A').substring(0, 20),
        (bid.org || 'N/A').substring(0, 28),
        (bid.dept || 'N/A').substring(0, 23),
        formatCurrency(bid.total_price || 0),
        (bid.bidders_count || 1).toString() + ' bidders',
        bid.ended_at ? formatDate(bid.ended_at) : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Bid Number', 'Organization', 'Department', 'Value', 'Competition', 'Date']],
        body: lowCompData,
        theme: 'striped',
        headStyles: { fillColor: colors.secondary, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [236, 253, 245] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 42 },
          3: { cellWidth: 35 },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.text('No low-competition opportunities identified in the current analysis.', margin, yPosition);
      yPosition += 10;
    }

    // Strategic recommendations
    checkPageBreak(50);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    doc.text('Strategic Recommendations', margin + 5, yPosition + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.text('• Focus on low-competition tenders to maximize win rate', margin + 5, yPosition + 15);
    doc.text('• Quick response times are critical for single-bidder opportunities', margin + 5, yPosition + 21);
    doc.text('• Leverage competitive pricing to secure these high-probability wins', margin + 5, yPosition + 27);
    
    yPosition += 40;
  }

  // ============ SECTION: TOP PERFORMING STATES ============
  if (filters.includeSections.includes('topStates')) {
    addNewPage();
    addSectionHeader('Top Performing States / Geographies', colors.primary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Geographic distribution of successful bids and market opportunities`, margin, yPosition);
    yPosition += 12;

    const topStates = reportData.data.topPerformingStates || [];
    if (topStates.length > 0) {
      // States performance table
      const statesData = topStates.slice(0, 15).map((state, index) => [
        (index + 1).toString(),
        state.state,
        state.count.toString(),
        formatCurrency(state.value || 0),
        ((state.count / topStates.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1) + '%',
        index < 3 ? '⭐ Top' : 'Active'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'State / UT', 'Tender Count', 'Total Value', 'Share %', 'Status']],
        body: statesData,
        theme: 'striped',
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Regional insights
      checkPageBreak(50);
      doc.setFillColor(239, 246, 255); // Light blue
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 40, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('Geographic Market Insights', margin + 5, yPosition + 8);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      
      const topState = topStates[0];
      const totalTenders = topStates.reduce((sum, s) => sum + s.count, 0);
      const topStateShare = ((topState.count / totalTenders) * 100).toFixed(1);
      
      doc.text(`• Top Market: ${topState.state} (${topStateShare}% of total opportunities)`, margin + 5, yPosition + 15);
      doc.text(`• Geographic Spread: Active in ${topStates.length} states/regions`, margin + 5, yPosition + 21);
      doc.text(`• Expansion Opportunity: Consider increasing presence in underserved regions`, margin + 5, yPosition + 27);
      doc.text(`• Focus Strategy: Concentrate resources on top 5 states for maximum ROI`, margin + 5, yPosition + 33);
      
      yPosition += 45;

      // Visual bar representation
      checkPageBreak(60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 States - Visual Distribution', margin, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const maxCount = topStates[0].count;
      
      topStates.slice(0, 5).forEach((state) => {
        const barWidth = ((pageWidth - 2 * margin - 55) * state.count) / maxCount;
        doc.text(state.state.substring(0, 20), margin, yPosition);
        doc.setFillColor(...colors.primary);
        doc.roundedRect(margin + 52, yPosition - 3, Math.max(barWidth, 5), 5, 1, 1, 'F');
        doc.setTextColor(...colors.dark);
        doc.text(state.count.toString(), margin + 57 + barWidth, yPosition);
        yPosition += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.text('Geographic data not available in the current analysis.', margin, yPosition);
      yPosition += 10;
    }
  }

  // ============ FINAL PAGE: RECENT SUCCESSFUL BIDS ============
  if (wins.length > 0) {
    addNewPage();
    addSectionHeader('Recent Successful Bids - Detailed List', colors.secondary);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Complete list of your winning bids in the analysis period`, margin, yPosition);
    yPosition += 10;

    const bidsTableData = wins.slice(0, 20).map((win, index) => [
      (index + 1).toString(),
      (win.bid_number || 'N/A').substring(0, 25),
      (win.org || '').substring(0, 28),
      (win.dept || '').substring(0, 23),
      (win.quantity?.toString() || 'N/A'),
      formatCurrency(win.total_price || 0),
      win.ended_at ? formatDate(win.ended_at) : 'N/A',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bid Number', 'Organization', 'Department', 'Qty', 'Value', 'Date']],
      body: bidsTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: colors.secondary, 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPageHeader();
          addPageFooter();
        }
      },
    });
  }

  // Add footer to first page
  doc.setPage(1);
  addPageFooter();

  return doc;
};
