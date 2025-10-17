const fs = require('fs-extra');
const XLSX = require('xlsx');
const path = require('path');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const { getInvoices: getAllInvoices, saveInvoiceToExcel } = require('../services/excelService');


const MASTER_XLSX = path.join(__dirname, '..', 'excel_files', 'Golden_Harvest_Invoices.xlsx');
const pdfDir = path.join(__dirname, '../pdf_files');

// ============================
// Create or save invoice
// ============================
async function createInvoice(req, res) {
  try {
    const invoiceData = req.body;

    // Fetch existing invoices
    const allInvoices = await getAllInvoices();
    if (!allInvoices.success) throw new Error(allInvoices.error);

    // Check if invoice already exists
    const exists = allInvoices.invoices.some(inv => inv['Invoice No'] === invoiceData['Invoice No']);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Invoice already exists' });
    }

    // Compute totals if not sent from frontend
    const totals = invoiceData.totals || {
      subTotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      shipping: 0,
      total: 0
    };
    console.log('Invoice Totals:', totals);

    // Generate PDF
    const pdfUrl = await generateInvoicePDF({ ...invoiceData, totals });

    // Save to Excel
    const updated = await saveInvoiceToExcel(invoiceData, totals, pdfUrl);

    res.json({ success: true, pdfUrl, totals, updated });
  } catch (err) {
    console.error('❌ Error creating invoice:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}


// ============================
// Get all invoices
// ============================
async function getInvoices(req, res) {
  try {
    const result = await getAllInvoices();
    if (!result.success) return res.status(500).json(result);
    res.json(result);
  } catch (err) {
    console.error('❌ Error getting invoices:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============================
// Get invoice by number
// ============================
async function getInvoiceByNo(req, res) {
  try {
    const invoiceNo = req.params.invoiceNo;
    const result = await getAllInvoices();
    if (!result.success) return res.status(500).json(result);

    const invoice = result.invoices.find(inv => inv['Invoice No'] === invoiceNo);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    res.json({ success: true, invoice });
  } catch (err) {
    console.error('❌ Error getting invoice by number:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}


async function downloadPDF(req, res) {
  try {
    const { invoiceNo } = req.params;

    // Construct PDF file path
    const pdfFileName = `invoice-${invoiceNo}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Check if PDF exists
    if (!(await fs.pathExists(pdfPath))) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found for this invoice',
      });
    }

    // Send PDF as download
    res.download(pdfPath, `Invoice-${invoiceNo}.pdf`);
  } catch (error) {
    console.error('❌ Error serving PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF',
    });
  }
}

async function viewPDF (req, res) {
  try {
    const invoiceNo = req.params.invoiceNo;

    // Construct PDF path
    const pdfPath = path.join(pdfDir, `invoice-${invoiceNo}.pdf`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, error: 'PDF not found' });
    }

    // Serve PDF inline (view in browser)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${invoiceNo}.pdf`);
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('❌ Error serving PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============================
// Get invoice PDF URL by number
// ============================
async function getInvoiceByNoPDF(req, res) {
  try {
    const invoiceNo = req.params.invoiceNo;
    const result = await getAllInvoices();
    if (!result.success) return res.status(500).json(result);

    const invoice = result.invoices.find(inv => inv['Invoice No'] === invoiceNo);
    if (!invoice || !invoice['PDF Generated'])
      return res.status(404).json({ success: false, error: 'PDF not found' });
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/invoices/${invoiceNo}/view`;
    res.json({ success: true, pdfUrl });
  } catch (err) {
    console.error('❌ Error getting invoice PDF URL:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}


module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceByNo,
  getInvoiceByNoPDF
,downloadPDF,
viewPDF
};
