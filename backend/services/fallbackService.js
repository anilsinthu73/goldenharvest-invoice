const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');

const pdfDir = path.join(__dirname, '../pdf_files');
fs.ensureDirSync(pdfDir);

const generatePDFFromHTML = async (htmlContent, invoiceNumber) => {
  let browser, page;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      preferCSSPageSize: true
    });

    const pdfPath = path.join(pdfDir, `invoice-${invoiceNumber}.pdf`);
    await fs.writeFile(pdfPath, pdf);
    return `${API_BASE_URL}/${invoiceNumber}/pdf`;

  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generatePDFFromHTML };
