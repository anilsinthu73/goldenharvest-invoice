const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { generateInvoiceHTML } = require('./htmlService');
const { generatePDFFromHTML } = require('./fallbackService');
const {API_BASE_URL, FRONTEND_URL} = require('../config/config');

const pdfDir = path.join(__dirname, '../pdf_files');
fs.ensureDirSync(pdfDir);


const generateInvoicePDF = async (pdfData) => {
  let browser, page;

  try {
    console.log(`🔄 Starting PDF generation for invoice: ${pdfData.invoiceNumber}`);

    // Basic validation
    if (!pdfData.invoiceNumber) throw new Error('Invoice number is required');
    if (!pdfData.items || pdfData.items.length === 0) throw new Error('Invoice must have at least one item');

    // Encode data to pass to frontend preview
    const jsonString = JSON.stringify(pdfData);
    const encodedData = Buffer.from(jsonString).toString('base64');

    // URL to frontend preview
    
    const previewUrl = `${FRONTEND_URL}/preview/${pdfData.invoiceNumber}?data=${encodedData}&source=pdf&timestamp=${Date.now()}`;

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 100000
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setDefaultNavigationTimeout(100000);
    await page.setDefaultTimeout(100000);

    // Optional: log browser console
    page.on('console', msg => console.log(`📱 Browser [${msg.type()}]: ${msg.text()}`));

    console.log('🚀 Navigating to preview page...');
    console.log(previewUrl);
    await page.goto(previewUrl, { waitUntil: ['networkidle0', 'domcontentloaded'], timeout: 80000 });

    // Wait for invoice container to render
    await page.waitForSelector('#invoice-container', { visible: true, timeout: 15000 });

    // Extra wait for full rendering
    await page.evaluate(() => new Promise(res => setTimeout(res, 4000)));

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      scale:0.9,
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    // Save PDF
    const pdfPath = path.join(pdfDir, `invoice-${pdfData.invoiceNumber}.pdf`);
    await fs.writeFile(pdfPath, pdf);
    console.log(`✅ PDF saved: ${pdfPath}`);

    return `${API_BASE_URL}/${pdfData.invoiceNumber}.pdf`;

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
};

/**
 * PDF generation with retry & fallback
 */
const generateInvoicePDFWithRetry = async (pdfData, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 PDF Generation Attempt ${attempt}/${maxRetries} for invoice: ${pdfData.invoiceNumber}`);
      return await generateInvoicePDF(pdfData);

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        console.log('🔄 Using HTML template fallback...');
        return await generatePDFFromHTML(generateInvoiceHTML(pdfData), pdfData.invoiceNumber);
      }

      // Wait before retry
      const retryDelay = attempt * 3000;
      console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
      await new Promise(res => setTimeout(res, retryDelay));
    }
  }
};

module.exports = { generateInvoicePDF: generateInvoicePDFWithRetry };
