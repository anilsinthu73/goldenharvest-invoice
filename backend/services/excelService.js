const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');


const LOCK_FILE = path.join(__dirname, '..', 'excel_files', 'Golden_Harvest_Invoices.lock');
const MASTER_XLSX = path.join(__dirname, '..', 'excel_files', 'Golden_Harvest_Invoices.xlsx');

async function acquireLock(maxRetries = 10) {
  let delay = 100; // initial wait (ms)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fs.open(LOCK_FILE, "wx"); // exclusive lock file
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 2000); // exponential backoff up to 2s
      } else {
        throw err;
      }
    }
  }
  throw new Error("Lock timeout: too many concurrent requests");
}

async function releaseLock() {
  try {
    if (await fs.pathExists(LOCK_FILE)) await fs.remove(LOCK_FILE);
  } catch (err) {
    console.warn("⚠️ Failed to release lock:", err.message);
  }
}

async function computeInvoiceTotals(invoiceData) {
  let subtotal = 0;
  const products = (invoiceData.items || []).map((p) => {
    const name = p.name || '';
    const qty = Number(p.qty || 0);
    const rate = Number(p.rate || 0);
    const amount = Number((qty * rate).toFixed(2));
    subtotal += amount;
    return { name, qty, rate, amount };
  });

  const shippingState = (invoiceData.customer?.state || '').trim().toLowerCase();
  const isAP = shippingState === 'andhra pradesh';
  const cgst = isAP ? Number((subtotal * 0.025).toFixed(2)) : 0;
  const sgst = isAP ? Number((subtotal * 0.025).toFixed(2)) : 0;
  const igst = isAP ? 0 : Number((subtotal * 0.05).toFixed(2));
  const shippingCharges = Number(invoiceData.totals?.shipping || 0);
  const total = Number((subtotal + cgst + sgst + igst + shippingCharges).toFixed(2));

  return {
    products,
    subtotal: Number(subtotal.toFixed(2)),
    cgst,
    sgst,
    igst,
    shippingCharges,
    total,
    amountInWords: convertToWords(total),
  };
}


async function getInvoices() {
  try {
    if (!(await fs.pathExists(MASTER_XLSX))) {
      console.log('📊 Excel file not found, returning empty array');
      return { success: true, invoices: [] };
    }

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];

    if (!ws || !ws['!ref']) {
      console.log('📊 Worksheet is empty');
      return { success: true, invoices: [] };
    }

    const dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (dataArray.length <= 1) return { success: true, invoices: [] };

    const headers = dataArray[0];
    const invoices = dataArray.slice(1)
      .map((row) => {
        const invoice = {};
        headers.forEach((header, index) => {
          invoice[header] = row[index] || '';
        });
        return invoice;
      })
      .filter(invoice => Object.values(invoice).some(v => v !== '' && v !== null && v !== undefined));

    return { success: true, invoices, total: invoices.length };
  } catch (error) {
    console.error('❌ Error reading invoices:', error);
    return { success: false, error: 'Failed to load invoices: ' + error.message };
  }
}



async function invoiceNumberExists(invoiceNumber) {
  try {
    if (!await fs.pathExists(MASTER_XLSX)) return false;

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (dataArray.length <= 1) return false; // No data

    const headers = dataArray[0];
    const invoiceNoIndex = headers.findIndex(header =>
      header.toLowerCase().includes('invoice') || header.toLowerCase().includes('no')
    );

    if (invoiceNoIndex === -1) return false; // Column not found

    // Early exit loop
    for (let i = 1; i < dataArray.length; i++) {
      if (dataArray[i][invoiceNoIndex] === invoiceNumber) return true;
    }

    return false;
  } catch (err) {
    console.error('Error checking invoice number:', err);
    return false;
  }
}



async function saveInvoiceToExcel(invoiceData, totals, pdfUrl) {
  const headers = [
    "Invoice No", "Invoice Date", "Customer Name", "Customer Phone",
    "Customer Address", "State", "Subtotal", "CGST", "SGST", "IGST",
    "Shipping", "Total", "PDF Generated", "PDF URL", "Created At"
  ];

  try {
    let wb;
    if (await fs.pathExists(MASTER_XLSX)) {
      wb = XLSX.readFile(MASTER_XLSX);
    } else {
      wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    let dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (dataArray.length === 0) dataArray = [headers];
    const currentHeaders = dataArray[0];

    const invoiceNoIndex = currentHeaders.findIndex(header =>
      header.toLowerCase().includes('invoice') || header.toLowerCase().includes('no')
    );

    if (invoiceNoIndex === -1) throw new Error('Invoice column not found in Excel');

    let invoiceFound = false;
    const newData = [currentHeaders];

    // Build summary row
    const summaryRow = {
      InvoiceNo: invoiceData.invoiceNumber,
      InvoiceDate: invoiceData.invoiceDate || new Date().toISOString().slice(0, 10),
      CustomerName: invoiceData.customer?.name || '',
      CustomerPhone: invoiceData.customer?.phone || '',
      CustomerAddress: invoiceData.customer?.address || '',
      State: invoiceData.customer?.state || '',
      Subtotal: totals.subTotal || 0,
      CGST: totals.cgst || 0,
      SGST: totals.sgst || 0,
      IGST: totals.igst || 0,
      Shipping: totals.shipping || (totals.cgst+totals.igst+totals.sgst) - totals.subTotal ,
      Total: totals.total || 0,
      PDFGenerated: 'Yes',
      PDFUrl: pdfUrl || '',
      CreatedAt: new Date().toISOString()
    };

    for (let i = 1; i < dataArray.length; i++) {
      const row = dataArray[i];
      if (row[invoiceNoIndex] === summaryRow.InvoiceNo) {
        const updatedRow = currentHeaders.map(header => {
          const key = Object.keys(summaryRow).find(
            k => k.toLowerCase() === header.toLowerCase().replace(/\s/g, '')
          );
          return summaryRow[key] ?? row[currentHeaders.indexOf(header)] ?? '';
        });
        newData.push(updatedRow);
        invoiceFound = true;
      } else {
        newData.push(row);
      }
    }

    // Append if not found
    if (!invoiceFound) {
      const newRow = currentHeaders.map(header => {
        const key = Object.keys(summaryRow).find(
          k => k.toLowerCase() === header.toLowerCase().replace(/\s/g, '')
        );
        return summaryRow[key] ?? '';
      });
      newData.push(newRow);
    }
    const newWs = XLSX.utils.aoa_to_sheet(newData);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    XLSX.writeFile(wb, MASTER_XLSX);

    return true;
  } catch (err) {
    console.error('Error saving invoice to Excel:', err);
    throw err;
  }
}


module.exports = {getInvoices, invoiceNumberExists, saveInvoiceToExcel, computeInvoiceTotals, acquireLock, releaseLock };
