// frontend/src/hooks/useInvoice.js
import axios from "axios";
import { useEffect, useState } from "react";
import { fmt } from "../utils/InvoiceUtils";

export function useInvoice() {
  const [invoiceMeta, setInvoiceMeta] = useState({
    invoiceNo: "",
    invoiceDate: fmt.date(new Date()),
    billToName: "",
    billToPhone: "",
    billToAddress: "",
    billToState: "Andhra Pradesh",
  });

  const [items, setItems] = useState([{ name: "", qty: "", rate: "" }]);
  const [shipping, setShipping] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // API base URL
  const API_BASE = "http://localhost:5000/api";

  /** ─────────────────────────────
   *  Fetch & initialize invoice number from backend
   *  ───────────────────────────── */
  useEffect(() => {
  const initializeInvoice = async () => {
    setIsLoading(true);
    try {
      // Generate new invoice number without trying to fetch it first
      const newInvoiceNo = await generateNewInvoiceNumber();
      setInvoiceMeta((prev) => ({ 
        ...prev, 
        invoiceNo: newInvoiceNo,
        invoiceDate: new Date().toISOString().split('T')[0]
      }));
      console.log("✅ Auto-generated invoice number:", newInvoiceNo);
    } catch (error) {
      console.error("Failed to generate invoice number:", error);
      // Fallback without trying to fetch
      const today = new Date();
      const yy = String(today.getFullYear()).slice(2);
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const fallbackNumber = `GH${yy}${mm}${dd}01`;
      setInvoiceMeta((prev) => ({ ...prev, invoiceNo: fallbackNumber }));
    } finally {
      setIsLoading(false);
    }
  };

  initializeInvoice();
}, []);

  /** ─────────────────────────────
   *  Load saved invoice from session
   *  ───────────────────────────── */
  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("currentInvoice"));
    if (saved) {
      setInvoiceMeta(saved.meta || invoiceMeta);
      setItems(saved.items || [{ name: "", qty: "", rate: "" }]);
      setShipping(saved.shipping || 0);
    }
  }, []);

  /** ─────────────────────────────
   *  Persist invoice to sessionStorage
   *  ───────────────────────────── */
  useEffect(() => {
    const invoiceData = {
      meta: invoiceMeta,
      items,
      shipping,
      saved: isSaved,
    };
    sessionStorage.setItem("currentInvoice", JSON.stringify(invoiceData));
  }, [invoiceMeta, items, shipping, isSaved]);

  /** ─────────────────────────────
   *  Generate next invoice number from backend API
   *  ───────────────────────────── */
const generateNewInvoiceNumber = async () => {
  try {
    console.log("🔄 Generating new invoice number with unlimited daily capacity...");
    
    const allInvoicesResponse = await axios.get(`${API_BASE}/invoices`);
    
    if (allInvoicesResponse.data.success) {
      const allInvoices = allInvoicesResponse.data.invoices || [];
      console.log("📊 Total invoices from backend:", allInvoices.length);
      
      // Step 2: Extract invoice numbers from different possible structures
      const allInvoiceNumbers = allInvoices
        .map(invoice => {
          return invoice["Invoice No"] || 
                 invoice["Invoice No."] || 
                 invoice["Invoice Number"] || 
                 invoice["INVOICE_NO"] ||
                 invoice.invoiceNumber ||
                 invoice.invoiceNo ||
                 "";
        })
        .filter(invoiceNo => invoiceNo && typeof invoiceNo === 'string')
        .filter(invoiceNo => /^GH\d{10}$/.test(invoiceNo)); // GH + 10 digits

      console.log("📋 Valid invoice numbers found:", allInvoiceNumbers.length);

      // Step 3: Generate today's prefix (GH + YYMMDD = 8 characters)
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayPrefix = `GH${yy}${mm}${dd}`; // GH251012
      
      console.log("📅 Today's prefix:", todayPrefix);
      let nextNumber = 1; // Start from 0001
      
      if (allInvoiceNumbers.length > 0) {
        const todaysInvoices = allInvoiceNumbers.filter(invoiceNo => 
          invoiceNo.startsWith(todayPrefix)
        );

        console.log("📊 Today's invoices found:", todaysInvoices.length);

        if (todaysInvoices.length > 0) {
          // Extract sequence numbers (last 4 digits) and find the maximum
          const sequenceNumbers = todaysInvoices
            .map(invoiceNo => {
              const sequence = invoiceNo.slice(-4); // Last 4 digits for 0001-9999
              return parseInt(sequence, 10);
            })
            .filter(num => !isNaN(num) && num > 0);

          console.log("🔢 Sequence numbers found:", sequenceNumbers.length);

          if (sequenceNumbers.length > 0) {
            const maxSequence = Math.max(...sequenceNumbers);
            nextNumber = maxSequence + 1;
            console.log("📈 Max sequence today:", maxSequence, "Next:", nextNumber);
          }
        }
      }

      // Step 5: Generate the new invoice number with 4-digit sequence
      const newInvoiceNo = `${todayPrefix}${String(nextNumber).padStart(4, "0")}`;
      console.log("🆕 Generated invoice number:", newInvoiceNo);

      // Step 6: Update local state immediately
      setInvoiceMeta(prev => ({ 
        ...prev, 
        invoiceNo: newInvoiceNo,
        invoiceDate: today.toISOString().split('T')[0]
      }));

      return newInvoiceNo;

    } else {
      throw new Error("Failed to fetch invoices from backend");
    }

  } catch (error) {
    console.error("❌ Invoice number generation failed:", error);
    
    // Fallback: Generate locally without backend data
    console.log("🔄 Using fallback local generation...");
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fallbackNumber = `GH${yy}${mm}${dd}0001`;
    
    console.log("🆕 Fallback invoice number:", fallbackNumber);
    
    // Update local state
    setInvoiceMeta(prev => ({ 
      ...prev, 
      invoiceNo: fallbackNumber,
      invoiceDate: today.toISOString().split('T')[0]
    }));
    
    return fallbackNumber;
  }
};

  const getLatestInvoice = async () => {
    try {
      const response = await axios.get(`${API_BASE}/invoices/latest`);
      if (response.data.success) {
        return response.data.latestInvoice;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latest invoice:", error);
      return null;
    }
  };
  

const saveInvoice = async (invoiceData) => {
  setIsLoading(true);
  try {
    console.log("💾 Saving invoice to backend:", invoiceData.invoiceNumber);
    
    const response = await axios.post(`${API_BASE}/invoices`, invoiceData);
    
    if (response.data.success) {
      console.log("✅ Invoice saved successfully:", invoiceData.invoiceNumber);
      
      setItems([{ name: "", qty: 1, rate: 0 }]);
      setShipping(0);
      setIsSaved(true);

      return response.data;
    } else {
      throw new Error(response.data.error || "Failed to save invoice");
    }
  } catch (error) {
    console.error("Error saving invoice:", error);
    
    if (error.response?.status === 409) {
      throw new Error("Invoice number already exists. Please generate a new invoice.");
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error(error.message || "Failed to save invoice");
    }
  } finally {
    setIsLoading(false);
  }
};

  const getInvoiceByNumber = async (invoiceNo) => {
    try {
      const response = await axios.get(`${API_BASE}/invoices/${invoiceNo}`);
      if (response.data.success) {
        return response.data.invoice;
      } else {
        throw new Error(response.data.error || "Invoice not found");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      throw error;
    }
  };



  /** 
   * Download invoice PDF from backend
   */
  const downloadInvoicePDF = async (invoiceNo) => {
    try {
      const response = await axios.get(`${API_BASE}/invoices/${invoiceNo}/pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log("✅ PDF downloaded successfully:", invoiceNo);
      return true;
    } catch (error) {
      console.error("Error downloading PDF:", error);
      
      try {
        const altResponse = await axios.get(`${API_BASE}/invoices/${invoiceNo}/pdf`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([altResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice-${invoiceNo}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        console.log("✅ PDF downloaded via direct method:", invoiceNo);
        return true;
      } catch (altError) {
        console.error("Error downloading PDF via direct method:", altError);
        throw new Error("Failed to download PDF");
      }
    }
  };

  /** 
   * Get all invoices from backend
   */
  const getAllInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/invoices`);
      if (response.data.success) {
        return response.data.invoices;
      } else {
        throw new Error(response.data.error || "Failed to fetch invoices");
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      throw error;
    }
  };

  /** ─────────────────────────────
   *  Helpers for calculations
   *  ───────────────────────────── */
  const calculateSubtotal = () =>
    items.reduce(
      (sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)),
      0
    );

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const isAP = invoiceMeta.billToState === "Andhra Pradesh";
    const cgst = isAP ? subtotal * 0.025 : 0;
    const sgst = isAP ? subtotal * 0.025 : 0;
    const igst = isAP ? 0 : subtotal * 0.05;
    return subtotal + cgst + sgst + igst + (Number(shipping) || 0);
  };

  /** ─────────────────────────────
   *  Utility setters
   *  ───────────────────────────── */
  const updateInvoiceMeta = (field, value) =>
    setInvoiceMeta((prev) => ({ ...prev, [field]: value }));

  const addItem = () => setItems((prev) => [...prev, { name: "", qty: "", rate: "" }]);

  const updateItem = (index, field, value) =>
    setItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const clearAllItems = () => setItems([{ name: "", qty: "", rate: "" }]);

  const handleSelectProduct = (index, productName, products) => {
    const selectedProduct = products.find((p) => p.name === productName);
    if (selectedProduct) {
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          name: selectedProduct.name,
          rate: selectedProduct.rate,
          qty: updated[index].qty || "1",
        };
        return updated;
      });
    }
  };

  const clearInvoiceData = () => {
    setItems([{ name: "", qty: "", rate: "" }]);
    setShipping(0);
    setIsSaved(false);
  };

  /** ─────────────────────────────
   *  Return everything needed by components
   *  ───────────────────────────── */
  return {
    invoiceMeta,
    items,
    shipping,
    isSaved,
    isLoading,
    
    // Setters
    setShipping,
    updateInvoiceMeta,
    addItem,
    updateItem,
    removeItem,
    clearAllItems,
    handleSelectProduct,
    clearInvoiceData,
    
    // Calculations
    calculateSubtotal,
    calculateTotal,
    
    // Backend API calls
    saveInvoice,
    generateNewInvoiceNumber,
    getInvoiceByNumber,
    downloadInvoicePDF,
    getAllInvoices,
    getLatestInvoice,
  };
}