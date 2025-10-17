// services/invoiceService.js
import { convertAmountToWords } from "../utils/InvoiceUtils";

// Calculate invoice totals
export const calculateInvoiceTotals = (items, shipping = 0, billToState = "") => {
  const subtotalTotal = items.reduce((sum, item) => {
    return sum + ((item.qty || 0) * (item.rate || 0));
  }, 0);

  const isAP = billToState?.trim().toLowerCase() === "andhra pradesh";
  const cgst = isAP ? subtotalTotal * 0.025 : 0;
  const sgst = isAP ? subtotalTotal * 0.025 : 0;
  const igst = isAP ? 0 : subtotalTotal * 0.05;
  const total = subtotalTotal + cgst + sgst + igst + Number(shipping || 0);
  
  const amountInWords = total > 0 ? convertAmountToWords(total) : "Zero Rupees Only";

  return {
    subtotalTotal,
    cgst,
    sgst,
    igst,
    total,
    amountInWords,
    isAP
  };
};

// Validate invoice data
export const validateInvoiceData = (invoiceMeta, items) => {
  const errors = [];

  if (!invoiceMeta.invoiceNo) {
    errors.push("Invoice number not generated yet!");
  }

  if (!invoiceMeta.billToName?.trim()) {
    errors.push("Enter customer name");
  }

  if (!invoiceMeta.billToAddress?.trim()) {
    errors.push("Enter customer address");
  }

  if (items.some((item) => !item.name?.trim())) {
    errors.push("Enter product name for all items");
  }

  if (items.some((item) => item.qty <= 0)) {
    errors.push("Quantity must be greater than 0 for all items");
  }

  if (items.some((item) => item.rate < 0)) {
    errors.push("Rate cannot be negative for any item");
  }

  return errors;
};

// Prepare invoice payload
export const prepareInvoicePayload = (invoiceMeta, items, shipping = 0) => {
  const { subtotalTotal, total, cgst, sgst, igst, amountInWords } = 
    calculateInvoiceTotals(items, shipping, invoiceMeta.billToState);

  return {
    invoiceNumber: invoiceMeta.invoiceNo,
    invoiceDate: invoiceMeta.invoiceDate,
    customer: {
      name: invoiceMeta.billToName,
      phone: invoiceMeta.billToPhone,
      address: invoiceMeta.billToAddress,
      state: invoiceMeta.billToState,
    },
    items: items.map((item) => ({
      name: item.name,
      qty: item.qty,
      rate: item.rate,
      amount: (item.qty || 0) * (item.rate || 0),
    })),
    totals: {
      subTotal: subtotalTotal,
      cgst,
      sgst,
      igst,
      shipping: Number(shipping || 0),
      total,
    },
    amountInWords,
  };
};

// Prepare preview data
export const preparePreviewData = (invoiceMeta, items, shipping = 0) => {
  const { subtotalTotal, total, cgst, sgst, igst, amountInWords } = 
    calculateInvoiceTotals(items, shipping, invoiceMeta.billToState);

  return {
    invoiceNumber: invoiceMeta.invoiceNo,
    date: invoiceMeta.invoiceDate,
    customerName: invoiceMeta.billToName,
    customerPhone: invoiceMeta.billToPhone,
    customerAddress: invoiceMeta.billToAddress,
    state: invoiceMeta.billToState,
    items: items.map(item => ({
      name: item.name,
      qty: item.qty,
      rate: item.rate,
      amount: (item.qty || 0) * (item.rate || 0),
      details: `${item.name}-1kg @₹${item.rate.toFixed(2)}`
    })),
    subTotal: subtotalTotal,
    cgst,
    sgst,
    igst,
    shipping: Number(shipping || 0),
    total,
    amountInWords
  };
};

// Encode data for URL
export const encodeDataForURL = (data) => {
  const jsonString = JSON.stringify(data);
  
  try {
    if (typeof TextEncoder !== 'undefined') {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);
      return btoa(String.fromCharCode(...uint8Array));
    } else {
      return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, 
        (match, p1) => String.fromCharCode('0x' + p1)
      ));
    }
  } catch (error) {
    console.error("UTF-8 encoding failed, using simple base64:", error);
    return btoa(jsonString);
  }
};

// Fetch products from API
export const fetchProducts = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/products");

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("🔎 Products API Response:", data);

    let fetchedProducts = [];
    if (Array.isArray(data.rates)) {
      fetchedProducts = data.rates.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        rate: Number(p.rate),
      }));
    } else if (Array.isArray(data)) {
      fetchedProducts = data.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        rate: Number(p.rate),
      }));
    } else {
      console.error("⚠️ Unexpected API structure", data);
    }

    console.log("✅ Loaded Products:", fetchedProducts);
    return fetchedProducts;
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    throw err;
  }
};
