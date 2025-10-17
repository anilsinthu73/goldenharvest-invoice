// services/invoicePreviewService.js
import axios from "axios";


const API_BASE_URL = "http://localhost:5000/api";

// Unified URL data decoder for both create and pdf sources
export const decodeURLData = (encodedData, source) => {
  if (!encodedData) {
    console.log("❌ No encoded data provided");
    return null;
  }

  console.log(`🔄 Decoding URL data for source: ${source}`);
  console.log("🔐 Encoded data length:", encodedData.length);
  console.log("🔐 Encoded data sample:", encodedData.substring(0, 50) + '...');

  try {
    // Method 1: Simple base64 decode (works for both create and pdf)
    console.log("🔄 Attempting simple base64 decode...");
    const jsonString = atob(encodedData);
    const decodedData = JSON.parse(jsonString);
    
    console.log("✅ Simple base64 decode successful");
    return decodedData;
    
  } catch (simpleError) {
    console.error("❌ Simple base64 decode failed:", simpleError.message);
    
    // Method 2: Try with URI decode (backward compatibility)
    try {
      console.log("🔄 Trying URI decode fallback...");
      const decodedUri = decodeURIComponent(escape(atob(encodedData)));
      const decodedData = JSON.parse(decodedUri);
      console.log("✅ URI decode successful");
      return decodedData;
    } catch (uriError) {
      console.error("❌ All decoding methods failed:", uriError.message);
      return null;
    }
  }
};

// Calculate invoice values if not provided
export const calculateInvoiceValues = (invoiceData) => {
  if (!invoiceData) return {};

  const subTotal = invoiceData.subTotal || 
                  invoiceData.totals?.subTotal || 
                  (invoiceData.items || []).reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);
  
  const cgst = invoiceData.cgst || invoiceData.totals?.cgst || 0;
  const sgst = invoiceData.sgst || invoiceData.totals?.sgst || 0;
  const igst = invoiceData.igst || invoiceData.totals?.igst || 0;
  const shipping = invoiceData.shipping || invoiceData.totals?.shipping || 0;
  const total = invoiceData.total || invoiceData.totals?.total || (subTotal + cgst + sgst + igst + shipping);

  return { subTotal, cgst, sgst, igst, shipping, total };
};

// Function to convert amount to words
export const convertToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  
  let words = '';
  
  // Convert rupees
  if (rupees > 0) {
    if (rupees >= 100000) {
      const lakhs = Math.floor(rupees / 100000);
      if (lakhs > 0) {
        words += convertToWords(lakhs) + ' Lakh ';
        rupees %= 100000;
      }
    }
    
    if (rupees >= 1000) {
      const thousands = Math.floor(rupees / 1000);
      if (thousands > 0) {
        if (thousands >= 20) {
          words += b[Math.floor(thousands / 10)] + ' ';
          if (thousands % 10 > 0) {
            words += a[thousands % 10] + ' ';
          }
        } else {
          words += a[thousands] + ' ';
        }
        words += 'Thousand ';
        rupees %= 1000;
      }
    }
    
    if (rupees >= 100) {
      const hundreds = Math.floor(rupees / 100);
      words += a[hundreds] + ' Hundred ';
      rupees %= 100;
    }
    
    if (rupees > 0) {
      if (rupees < 20) {
        words += a[rupees] + ' ';
      } else {
        words += b[Math.floor(rupees / 10)] + ' ';
        if (rupees % 10 > 0) {
          words += a[rupees % 10] + ' ';
        }
      }
    }
    
    words += 'Rupees';
  }
  
  // Convert paise
  if (paise > 0) {
    if (words !== '') words += ' and ';
    
    if (paise < 20) {
      words += a[paise] + ' ';
    } else {
      words += b[Math.floor(paise / 10)] + ' ';
      if (paise % 10 > 0) {
        words += a[paise % 10] + ' ';
      }
    }
    
    words += 'Paises';
  }
  
  return words + ' Only';
};

// Get customer data from invoice
export const getCustomerData = (invoiceData) => {
  if (!invoiceData) return {};
  
  return {
    name: invoiceData.customerName || invoiceData.customer?.name || '',
    phone: invoiceData.customerPhone || invoiceData.customer?.phone || '',
    address: invoiceData.customerAddress || invoiceData.customer?.address || '',
    state: invoiceData.state || invoiceData.customer?.state || ''
  };
};

// Fetch invoice data with priority order
export const fetchInvoiceData = async (invoiceNumber, searchParams, location) => {
  try {
    console.log("🔍 Loading invoice:", invoiceNumber);

    // Get URL parameters
    const urlData = searchParams.get('data');
    const source = searchParams.get('source');
    const timestamp = searchParams.get('timestamp');
    
    console.log("🔗 URL Parameters:", { 
      source, 
      timestamp,
      hasData: !!urlData, 
      urlDataLength: urlData?.length 
    });

    // PRIORITY 1: URL PARAMETERS (both create and pdf flows)
    if (urlData) {
      console.log(`🔄 Processing URL data from source: ${source}`);
      const decodedData = decodeURLData(urlData, source);
      
      if (decodedData && decodedData.invoiceNumber) {
        console.log("✅ URL data decoded successfully:", {
          invoiceNumber: decodedData.invoiceNumber,
          customer: decodedData.customerName,
          items: decodedData.items?.length,
          total: decodedData.total,
          source: source
        });
        
        return { data: decodedData, source: 'url' };
      } else {
        console.error("❌ URL data decoding produced invalid data");
      }
    }

    // PRIORITY 2: NAVIGATION STATE (mainly for create flow)
    if (location.state?.invoice) {
      console.log("✅ Using data from navigation state:", {
        invoiceNumber: location.state.invoice.invoiceNumber,
        source: location.state.source || 'state',
        savedToBackend: location.state.savedToBackend
      });
      return { data: location.state.invoice, source: 'state' };
    }

    // PRIORITY 3: LOCALSTORAGE BACKUP (for create flow)
    const storageKey = `previewData_${invoiceNumber}`;
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      try {
        console.log("💾 Loading from localStorage backup");
        const parsedData = JSON.parse(storedData);
        return { data: parsedData, source: 'localStorage' };
      } catch (storageError) {
        console.error("❌ localStorage parse failed:", storageError);
      }
    }

    // PRIORITY 4: BACKEND API (for saved invoices only)
    console.log("📡 No local data found, fetching from backend API...");
    const response = await axios.get(`http://localhost:5000/api/invoices/${invoiceNumber}`);
    
    if (response.data.success) {
      console.log("✅ SAVED invoice data loaded from backend");
      return { data: response.data.invoice, source: 'backend' };
    } else {
      throw new Error("Invoice not found in backend");
    }
  } catch (err) {
    console.error("❌ Error loading invoice:", err);
    throw err;
  }
};

// Handle error messages based on source
export const getErrorMessage = (error, source) => {
  if (error.response?.status === 404) {
    if (source === 'pdf') {
      return "PDF Generation Failed: Invoice not found in backend. Please save the invoice first.";
    } else {
      return "Invoice not found in backend. It may not be saved yet.";
    }
  } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
    return "Network error: Cannot connect to backend server.";
  } else {
    return error.response?.data?.error || "Failed to load invoice data";
  }
};

//  Get loading message based on source
export const getLoadingMessage = (source) => {
  return {
    title: source === 'pdf' ? '🖨️ Generating PDF...' : 'Loading Invoice...',
    message: source === 'pdf' 
      ? 'Preparing your PDF document...' 
      : `Loading invoice...`,
    note: source === 'pdf' ? '📊 This may take a few moments...' : null
  };
};

export const getErrorConfig = (source) => {
  return {
    title: source === 'pdf' ? '❌ PDF Generation Failed' : 'Failed to Load Invoice ',
    buttons: source === 'pdf' 
      ? [
          { label: 'Back to Create Invoice', action: 'navigate', path: '/', color: '#3498db' },
          { label: 'Retry PDF Generation', action: 'reload', color: '#2ecc71' }
        ]
      : [
          { label: 'Create New Invoice', action: 'navigate', path: '/', color: '#3498db' },
          { label: 'Go Back', action: 'goBack', color: '#95a5a6' }
        ]
  };
};


// Prepare complete invoice data for PDF generation
export const prepareInvoiceDataForPDF = (invoiceData, invoiceNumber) => {
  const { subTotal, cgst, sgst, igst, shipping, total } = calculateInvoiceValues(invoiceData);
  const customer = getCustomerData(invoiceData);
  const amountInWords = invoiceData.amountInWords || convertToWords(total);

  return {
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceData.date || invoiceData.invoiceDate,
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      state: customer.state
    },
    items: (invoiceData.items || []).map(item => ({
      name: item.name,
      qty: item.qty,
      rate: item.rate,
      amount: (item.qty || 0) * (item.rate || 0),
      details: item.details || `${item.name}-1kg @₹${(item.rate || 0).toFixed(2)}`
    })),
    totals: {
      subTotal,
      cgst,
      sgst,
      igst,
      shipping,
      total
    },
    amountInWords,
    // Include additional metadata if needed
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'frontend-pdf-generation'
    }
  };
};


export const checkInvoiceExists = async (invoiceNumber) => {
  try {
    console.log("🔍 Checking if invoice exists in backend:", invoiceNumber);
    const response = await axios.get(`${API_BASE_URL}/invoices/${invoiceNumber}`);
    
    if (response.data.success) {
      console.log("✅ Invoice found in backend");
      return { 
        exists: true, 
        invoice: response.data.invoice,
        message: "Invoice found in database"
      };
    } else {
      console.log("❌ Invoice not found in backend");
      return { 
        exists: false, 
        message: "Invoice not found in database" 
      };
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("❌ Invoice not found in backend (404)");
      return { 
        exists: false, 
        message: "Invoice not found in database" 
      };
    }
    console.error("❌ Error checking invoice existence:", error);
    throw new Error(`Failed to check invoice: ${error.message}`);
  }
};

export const downloadExistingInvoicePDF = async (invoiceNumber) => {
  try {
    console.log("📄 Downloading PDF for existing invoice:", invoiceNumber);
    
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceNumber}/pdf`);
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error downloading existing invoice PDF:", error);
    throw error;
  }
};

export const generateAndDownloadInvoicePDF = async (invoiceData, invoiceNumber) => {
  try {
    console.log("📄 Generating PDF for invoice:", invoiceNumber);

    const pdfPayload = prepareInvoiceDataForPDF(invoiceData, invoiceNumber);

    // Send invoice data to backend for PDF generation
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pdfPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Wait for backend to confirm PDF generation
    const result = await response.json();
    console.log("✅ PDF generated on backend:", result);

     await new Promise(resolve => setTimeout(resolve, 5000));


    // Immediately download the generated PDF
    await downloadExistingInvoicePDF(invoiceNumber);

    return {
      success: true,
      message: "PDF generated and download triggered successfully",
      source: "generated",
      invoiceNumber,
    };

  } catch (error) {
    console.error("❌ Error generating/downloading PDF:", error);
    throw new Error("PDF generation/download failed: " + error.message);
  }
};

// ✅ Make sure API_BASE_URL is imported or defined
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ✅ Generate and Download PDF with Progress
export const generateAndDownloadPDFWithProgress = async (invoiceData, invoiceNumber, onProgress) => {
  try {
    console.log("📄 Generating PDF with progress tracking:", invoiceNumber);

    const pdfPayload = prepareInvoiceDataForPDF(invoiceData, invoiceNumber);

    onProgress?.("Preparing data...", 10);

    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pdfPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    onProgress?.("Generating PDF...", 40);

    // Track PDF stream progress
    const contentLength = response.headers.get("Content-Length");
    const total = parseInt(contentLength, 10);
    let loaded = 0;
    const chunks = [];

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable.");

    onProgress?.("Downloading PDF...", 60);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total && onProgress) {
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        onProgress(`Downloading PDF... ${percent}%`, 60 + percent * 0.3);
      }
    }

    onProgress?.("Validating PDF...", 90);

    const blob = new Blob(chunks, { type: "application/pdf" });
    if (!blob || blob.size === 0) throw new Error("Generated PDF is empty.");

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      throw new Error("Generated file is not a valid PDF.");
    }

    onProgress?.("Finalizing download...", 95);

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${invoiceNumber}.pdf`;
    a.style.display = "none";
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onProgress?.("Download completed!", 100);
    }, 1000);

    return {
      success: true,
      message: "PDF generated and downloaded successfully",
      fileSize: blob.size,
    };
  } catch (error) {
    console.error("❌ Error in PDF generation with progress:", error);
    throw error;
  }
};

export const downloadInvoicePDF = async (invoiceData, invoiceNumber, onProgress = () => {}) => {
  try {
    console.log("🚀 Starting smart PDF download for:", invoiceNumber);

    if (!invoiceData) throw new Error("No invoice data provided");
    if (!invoiceNumber) throw new Error("No invoice number provided");

    onProgress("Checking invoice in backend...", 5);

    const invoiceCheck = await checkInvoiceExists(invoiceNumber);

    if (invoiceCheck.exists) {
      onProgress("Downloading existing PDF...", 40);
      return await downloadExistingInvoicePDF(invoiceNumber);
    } else {
      onProgress("Invoice not found. Generating new one...", 20);
      return await generateAndDownloadPDFWithProgress(invoiceData, invoiceNumber, onProgress);
    }
  } catch (error) {
    console.error("❌ Smart PDF download failed:", error);
    onProgress(`Error: ${error.message}`, 0);
    throw error;
  }
};
