import { useRef, useCallback } from 'react'
import { formatDate } from '../utils/dateUtils.js'

export function usePDFExport() {
  const chartRef = useRef(null)

  const exportPDF = useCallback(async (logs, startDate, endDate) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { default: html2canvas } = await import('html2canvas')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(16, 185, 129) // emerald
    doc.text('Diet & Calorie Report', pageW / 2, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text(`${formatDate(startDate)} – ${formatDate(endDate)}`, pageW / 2, 28, { align: 'center' })

    let yOffset = 36

    // Chart screenshot
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0f172a', scale: 1.5 })
        const imgData = canvas.toDataURL('image/png')
        const imgH = (canvas.height / canvas.width) * (pageW - 20)
        doc.addImage(imgData, 'PNG', 10, yOffset, pageW - 20, Math.min(imgH, 80))
        yOffset += Math.min(imgH, 80) + 8
      } catch {}
    }

    // Data table
    const tableData = logs.map(l => [
      l.date,
      l.meal_type,
      l.food_name,
      l.quantity ? `${l.quantity}g` : '-',
      l.calories,
      l.protein,
      l.carbs,
      l.fats,
    ])

    autoTable(doc, {
      startY: yOffset,
      head: [['Date', 'Meal', 'Food', 'Qty', 'Cal', 'P(g)', 'C(g)', 'F(g)']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 10, right: 10 },
    })

    doc.save(`diet-report-${startDate}-to-${endDate}.pdf`)
  }, [])

  return { chartRef, exportPDF }
}
