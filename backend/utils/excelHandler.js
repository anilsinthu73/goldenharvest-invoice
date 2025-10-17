import ExcelJS from 'exceljs';
import pdf from 'html-pdf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE_PATH = path.join(__dirname, '../../Golden_Harvest_Invoice.xlsx');

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    
    let words = '';
    
    if (n >= 100) {
      words += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      words += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      words += teens[n - 10] + ' ';
      n = 0;
    }
    
    if (n > 0) {
      words += ones[n] + ' ';
    }
    
    return words.trim();
  }
  
  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  
  if (crore > 0) {
    result += convertLessThanThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanThousand(remainder);
  }
  
  const paise = Math.round((num - Math.floor(num)) * 100);
  if (paise > 0) {
    result += ` and ${paise} Paise`;
  }
  
  return result.trim() + ' Rupees Only';
}

export async function getAllInvoices() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE_PATH);
  const worksheet = workbook.getWorksheet('Tax Invoice');
  
  const invoices = [];
  let currentInvoice = null;
  
  worksheet.eachRow((row, rowNumber) => {
    const billToCell = row.getCell('B').value;
    
    if (billToCell && billToCell.toString().includes('BILL TO :')) {
      if (currentInvoice) {
        invoices.push(currentInvoice);
      }
      
      currentInvoice = {
        id: `GH-${invoices.length + 1}`,
        customer: {},
        items: [],
        totals: {},
        invoiceNumber: '',
        invoiceDate: ''
      };
      
      // Extract customer name from next row
      const customerNameRow = worksheet.getRow(rowNumber + 1);
      currentInvoice.customer.name = customerNameRow.getCell('B').value || '';
    }
    
    if (currentInvoice) {
      // Extract invoice number and date
      const invoiceNoCell = row.getCell('F').value;
      if (invoiceNoCell && invoiceNoCell.toString().startsWith('GH-')) {
        currentInvoice.invoiceNumber = invoiceNoCell;
      }
      
      const invoiceDateCell = row.getCell('F').value;
      if (invoiceDateCell && invoiceDateCell.toString().includes('2025')) {
        currentInvoice.invoiceDate = invoiceDateCell;
      }
      
      // Extract items (simplified parsing)
      const qtyCell = row.getCell('A').value;
      if (qtyCell && !isNaN(qtyCell) && qtyCell > 0) {
        const description = row.getCell('B').value;
        const quantity = row.getCell('D').value;
        const rate = row.getCell('E').value;
        const amount = row.getCell('F').value?.result || row.getCell('F').value;
        
        if (description && quantity && rate) {
          currentInvoice.items.push({
            description,
            quantity,
            rate,
            amount: amount || quantity * rate
          });
        }
      }
    }
  });
  
  if (currentInvoice) {
    invoices.push(currentInvoice);
  }
  
  return invoices;
}

export async function createInvoice(invoiceData) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE_PATH);
  const worksheet = workbook.getWorksheet('Tax Invoice');
  
  // Find the next available row for new invoice
  let lastRow = worksheet.rowCount;
  while (lastRow > 0 && !worksheet.getRow(lastRow).getCell(1).value) {
    lastRow--;
  }
  
  const startRow = lastRow + 5;
  
  // Generate new invoice number
  const invoiceNumber = `GH-${(await getAllInvoices()).length + 1}`;
  
  // Write invoice data
  const writeRow = (rowNum, data) => {
    const row = worksheet.getRow(rowNum);
    Object.keys(data).forEach(key => {
      row.getCell(key).value = data[key];
    });
  };
  
  // Write invoice header
  writeRow(startRow, { B: 'BILL TO :' });
  writeRow(startRow + 1, { B: invoiceData.customer.name });
  writeRow(startRow + 2, { B: 'Phone' });
  writeRow(startRow + 3, { B: `Address: ${invoiceData.customer.address}` });
  writeRow(startRow, { F: `Invoice No: ${invoiceNumber}` });
  writeRow(startRow + 1, { F: `Invoice Date: ${new Date().toISOString().split('T')[0]} 00:00:00` });
  
  // Write items
  writeRow(startRow + 6, { A: 'Qty', B: 'Description', D: 'Qty.', E: 'Rate', F: 'Amount' });
  
  invoiceData.items.forEach((item, index) => {
    writeRow(startRow + 7 + index, {
      A: index + 1,
      B: item.description,
      D: item.quantity,
      E: item.rate,
      F: { formula: `=IF(D${startRow + 7 + index}>0,E${startRow + 7 + index}*D${startRow + 7 + index}," " )` }
    });
  });
  
  // Write totals
  const itemsEndRow = startRow + 7 + invoiceData.items.length;
  writeRow(itemsEndRow + 1, { B: 'Terms & Conditions:', F: { formula: `=SUM(F${startRow + 7}:F${itemsEndRow})` } });
  writeRow(itemsEndRow + 2, { B: '1. Goods once sold cannot be returned.', F: { formula: `=F${itemsEndRow + 1}*2.5%` } });
  writeRow(itemsEndRow + 3, { B: '2. Shipping Charges applicable...', F: { formula: `=F${itemsEndRow + 1}*2.5%` } });
  writeRow(itemsEndRow + 5, { B: '3. Shipping Charges for First order is Free.', F: 'Shipping Charges' });
  writeRow(itemsEndRow + 6, { F: { formula: `=SUM(F${itemsEndRow + 1}:F${itemsEndRow + 5})` } });
  
  // Write amount in words
  const totalAmount = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  writeRow(itemsEndRow + 8, { B: `Total Amount In Words\n${numberToWords(totalAmount)}` });
  
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  
  return {
    ...invoiceData,
    id: invoiceNumber,
    invoiceNumber,
    invoiceDate: new Date().toISOString().split('T')[0]
  };
}

export async function generatePDF(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .invoice-header { text-align: center; margin-bottom: 30px; }
        .company-info { float: right; text-align: right; }
        .customer-info { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .totals { float: right; margin-top: 20px; }
        .terms { margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <h2>Tax Invoice</h2>
        <h3>GOLDEN HARVEST</h3>
      </div>
      
      <div class="company-info">
        <p>GSTIN: 37CTWPJ4314B1ZN</p>
        <p>Mobile: 9949589098</p>
        <p>Mail: goldenharvest0648@gmail.com</p>
        <p>Address: SH-31, Chinna Thulugu, Gara, Srikakulam, Andhra Pradesh - 532405</p>
      </div>
      
      <div class="customer-info">
        <h4>BILL TO:</h4>
        <p><strong>${invoice.customer.name}</strong></p>
        <p>Address: ${invoice.customer.address}</p>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Qty</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.srNo}</td>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>₹${item.rate}</td>
              <td>₹${item.amount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <p><strong>Sub Total: ₹${invoice.totals.subTotal}</strong></p>
        <p>CGST @2.5%: ₹${invoice.totals.cgst}</p>
        <p>SGST @2.5%: ₹${invoice.totals.sgst}</p>
        <p>Shipping Charges: ₹${invoice.totals.shipping}</p>
        <p><strong>Total: ₹${invoice.totals.total}</strong></p>
      </div>
      
      <div class="terms">
        <p><strong>Total Amount In Words:</strong></p>
        <p>${numberToWords(invoice.totals.total)}</p>
        <br>
        <p><strong>Terms & Conditions:</strong></p>
        <p>1. Goods once sold cannot be returned.</p>
        <p>2. Shipping Charges applicable to customers from other than Andhra Pradesh state.</p>
        <p>3. Shipping Charges for First order is Free.</p>
        <br>
        <p>Authorised Signatory</p>
      </div>
    </body>
    </html>
  `;
  
  return new Promise((resolve, reject) => {
    pdf.create(htmlTemplate).toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}