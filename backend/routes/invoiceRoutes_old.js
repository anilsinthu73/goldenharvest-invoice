// routes/invoices.js
const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs-extra');


const { generateInvoicePDF, generatePDFFromHTML, generateInvoiceHTML } = require('../services/pdfGenerator.js');


const router = express.Router();

// Ensure directories exist
const excelDir = path.join(__dirname, '..', 'excel_files');
const pdfDir = path.join(__dirname, '..', 'pdf_files');
fs.ensureDirSync(excelDir);
fs.ensureDirSync(pdfDir);

// Master Excel file path
const MASTER_XLSX = path.join(excelDir, 'Golden_Harvest_Invoices.xlsx');
const LOCK_FILE = path.join(excelDir, "Golden_Harvest_Invoices.lock");

// -----------------------------
// Utility Functions
// -----------------------------






async function invoiceNumberExists(invoiceNo) {
  if (!(await fs.pathExists(MASTER_XLSX))) return false;
  const wb = XLSX.readFile(MASTER_XLSX);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return data.some((r) => r["Invoice No"] === invoiceNo);
}

async function updateOrAppendInvoiceRow(rowObj) {
  await acquireLock();
  try {
    let wb, ws, data;
    const headers = [
      "Invoice No",
      "Invoice Date",
      "Customer Name",
      "Customer Phone",
      "Customer Address",
      "State",
      "Subtotal",
      "CGST",
      "SGST",
      "IGST",
      "Shipping",
      "Total",
      "PDF Generated",
      "Created At",
    ];

    if (await fs.pathExists(MASTER_XLSX)) {
      wb = XLSX.readFile(MASTER_XLSX);
      ws = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    } else {
      wb = XLSX.utils.book_new();
      data = [headers];
    }

    const existingIndex = data.findIndex(
      (r, i) => i > 0 && r[0] === rowObj.InvoiceNo
    );
    const rowData = [
      rowObj.InvoiceNo,
      rowObj.InvoiceDate,
      rowObj.CustomerName,
      rowObj.CustomerPhone,
      rowObj.CustomerAddress,
      rowObj.State,
      rowObj.Subtotal,
      rowObj.CGST,
      rowObj.SGST,
      rowObj.IGST,
      rowObj.Shipping,
      rowObj.Total,
      rowObj.PDFGenerated,
      rowObj.CreatedAt,
    ];

    if (existingIndex > 0) data[existingIndex] = rowData;
    else data.push(rowData);

    const newWs = XLSX.utils.aoa_to_sheet(data);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    XLSX.writeFile(wb, MASTER_XLSX);
  } finally {
    await releaseLock();
  }
}


// Helper function to update or append invoice row
async function updateOrAppendInvoiceRow(summaryRow) {
  try {
    let wb;
    let headers = [
      "Invoice No", "Invoice Date", "Customer Name", "Customer Phone", 
      "Customer Address", "State", "Subtotal", "CGST", "SGST", "IGST", 
      "Shipping", "Total", "PDF Generated", "Created At"
    ];

    if (await fs.pathExists(MASTER_XLSX)) {
      wb = XLSX.readFile(MASTER_XLSX);
    } else {
      wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // If file is empty or corrupted, recreate with headers
    if (dataArray.length === 0) {
      const newWs = XLSX.utils.aoa_to_sheet([headers]);
      wb.Sheets[wb.SheetNames[0]] = newWs;
    }

    // Get current data
    const currentData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const currentHeaders = currentData[0] || headers;

    // Find if invoice already exists (for update)
    const invoiceNoIndex = currentHeaders.findIndex(header => 
      header.toLowerCase().includes('invoice') || 
      header.toLowerCase().includes('no')
    );

    let invoiceFound = false;
    const newData = [currentHeaders];

    // Update existing invoice or append new one
    for (let i = 1; i < currentData.length; i++) {
      const row = currentData[i];
      if (invoiceNoIndex !== -1 && row[invoiceNoIndex] === summaryRow.InvoiceNo) {
        // Update existing row
        const updatedRow = currentHeaders.map(header => {
          const key = Object.keys(summaryRow).find(k => 
            k.toLowerCase() === header.toLowerCase().replace(' ', '')
          );
          return summaryRow[key] || row[currentHeaders.indexOf(header)] || '';
        });
        newData.push(updatedRow);
        invoiceFound = true;
      } else {
        newData.push(row);
      }
    }

    // If invoice not found, append new row
    if (!invoiceFound) {
      const newRow = currentHeaders.map(header => {
        const key = Object.keys(summaryRow).find(k => 
          k.toLowerCase() === header.toLowerCase().replace(' ', '')
        );
        return summaryRow[key] || '';
      });
      newData.push(newRow);
    }

    // Write back to file
    const newWs = XLSX.utils.aoa_to_sheet(newData);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    XLSX.writeFile(wb, MASTER_XLSX);

    return true;
  } catch (error) {
    console.error('Error updating Excel file:', error);
    throw error;
  }
}

router.post('/', async (req, res) => {
  try {
    const invoiceData = req.body;
    if (!invoiceData.invoiceNumber || !invoiceData.customer || !invoiceData.items) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: invoiceNumber, customer, items',
      });
    }

    console.log('🔍 Checking if invoice already exists:', invoiceData.invoiceNumber);

    // ✅ Step 1: Check if this invoice number already exists
    const alreadyExists = await invoiceNumberExists(invoiceData.invoiceNumber);
    if (alreadyExists) {
      console.warn(`⚠️ Invoice ${invoiceData.invoiceNumber} already exists. Skipping creation.`);
      return res.status(409).json({
        success: false,
        error: `Invoice number ${invoiceData.invoiceNumber} already exists.`,
      });
    }

    // ✅ Step 2: Compute totals
    const computed = await computeInvoiceTotals(invoiceData);

    // ✅ Step 3: Generate PDF FIRST (before Excel)
    console.log('📄 Generating PDF for:', invoiceData.invoiceNumber);
    
    const pdfData = {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate || new Date().toISOString().slice(0, 10),
      customerName: invoiceData.customer.name,
      customerPhone: invoiceData.customer.phone,
      customerAddress: invoiceData.customer.address,
      shippingState: invoiceData.customer.state,
      items: invoiceData.items.map(item => ({
        name: item.name,
        qty: item.qty,
        rate: item.rate,
        amount: (item.qty || 0) * (item.rate || 0),
      })),
      subtotal: computed.subtotal,
      cgst: computed.cgst,
      sgst: computed.sgst,
      igst: computed.igst,
      shippingCharges: computed.shippingCharges,
      total: computed.total,
      amountInWords: computed.amountInWords,
    };

    // ✅ Step 4: Generate PDF - if this fails, Excel won't be updated
    const pdfUrl = await generateInvoicePDF(pdfData);
    console.log(`✅ PDF created successfully: ${pdfUrl}`);

    // ✅ Step 5: Only after PDF success, save to Excel
    const summaryRow = {
      InvoiceNo: invoiceData.invoiceNumber,
      InvoiceDate: invoiceData.invoiceDate || new Date().toISOString().slice(0, 10),
      CustomerName: invoiceData.customer.name || '',
      CustomerPhone: invoiceData.customer.phone || '',
      CustomerAddress: invoiceData.customer.address || '',
      State: invoiceData.customer.state || '',
      Subtotal: computed.subtotal,
      CGST: computed.cgst,
      SGST: computed.sgst,
      IGST: computed.igst,
      Shipping: computed.shippingCharges,
      Total: computed.total,
      PDFGenerated: 'Yes', // Directly mark as Yes since PDF succeeded
      CreatedAt: new Date().toISOString(),
      PDFUrl: pdfUrl // Store PDF URL in Excel
    };

    // ✅ Step 6: Save to Excel (only if PDF generation succeeded)
    await updateOrAppendInvoiceRow(summaryRow);
    console.log(`✅ Invoice ${invoiceData.invoiceNumber} saved to Excel.`);

    // ✅ Step 7: Send response back
    return res.json({
      success: true,
      message: 'Invoice created and PDF generated successfully',
      invoiceNumber: invoiceData.invoiceNumber,
      totals: {
        subTotal: computed.subtotal,
        cgst: computed.cgst,
        sgst: computed.sgst,
        igst: computed.igst,
        shipping: computed.shippingCharges,
        total: computed.total,
      },
      amountInWords: computed.amountInWords,
      pdfUrl,
      excelFile: path.basename(MASTER_XLSX),
    });

  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    
    // If PDF generation failed, Excel is never touched
    return res.status(500).json({
      success: false,
      error: 'Failed to create invoice: ' + error.message,
    });
  }
});




router.get('/', async (req, res) => {
  try {
    if (!(await fs.pathExists(MASTER_XLSX))) {
      console.log('📊 Excel file not found, returning empty array');
      return res.json({ success: true, invoices: [] });
    }

    console.log('📊 Reading Excel file:', MASTER_XLSX);

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Check if worksheet is empty
    if (!ws || !ws['!ref']) {
      console.log('📊 Worksheet is empty');
      return res.json({ success: true, invoices: [] });
    }

    // Get the actual data range
    const range = XLSX.utils.decode_range(ws['!ref']);
    console.log('📊 Data range:', range);

    if (range.e.r < 1) { // Only header row or empty
      console.log('📊 No data rows found');
      return res.json({ success: true, invoices: [] });
    }

    // Convert to array format
    const dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log('📊 Raw data rows:', dataArray.length);

    if (dataArray.length <= 1) {
      console.log('📊 Only header row found');
      return res.json({ success: true, invoices: [] });
    }

    // Get headers from first row
    const headers = dataArray[0];
    console.log('📊 Headers:', headers);

    // Convert remaining rows to objects
    const invoices = dataArray.slice(1)
      .map((row) => {
        const invoice = {};
        headers.forEach((header, index) => {
          invoice[header] = row[index] || '';
        });
        return invoice;
      })
      .filter(invoice => {
        // Filter out completely empty rows
        return Object.values(invoice).some(value => 
          value !== '' && value !== null && value !== undefined
        );
      });

    console.log('📊 Valid invoices found:', invoices.length);
    
    if (invoices.length > 0) {
      console.log('📊 First invoice sample:', {
        invoiceNo: invoices[0]['Invoice No'],
        customer: invoices[0]['Customer Name'],
        total: invoices[0]['Total']
      });
    }

    res.json({
      success: true,
      invoices: invoices,
      total: invoices.length,
    });
  } catch (error) {
    console.error('❌ Error reading invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load invoices: ' + error.message,
    });
  }
});


router.get("/latest-invoice", async (req, res) => {
  try {
    if (!(await fs.pathExists(MASTER_XLSX))) {
      return res.json({ 
        success: true, 
        latestInvoice: null,
        message: "Excel file doesn't exist" 
      });
    }

    console.log("📊 Reading Excel file for latest invoice:", MASTER_XLSX);

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Check if worksheet has data
    if (!ws || !ws['!ref']) {
      console.log("📊 Worksheet is empty");
      return res.json({ 
        success: true, 
        latestInvoice: null,
        message: "Worksheet is empty" 
      });
    }

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    console.log("📊 Total rows in Excel:", data.length);

    if (data.length === 0) {
      console.log("📊 No data rows found");
      return res.json({ 
        success: true, 
        latestInvoice: null,
        message: "No data rows found" 
      });
    }

    // Debug: Log the first few rows to see the structure
    console.log("📊 First 2 rows:", data.slice(0, 2));

    // Find all valid invoices with invoice numbers
    const validInvoices = data.filter(row => {
      const invoiceNo = row["Invoice No"];
      return invoiceNo && typeof invoiceNo === 'string' && invoiceNo.trim() !== '';
    });

    console.log("📊 Valid invoices found:", validInvoices.length);

    if (validInvoices.length === 0) {
      console.log("📊 No valid invoice numbers found");
      // Log all column names to debug
      if (data.length > 0) {
        console.log("📊 Available columns:", Object.keys(data[0]));
      }
      return res.json({ 
        success: true, 
        latestInvoice: null,
        message: "No valid invoice numbers found" 
      });
    }

    // Process invoices with proper date handling
    const invoicesWithDates = validInvoices
      .map(row => {
        const invoiceNo = row["Invoice No"];
        let createdAt;
        
        // Try different date fields
        if (row["Created At"]) {
          createdAt = new Date(row["Created At"]);
        } else if (row["Invoice Date"]) {
          createdAt = new Date(row["Invoice Date"]);
        } else {
          createdAt = new Date(); // Fallback to current date
        }

        return {
          invoiceNo: invoiceNo,
          createdAt: createdAt,
          date: row["Invoice Date"] || '',
          customerName: row["Customer Name"] || '',
          total: row["Total"] || 0
        };
      })
      .filter(inv => !isNaN(inv.createdAt.getTime())) // Filter out invalid dates
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by date descending

    console.log("📊 Processed invoices:", invoicesWithDates.length);

    const latestInvoice = invoicesWithDates.length > 0 ? invoicesWithDates[0] : null;

    if (latestInvoice) {
      console.log("✅ Latest invoice found:", latestInvoice.invoiceNo, "created at:", latestInvoice.createdAt);
    } else {
      console.log("❌ No valid latest invoice found after processing");
    }

    res.json({
      success: true,
      latestInvoice: latestInvoice,
      totalInvoices: validInvoices.length,
      processedInvoices: invoicesWithDates.length
    });

  } catch (error) {
    console.error("❌ Error fetching latest invoice:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// -----------------------------
router.get("/debug/invoice-numbers", async (req, res) => {
  try {
    if (!(await fs.pathExists(MASTER_XLSX))) {
      return res.json({
        success: true,
        message: "Excel file doesn't exist",
        invoices: []
      });
    }

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const invoiceNumbers = data
      .map(row => ({
        invoiceNo: row["Invoice No"],
        date: row["Invoice Date"],
        customer: row["Customer Name"],
        created: row["Created At"]
      }))
      .filter(inv => inv.invoiceNo && /^GH\d{8}$/.test(inv.invoiceNo));

    // Group by date prefix
    const groupedByDate = {};
    invoiceNumbers.forEach(inv => {
      const datePrefix = inv.invoiceNo.slice(0, 8); // GH251013
      if (!groupedByDate[datePrefix]) {
        groupedByDate[datePrefix] = [];
      }
      groupedByDate[datePrefix].push(inv);
    });

    res.json({
      success: true,
      totalInvoices: invoiceNumbers.length,
      groupedByDate: groupedByDate,
      allInvoices: invoiceNumbers
    });

  } catch (error) {
    console.error("❌ Debug error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.get('/debug/pdfs', async (req, res) => {
  try {
    const pdfFiles = await fs.readdir(pdfDir);
    const pdfInfo = await Promise.all(
      pdfFiles.map(async (file) => {
        const filePath = path.join(pdfDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime
        };
      })
    );
    
    res.json({
      success: true,
      pdfDir: pdfDir,
      files: pdfInfo
    });
  } catch (error) {
    console.error('Error reading PDF directory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get invoice by number
router.get('/:invoiceNo', async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    if (!(await fs.pathExists(MASTER_XLSX))) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const match = data.find((row) => row['Invoice No'] === invoiceNo);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      invoice: match,
    });
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load invoice',
    });
  }
});

// Get next invoice number
router.get("/next-number", async (req, res) => {
  await acquireLock();
  try {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayPrefix = `GH${yy}${mm}${dd}`;

    console.log("📅 Today's prefix:", todayPrefix);

    let nextNumber = 1;

    if (await fs.pathExists(MASTER_XLSX)) {
      const wb = XLSX.readFile(MASTER_XLSX);
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // Convert to JSON with proper headers
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      console.log("📊 Total invoices in Excel:", data.length);

      if (data.length > 0) {
        // Extract all invoice numbers
        const allInvoiceNumbers = data
          .map(row => row["Invoice No"])
          .filter(invoiceNo => invoiceNo && typeof invoiceNo === 'string')
          .filter(invoiceNo => /^GH\d{8}$/.test(invoiceNo));

        console.log("📋 All valid invoice numbers:", allInvoiceNumbers);

        if (allInvoiceNumbers.length > 0) {
          // Filter today's invoices
          const todaysInvoices = allInvoiceNumbers.filter(invoiceNo => 
            invoiceNo.startsWith(todayPrefix)
          );

          console.log("📊 Today's invoices:", todaysInvoices);

          if (todaysInvoices.length > 0) {
            const invoiceNumbers = todaysInvoices.map(invoiceNo => {
              const numberPart = invoiceNo.slice(-2); // Last 2 digits
              return parseInt(numberPart, 10);
            }).filter(num => !isNaN(num));

            console.log("🔢 Today's invoice numbers:", invoiceNumbers);

            if (invoiceNumbers.length > 0) {
              const maxNumber = Math.max(...invoiceNumbers);
              nextNumber = maxNumber + 1;
              console.log("📈 Max number today:", maxNumber, "Next:", nextNumber);
            }
          } else {
            console.log("ℹ️ No invoices for today, starting from 01");
          }
        } else {
          console.log("ℹ️ No valid invoice numbers found");
        }
      } else {
        console.log("ℹ️ Excel file is empty");
      }
    } else {
      console.log("ℹ️ Excel file doesn't exist, starting from 01");
    }

    const nextInvoice = `${todayPrefix}${String(nextNumber).padStart(2, "0")}`;
    console.log("🆕 Generated next invoice number:", nextInvoice);
    
    // ✅ FIX: Create a placeholder entry in Excel for the next invoice number
    await createNextInvoicePlaceholder(nextInvoice, today);
    
    res.json({ 
      success: true, 
      invoiceNumber: nextInvoice,
      todayPrefix: todayPrefix,
      nextSequence: nextNumber
    });
  } catch (err) {
    console.error("❌ Error generating next invoice number:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  } finally {
    await releaseLock();
  }
});

// ✅ NEW FUNCTION: Create placeholder for next invoice number
router.get("/next-number", async (req, res) => {
  await acquireLock();
  try {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayPrefix = `GH${yy}${mm}${dd}`;

    console.log("📅 Today's prefix:", todayPrefix);

    let nextNumber = 1;

    if (await fs.pathExists(MASTER_XLSX)) {
      const wb = XLSX.readFile(MASTER_XLSX);
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // Debug: Check worksheet structure
      console.log("📊 Worksheet range:", ws['!ref']);
      
      // Convert to JSON with proper headers
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      console.log("📊 Total rows in Excel:", data.length);

      if (data.length > 0) {
        // Debug: Show first row to check column names
        console.log("📊 First row sample:", data[0]);
        console.log("📊 Available columns:", Object.keys(data[0]));

        // Extract all invoice numbers - handle different column names
        const allInvoiceNumbers = data
          .map(row => {
            // Try different possible column names for invoice number
            return row["Invoice No"] || row["Invoice No."] || row["Invoice Number"] || row["INVOICE_NO"] || "";
          })
          .filter(invoiceNo => invoiceNo && typeof invoiceNo === 'string' && invoiceNo.trim() !== '')
          .filter(invoiceNo => /^GH\d{8}$/.test(invoiceNo));

        console.log("📋 All valid invoice numbers found:", allInvoiceNumbers);

        if (allInvoiceNumbers.length > 0) {
          // Filter today's invoices
          const todaysInvoices = allInvoiceNumbers.filter(invoiceNo => 
            invoiceNo.startsWith(todayPrefix)
          );

          console.log("📊 Today's invoices:", todaysInvoices);

          if (todaysInvoices.length > 0) {
            const invoiceNumbers = todaysInvoices.map(invoiceNo => {
              const numberPart = invoiceNo.slice(-2); // Last 2 digits
              const num = parseInt(numberPart, 10);
              console.log(`🔢 Parsed ${invoiceNo} -> ${num}`);
              return num;
            }).filter(num => !isNaN(num));

            console.log("🔢 Today's valid invoice numbers:", invoiceNumbers);

            if (invoiceNumbers.length > 0) {
              const maxNumber = Math.max(...invoiceNumbers);
              nextNumber = maxNumber + 1;
              console.log("📈 Max number today:", maxNumber, "Next:", nextNumber);
            } else {
              console.log("⚠️ No valid numbers parsed from today's invoices");
            }
          } else {
            console.log("ℹ️ No invoices for today, starting from 01");
          }
        } else {
          console.log("ℹ️ No valid invoice numbers found in the format GH25101301");
          // Show what we actually found
          const allNumbers = data.map(row => row["Invoice No"] || row["Invoice No."] || row["Invoice Number"] || "").filter(n => n);
          console.log("📋 Raw invoice numbers found:", allNumbers);
        }
      } else {
        console.log("ℹ️ Excel file has no data rows");
      }
    } else {
      console.log("ℹ️ Excel file doesn't exist, starting from 01");
    }

    const nextInvoice = `${todayPrefix}${String(nextNumber).padStart(2, "0")}`;
    console.log("🆕 Generated next invoice number:", nextInvoice);
    
    res.json({ 
      success: true, 
      invoiceNumber: nextInvoice,
      todayPrefix: todayPrefix,
      nextSequence: nextNumber
    });
  } catch (err) {
    console.error("❌ Error generating next invoice number:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  } finally {
    await releaseLock();
  }
});


// Download invoice PDF
router.get('/:invoiceNo/pdf', async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    // Look for PDF file
    const pdfFileName = `invoice-${invoiceNo}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    if (!(await fs.pathExists(pdfPath))) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found for this invoice',
      });
    }

    res.download(pdfPath, `Invoice-${invoiceNo}.pdf`);
  } catch (error) {
    console.error('❌ Error serving PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF',
    });
  }
});




// Update existing invoice
router.put('/:invoiceNo', async (req, res) => {
  try {
    const { invoiceNo } = req.params;
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.customer || !invoiceData.items) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer, items',
      });
    }

    // Check if invoice exists
    const invoiceExists = await invoiceNumberExists(invoiceNo);
    if (!invoiceExists) {
      return res.status(404).json({
        success: false,
        error: `Invoice ${invoiceNo} not found`,
      });
    }

    console.log('📝 Updating invoice:', invoiceNo);

    // Compute invoice totals
    const computed = await computeInvoiceTotals(invoiceData);

    // Prepare updated row for Excel
    const updatedRow = {
      InvoiceNo: invoiceNo,
      InvoiceDate: invoiceData.invoiceDate || new Date().toISOString().slice(0, 10),
      CustomerName: invoiceData.customer.name || '',
      CustomerPhone: invoiceData.customer.phone || '',
      CustomerAddress: invoiceData.customer.address || '',
      State: invoiceData.customer.state || '',
      Subtotal: computed.subtotal,
      CGST: computed.cgst,
      SGST: computed.sgst,
      IGST: computed.igst,
      Shipping: computed.shippingCharges,
      Total: computed.total,
      PDFGenerated: 'Yes',
      CreatedAt: new Date().toISOString(),
    };

    // Update Excel file
    await updateOrAppendInvoiceRow(updatedRow);
    console.log('✅ Invoice updated:', invoiceNo);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoiceNumber: invoiceNo,
      totals: {
        subTotal: computed.subtotal,
        cgst: computed.cgst,
        sgst: computed.sgst,
        igst: computed.igst,
        shipping: computed.shippingCharges,
        total: computed.total,
      },
      amountInWords: computed.amountInWords,
    });
  } catch (error) {
    console.error('❌ Error updating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice: ' + error.message,
    });
  }
});

// Delete invoice
router.delete('/:invoiceNo', async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    if (!(await fs.pathExists(MASTER_XLSX))) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const wb = XLSX.readFile(MASTER_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const dataArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (dataArray.length <= 1) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const headers = dataArray[0];
    const invoiceNoIndex = headers.indexOf('Invoice No');

    if (invoiceNoIndex === -1) {
      return res.status(500).json({
        success: false,
        error: 'Invalid Excel format',
      });
    }

    // Filter out the invoice to delete
    const filteredData = dataArray.filter((row, index) => {
      if (index === 0) return true;
      return row[invoiceNoIndex] !== invoiceNo;
    });

    // Check if invoice was actually removed
    if (filteredData.length === dataArray.length) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Write back to file
    const newWs = XLSX.utils.aoa_to_sheet(filteredData);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    XLSX.writeFile(wb, MASTER_XLSX);

    // Also delete associated PDF if exists
    const pdfPath = path.join(pdfDir, `invoice-${invoiceNo}.pdf`);
    if (await fs.pathExists(pdfPath)) {
      await fs.remove(pdfPath);
    }

    console.log('🗑️ Invoice deleted:', invoiceNo);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice: ' + error.message,
    });
  }
});

module.exports = { router };