// backend/services/directPdfService.js
const puppeteer = require('puppeteer');

const generatePDFFromHTML = async (htmlContent) => {
  let browser;
  try {
    console.log('🔄 Generating PDF from HTML content...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    // Set content directly instead of navigating to URL
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });

    // Wait for any dynamic content
    await page.waitForTimeout(1000);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
     margin: {
    top: '10mm',
    bottom: '10mm',
    left: '10mm',
    right: '10mm'
  },
  scale: 1,
    });

    console.log('✅ PDF generated from HTML successfully');
    return pdf;

  } catch (error) {
    console.error('❌ PDF generation from HTML failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { generatePDFFromHTML };