const express = require('express');
const { createInvoice, getInvoices, getInvoiceByNo, getInvoiceByNoPDF, downloadPDF,viewPDF } = require('../controllers/invoiceController');

const router = express.Router();

router.post('/', createInvoice);
router.get('/', getInvoices);
router.get('/:invoiceNo', getInvoiceByNo);
router.get('/:invoiceNo/pdf', downloadPDF);
router.get('/:invoiceNo/pdf-url', getInvoiceByNoPDF);

router.get('/:invoiceNo/view', viewPDF);



module.exports = router;
