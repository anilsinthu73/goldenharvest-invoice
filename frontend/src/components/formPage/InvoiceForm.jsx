import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInvoice } from "../../hooks/useInvoice";
import {
  calculateInvoiceTotals,
  encodeDataForURL,
  fetchProducts,
  prepareInvoicePayload,
  preparePreviewData,
  validateInvoiceData
} from "../../services/InvoiceService";
import ActionButtons from "./ActionButtons";
import AmountInWords from "./AmountInWords";
import CustomerSection from "./CustomerSection";
import InvoiceFooter from "./InvoiceFooter";
import InvoiceHeader from "./InvoiceHeader";
import InvoiceItemsTable from "./InvoiceItemsTable";
import TermsAndTotalsSection from "./TermsAndTotalsSection";

export default function InvoiceForm() {
  const navigate = useNavigate();

  const {
    invoiceMeta,
    items,
    shipping,
    isLoading,
    updateInvoiceMeta,
    addItem,
    updateItem,
    removeItem,
    clearAllItems,
    handleSelectProduct,
    saveInvoice: saveInvoiceToBackend,
    setShipping,
    generateNewInvoiceNumber
  } = useInvoice();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const fetchedProducts = await fetchProducts();
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("❌ Error fetching products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Restore state from sessionStorage (if navigating back)

useEffect(() => {
  let restored = false;

  // 1️⃣ Try to restore from sessionStorage backup
  const savedState = sessionStorage.getItem("invoiceFormBackup");
  if (savedState) {
    try {
      const { invoiceMeta: savedMeta, items: savedItems, shipping: savedShipping } = JSON.parse(savedState);
      updateInvoiceMeta(savedMeta);
      clearAllItems();
      savedItems.forEach(item => addItem(item));
      setShipping(savedShipping);
      sessionStorage.removeItem("invoiceFormBackup");
      restored = true;
      console.log("✅ Restored invoice form state from sessionStorage backup");
    } catch (err) {
      console.error("❌ Failed to restore from sessionStorage:", err);
    }
  }

  // 2️⃣ Try to restore from Edit Invoice navigation state
  if (!restored && history.state?.usr?.editInvoice) {
    const editInvoice = history.state.usr.editInvoice;
    updateInvoiceMeta(editInvoice.invoiceMeta || {
      invoiceNo: editInvoice.invoiceNumber,
      billToName: editInvoice.customer?.name,
      billToPhone: editInvoice.customer?.phone,
      billToAddress: editInvoice.customer?.address,
      billToState: editInvoice.customer?.state
    });
    clearAllItems();
    (editInvoice.items || []).forEach(item => addItem(item));
    setShipping(editInvoice.shipping || 0);
    restored = true;
    console.log("✏️ Restored invoice form for editing invoice:", editInvoice.invoiceNumber);
  }

  // 3️⃣ Try to restore from Preview localStorage
  if (!restored && invoiceMeta.invoiceNo) {
    const key = `previewData_${invoiceMeta.invoiceNo}`;
    const previewData = localStorage.getItem(key);
    if (previewData) {
      try {
        const parsed = JSON.parse(previewData);
        updateInvoiceMeta({
          invoiceNo: parsed.invoiceNumber,
          billToName: parsed.customerName,
          billToPhone: parsed.customerPhone,
          billToAddress: parsed.customerAddress,
          billToState: parsed.state
        });
        clearAllItems();
        (parsed.items || []).forEach(item => addItem(item));
        setShipping(parsed.shipping || 0);
        restored = true;
        console.log(`📝 Restored invoice form from localStorage key: ${key}`);
      } catch (err) {
        console.error("❌ Failed to restore from preview localStorage:", err);
      }
    }
  }

}, []);



  // Calculate totals
  const { subtotalTotal, total, cgst, sgst, igst, amountInWords } =
    calculateInvoiceTotals(items, shipping, invoiceMeta.billToState);

  const handleSaveInvoice = async () => {
    try {
      const validationErrors = validateInvoiceData(invoiceMeta, items);
      if (validationErrors.length > 0) {
        alert(validationErrors[0]);
        return;
      }

      const payload = prepareInvoicePayload(invoiceMeta, items, shipping);
      console.log("💾 Saving invoice payload:", payload);

      setSaveLoading(true);

      const result = await saveInvoiceToBackend(payload);
      console.log("✅ Invoice saved successfully:", result);

      return result;
    } catch (err) {
      console.error("❌ Error saving invoice:", err);
      throw new Error("Failed to save invoice: " + (err.response?.data?.message || err.message));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveAndPreview = async () => {
    try {
      setSaveLoading(true);
      await handleSaveInvoice();
      handlePreviewInvoice();
    } catch (error) {
      console.error("❌ Error in save and preview:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePreviewInvoice = () => {
    try {
      const validationErrors = validateInvoiceData(invoiceMeta, items);
      if (validationErrors.length > 0) {
        alert(validationErrors[0]);
        return;
      }

      const previewData = preparePreviewData(invoiceMeta, items, shipping);

      // Save to localStorage for preview persistence
      const storageKey = `previewData_${invoiceMeta.invoiceNo}`;
      localStorage.setItem(storageKey, JSON.stringify(previewData));

      const encodedData = encodeDataForURL(previewData);
      const previewUrl = `/preview/${invoiceMeta.invoiceNo}?data=${encodedData}&source=create&timestamp=${Date.now()}`;

      navigate(previewUrl, {
        state: {
          invoice: previewData,
          source: 'create',
          savedToBackend: true,
          timestamp: Date.now(),
          localStorageKey: storageKey
        }
      });
    } catch (error) {
      console.error("❌ Preview navigation failed:", error);
      alert("Preview navigation failed: " + error.message);
    }
  };

  const handleNewInvoice = async () => {
    if (isLoading) return;

    if (
      items.some((item) => item.name || item.qty || item.rate) ||
      invoiceMeta.billToName ||
      invoiceMeta.billToPhone ||
      invoiceMeta.billToAddress
    ) {
      if (window.confirm("Create new invoice? Current data will be cleared.")) {
        try {
          const newInvoiceNo = await generateNewInvoiceNumber();
          updateInvoiceMeta({ billToName: "", billToPhone: "", billToAddress: "" });
          clearAllItems();
          setShipping(0);
          console.log("🆕 Started new invoice with number:", newInvoiceNo);
        } catch (error) {
          console.error("❌ Failed to create new invoice:", error);
          alert("Error creating new invoice. Please try again.");
        }
      }
    } else {
      const newInvoiceNo = await generateNewInvoiceNumber();
      console.log("🆕 Refreshed invoice number:", newInvoiceNo);
    }
  };

  // Back button that preserves invoice data
  const handleGoBack = () => {
    try {
      const currentInvoiceState = { invoiceMeta, items, shipping };
      sessionStorage.setItem("invoiceFormBackup", JSON.stringify(currentInvoiceState));
      navigate(-1);
    } catch (err) {
      console.error("❌ Error saving invoice state for back navigation:", err);
      navigate(-1);
    }
  };

  return (
    <div className="invoice-form-container">
      <InvoiceHeader />

      <CustomerSection
        invoiceMeta={invoiceMeta}
        updateInvoiceMeta={updateInvoiceMeta}
        onNewInvoice={handleNewInvoice}
      />

      <InvoiceItemsTable
        items={items}
        onUpdateItem={updateItem}
        onSelectProduct={handleSelectProduct}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onClearAll={clearAllItems}
        products={products}
        loading={productsLoading}
      />

      <TermsAndTotalsSection
        subtotalTotal={subtotalTotal}
        isAP={invoiceMeta.billToState?.trim().toLowerCase() === "andhra pradesh"}
        cgst={cgst}
        sgst={sgst}
        igst={igst}
        shippingCharges={shipping}
        onShippingChargesChange={setShipping}
        total={total}
      />

      <AmountInWords totalAmount={total} />

      <InvoiceFooter />

      <ActionButtons
        amountInWords={amountInWords}
        onPreviewInvoice={handlePreviewInvoice}
        onSave={handleSaveAndPreview}
        onNewInvoice={handleNewInvoice}
        onCancel={handleGoBack} // <-- preserves data on back
        loading={saveLoading}
      />
    </div>
  );
}
