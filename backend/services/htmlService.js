const path = require('path');
const { imageToBase64 } = require('../utils/imageToBase64');
const { convertToWords } = require('../utils/numberToWords');

const generateInvoiceHTML = (invoice) => {
  const items = invoice.items || [];
  const subTotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const cgst = subTotal * 0.025;
  const sgst = subTotal * 0.025;
  const shipping = invoice.shipping || 0;
  const total = subTotal + cgst + sgst + shipping;

  const customer = {
    name: invoice.customerName || invoice.customer?.name || 'N/A',
    phone: invoice.customerPhone || invoice.customer?.phone || 'N/A',
    address: invoice.customerAddress || invoice.customer?.address || 'N/A',
    state: invoice.state || invoice.customer?.state || 'N/A'
  };

  const invoiceDate = invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN') : 'N/A';

  const itemsHTML = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${item.name}</strong>${item.details ? `<div style="color: #7f8c8d; font-size: 11px;">${item.details}</div>` : ''}</td>
      <td>${item.qty}</td>
      <td><span class="currency">₹</span>${item.rate.toFixed(2)}</td>
      <td><span class="currency">₹</span>${(item.qty * item.rate).toFixed(2)}</td>
    </tr>
  `).join('');

  const logoPath = path.join(__dirname, '../assets/logo.png');
  const logoBase64 = imageToBase64(logoPath);
  const amountInWords = convertToWords(total);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', Arial, sans-serif;
      margin: 0;
      padding: 25px;
      color: #2c3e50;
      line-height: 1.6;
      background: #ffffff;
      font-size: 14px;
    }
    
    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .header-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .company-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 25px;
      background: #f8f9fa;
      border-bottom: 3px solid #e9ecef;
    }
    
    .logo-section {
      flex: 1;
      text-align: center;
    }
    
    .logo-placeholder {
      width: 120px;
      height: 120px;
      background: linear-gradient(45deg, #ff6b6b, #ee5a24);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      margin: 0 auto;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    .company-details {
      flex: 2;
      text-align: center;
    }
    
    .contact-info {
      flex: 1;
      text-align: right;
      font-size: 12px;
      line-height: 1.8;
    }
    
    .details-section {
      display: flex;
      justify-content: space-between;
      gap: 25px;
      margin: 30px 25px;
    }
    
    .bill-to, .invoice-details {
      flex: 1;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      border-left: 5px solid #3498db;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    
    .invoice-details {
      border-left-color: #e74c3c;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #bdc3c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px dashed #ddd;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      font-weight: 600;
      color: #34495e;
      min-width: 140px;
    }
    
    .detail-value {
      font-weight: 500;
      text-align: right;
      flex: 1;
    }
    
    .customer-name {
      color: #2980b9;
      font-weight: 700;
    }
    
    .invoice-number {
      color: #c0392b;
      font-weight: 700;
      font-size: 16px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    th {
      background: linear-gradient(135deg, #2c3e50, #34495e);
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 12px;
    }
    
    td {
      padding: 14px 12px;
      border-bottom: 1px solid #ecf0f1;
      vertical-align: top;
    }
    
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    tr:hover {
      background-color: #e8f4f8;
    }
    
    .summary-section {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin: 25px;
    }
    
    .terms-section {
      flex: 1;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #27ae60;
    }
    
    .totals-section {
      flex: 1;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #e74c3c;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px dashed #bdc3c7;
    }
    
    .total-row:last-child {
      border-bottom: none;
      border-top: 2px solid #2c3e50;
      font-weight: 700;
      font-size: 15px;
      color: #2c3e50;
    }
    
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 30px 25px;
      gap: 30px;
    }
    
    .amount-words {
      flex: 2;
      background: #e8f4f8;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
      font-style: italic;
    }
    
    .signature {
      flex: 1;
      text-align: center;
      padding: 20px;
    }
    
    .signature-line {
      width: 200px;
      height: 1px;
      background: #2c3e50;
      margin: 40px auto 8px;
    }
    
    .thank-you {
      text-align: center;
      background: linear-gradient(135deg, #ffeaa7, #fab1a0);
      color: #2d3436;
      padding: 25px;
      font-size: 22px;
      font-weight: 800;
      margin-top: 20px;
      border-radius: 0 0 12px 12px;
    }
    
    .currency {
      font-family: Arial, sans-serif;
    }
    
    .highlight {
      background: #fff3cd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    
    <!-- Header Section -->
    <div class="header-section">
      <h1 style="font-size: 32px; margin-bottom: 10px; font-weight: 800;">TAX INVOICE</h1>
      <p style="font-size: 16px; opacity: 0.9;">Official Commercial Document</p>
    </div>

    <!-- Company Information -->
    <div class="company-info">
      <div class="logo-section">
        <img src="${logoBase64}" 
             alt="Golden Harvest Logo" 
             style="width: 120px; height: 120px; object-fit: contain; border-radius: 50%;">
      </div>
      
      <div class="company-details">
        <h2 style="font-size: 28px; color: #2c3e50; margin-bottom: 10px; font-weight: 700;">GOLDEN HARVEST</h2>
        <p style="color: #7f8c8d; font-size: 14px; font-weight: 500;">Premium Quality Food Products</p>
      </div>
      
      <div class="contact-info">
        <div>📍 SH-31, Chinna Thulugu, Gara</div>
        <div>Srikakulam, Andhra Pradesh - 532405</div>
        <div>📞 +91 9949589098</div>
        <div>📧 goldenharvest0648@gmail.com</div>
        <div>🏢 GSTIN: 37CTWPJ4314B1ZN</div>
        <div>🥫 FSSAI: 10125001000050</div>
      </div>
    </div>

    <!-- Customer & Invoice Details -->
    <div class="details-section">
      <!-- Bill To Section -->
      <div class="bill-to">
        <h3 class="section-title">💼 Bill To</h3>
        <div class="detail-row">
          <span class="detail-label">Customer Name:</span>
          <span class="detail-value customer-name">${customer.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Phone Number:</span>
          <span class="detail-value">📞 +91 ${customer.phone}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">📍 ${customer.address}</span>
        </div>
      </div>
      
      <!-- Invoice Details Section -->
      <div class="invoice-details">
        <h3 class="section-title">📋 Invoice Details</h3>
        <div class="detail-row">
          <span class="detail-label">Invoice Number:</span>
          <span class="detail-value invoice-number">${invoice.invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice Date:</span>
          <span class="detail-value">📅 ${invoiceDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">State:</span>
          <span class="detail-value">🏛️ ${customer.state}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th width="5%">#</th>
          <th width="45%">Item Description</th>
          <th width="10%">Quantity</th>
          <th width="20%">Rate (<span class="currency">₹</span>)</th>
          <th width="20%">Amount (<span class="currency">₹</span>)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <!-- Summary Section -->
    <div class="summary-section">
      <!-- Terms & Conditions -->
      <div class="terms-section">
        <h3 class="section-title">📝 Terms & Conditions</h3>
        <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
          <li>Goods once sold cannot be returned or exchanged</li>
          <li>Shipping charges applicable for orders outside Andhra Pradesh</li>
          <li>First order shipping is free for all customers</li>
          <li>Payment due within 15 days from invoice date</li>
          <li>Prices inclusive of all applicable taxes</li>
        </ol>
      </div>
      
      <!-- Totals -->
      <div class="totals-section">
        <h3 class="section-title">💰 Payment Summary</h3>
        <div class="total-row">
          <span>Sub Total:</span>
          <span><span class="currency">₹</span>${subTotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>CGST @2.5%:</span>
          <span><span class="currency">₹</span>${cgst.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>SGST @2.5%:</span>
          <span><span class="currency">₹</span>${sgst.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Shipping Charges:</span>
          <span><span class="currency">₹</span>${shipping.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span><strong>Grand Total:</strong></span>
          <span><strong><span class="currency">₹</span>${total.toFixed(2)}</strong></span>
        </div>
      </div>
    </div>

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="amount-words">
        <h3 class="section-title">🔠 Amount in Words</h3>
        <p style="font-weight: 500; line-height: 1.6;">${amountInWords}</p>
      </div>
      
      <div class="signature">
        <div class="signature-line"></div>
        <p style="font-weight: 700; color: #2c3e50; margin-top: 8px;">Authorised Signatory</p>
        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">For Golden Harvest</p>
      </div>
    </div>

    <!-- Thank You Section -->
    <div class="thank-you">
      <div>🎉 Thank You for Your Business! 🎉</div>
      <div style="font-size: 16px; margin-top: 8px; opacity: 0.9;">We appreciate your trust in Golden Harvest</div>
    </div>
  </div>
</body>
</html> `;
};

module.exports = { generateInvoiceHTML };
