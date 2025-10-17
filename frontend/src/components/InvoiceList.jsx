import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInvoice } from "../hooks/useInvoice";
import '../styles/invoicelist.css';

const InvoiceList = () => {
  const { getAllInvoices, downloadInvoicePDF } = useInvoice();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch all invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await getAllInvoices();
        if (Array.isArray(data)) setInvoices(data);
        else throw new Error("Invalid invoice data");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch invoices.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

 const handleViewInvoice = (invoice) => {
  const invoiceNo = invoice["Invoice No"];

  // Save invoice summary data to sessionStorage
  sessionStorage.setItem("currentInvoice", JSON.stringify({
    invoiceMeta: {
      invoiceNo: invoiceNo,
      invoiceDate: invoice["Invoice Date"],
      billToName: invoice["Customer Name"],
      billToPhone: invoice["Customer Phone"],
      billToAddress: invoice["Customer Address"],
      billToState: invoice["State"],
    },
    items: [], // Flat JSON; no item breakdown
    shipping: invoice["Shipping"] || 0,
  }));

  // ✅ Correctly navigate using invoiceNo
  navigate(`/preview/${invoiceNo}`, { state: { fromList: true } });
};

  // Download PDF
  const handleViewPDF = async (invoiceNo) => {
    window.open()
  }

  if (loading) return <div className="loading">Loading invoices...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="invoice-list-container">
      <h2>📋 All Invoices</h2>

      {invoices.length === 0 ? (
        <p className="empty">No invoices found.</p>
      ) : (
        <div className="invoice-grid">
          {invoices.map((invoice, idx) => (
            <div key={invoice["Invoice No"] || idx} className="invoice-card">
              <div className="invoice-header">
                <h3>{invoice["Invoice No"]}</h3>
                <span className="invoice-date">{invoice["Invoice Date"]}</span>
              </div>

              <div className="invoice-body">
                <p><strong>Customer:</strong> {invoice["Customer Name"]}</p>
                <p><strong>Phone:</strong> {invoice["Customer Phone"]}</p>
                <p><strong>Subtotal:</strong> ₹{invoice["Subtotal"]}</p>
                <p><strong>Shipping:</strong> ₹{invoice["Shipping"]}</p>
                <p><strong>Total:</strong> ₹{invoice["Total"]}</p>
              </div>

              <div className="invoice-actions">
                <button
                  className="btn-view"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  👁 View
                </button>

                <button
                  className="btn-pdf"
                  onClick={() => handleGeneratePDF(invoice["Invoice No"])}
                  disabled={downloadingId === invoice["Invoice No"]}
                >
                  {downloadingId === invoice["Invoice No"] ? "⏳ Generating..." : "📄 PDF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
