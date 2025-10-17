const {API_URL} = require('./config/config');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const invoiceRoutes = require('./routes/invoices');
const app = express();
const PORT = process.env.PORT;

// Sample product rates
const productRates = require('./data/productRates.json');

// Middleware
app.use(cors());
app.use(express.json());


// Ensure directories exist
const excelDir = path.join(__dirname, 'excel_files');
const pdfDir = path.join(__dirname, 'pdf_files');
fs.ensureDirSync(excelDir);
fs.ensureDirSync(pdfDir);

// Use invoice routes
// app.use('/api/invoices', InvoiceRoutes);
app.use('/api/invoices', invoiceRoutes); 

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const productsArray = productRates.map(product => ({
      name: product.name,
      quantity: product.quantity,
      rate: product.rate
    }));

    res.json({ 
      success: true,
      rates: productsArray 
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch products' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/', (req,res)=>{
  res.status(200).json({
    message: 'Server is running and Backend for Invoice Generator Application is now online'
  })
})



// Start server
app.listen(PORT, (req, res) => {
  console.log(`✅ Backend server running on ${API_URL}`);
  console.log(`📊 Excel files directory: ${excelDir}`);
  console.log(`📄 PDF files directory: ${pdfDir}`);

});

module.exports = app;