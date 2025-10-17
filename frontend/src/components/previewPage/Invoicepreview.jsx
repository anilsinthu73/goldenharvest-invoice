import { useEffect, useState } from "react";
import { FaEnvelope, FaIdBadge, FaIdCard, FaMapMarker, FaMobileAlt } from "react-icons/fa";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import logo from "../../assets/logo.png";
import {
  calculateInvoiceValues,
  convertToWords,
  downloadInvoicePDF,
  fetchInvoiceData,
  getCustomerData,
  getErrorConfig,
  getErrorMessage,
  getLoadingMessage,
} from "../../services/invoicePreviewServices";


export default function InvoicePreview() {
  const { invoiceNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [pdfProgress, setPdfProgress] = useState(0);

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!invoiceNumber) {
          setError("No invoice number provided");
          setLoading(false);
          return;
        }

        const result = await fetchInvoiceData(
          invoiceNumber,
          searchParams,
          location
        );
        setInvoice(result.data);
      } catch (err) {
        console.error("❌ Error loading invoice:", err);
        const source = searchParams.get("source");
        setError(getErrorMessage(err, source));
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceData();
  }, [invoiceNumber, location.state, searchParams]);

  // Enhanced debug effect
  useEffect(() => {
    const source = searchParams.get("source");
    console.log("🔍 InvoicePreview State Update:", {
      loading,
      error: error ? error.substring(0, 100) + "..." : null,
      invoice: invoice
        ? {
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.customerName || invoice.customer?.name,
            itemsCount: invoice.items?.length,
            total: invoice.total,
          }
        : null,
      source,
      urlDataPresent: !!searchParams.get("data"),
      navigationState: !!location.state?.invoice,
    });

    // Special handling for PDF source
    if (source === "pdf" && invoice) {
      console.log("✅ PDF Data Ready for Generation:", {
        invoiceNumber: invoice.invoiceNumber,
        itemsRendered: invoice.items?.length,
        total: invoice.total,
        timestamp: new Date().toISOString(),
      });
    }
  }, [loading, error, invoice, searchParams, location.state]);

  // Calculate values
  const { subTotal, cgst, sgst, igst, shipping, total } =
    calculateInvoiceValues(invoice);
  const customer = getCustomerData(invoice);
  const amountInWords = invoice?.amountInWords || convertToWords(total);
  const invoiceDate = invoice?.date || invoice?.invoiceDate;

  const handleGoBack = () => {
    try {
      if (invoice) {
        // Save current invoice preview state to sessionStorage
        sessionStorage.setItem(
          "invoiceFormBackup",
          JSON.stringify({
            invoiceMeta: invoice.invoiceMeta || {
              invoiceNo: invoice.invoiceNumber,
              billToName: invoice.customer?.name,
              billToPhone: invoice.customer?.phone,
              billToAddress: invoice.customer?.address,
              billToState: invoice.customer?.state,
            },
            items: invoice.items || [],
            shipping: invoice.shipping || 0,
          })
        );
      }
      navigate(-1);
    } catch (err) {
      console.error(
        "❌ Failed to save invoice state for back navigation:",
        err
      );
      navigate(-1);
    }
  };

const handlePrint = async () => {
  try {
    const header = document.querySelector(".letterhead-header") || document.querySelector(".invoice-header");
    if (header) header.style.display = "none";
    await new Promise((resolve) => setTimeout(resolve, 200));
    window.print();
    setTimeout(() => {
      if (header) header.style.display = "flex";
    }, 500);
  } catch (err) {
    console.error("❌ Print operation failed:", err);
    alert("Printing failed. Please try again.");
  }
};


  const handleDownloadPDF = async () => {
    try {
      if (!invoice) {
        alert("No invoice data available to generate PDF");
        return;
      }
      if (!invoiceNumber) {
        alert("Invoice number is missing");
        return;
      }
      console.log("🔄 Starting smart PDF download...");
      setPdfLoading(true);
      setPdfStatus("Checking invoice in database...");
      setPdfProgress(0);

      const onProgress = (message, progress) => {
        setPdfStatus(message);
        setPdfProgress(progress);
      };
      const result = await downloadInvoicePDF(invoice, invoiceNumber, onProgress);




// Usage
// await downloadInvoicePDF(invoiceData, invoiceNumber, handleProgress);

      console.log("✅ PDF download completed successfully:", result);
      setPdfStatus("✅ Download completed!");
      setPdfProgress(100);
      setTimeout(() => {
        setPdfStatus("");
        setPdfProgress(0);
      }, 3000);
    } catch (error) {
      console.error("❌ PDF download failed:", error);
      setPdfStatus("❌ Download failed");
      setPdfProgress(0);

      // Enhanced error handling
      let userMessage = "PDF Download Failed ... Retry";

      if (
        error.message.includes("Network Error") ||
        error.message.includes("Failed to fetch")
      ) {
        userMessage += "• Cannot connect to server\n";
        userMessage += "• Check internet connection\n";
        userMessage += "• Ensure backend server is running\n";
      } else if (
        error.message.includes("empty") ||
        error.message.includes("incomplete")
      ) {
        userMessage += "• Try again in a moment\n";
      } else if (error.message.includes("not a valid PDF")) {
        userMessage += "• Generated file is corrupted\n";
      } else {
        userMessage += error.message;
      }

      alert(userMessage);
      setTimeout(() => {
        setPdfStatus("");
      }, 4000);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEditInvoice = () => {
    navigate("/", { state: { editInvoice: invoice } });
  };

  if (loading) {
    const source = searchParams.get("source");
    const { title, message, note } = getLoadingMessage(source);

    return (
      <div
        id="invoice-container"
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        {note && (
          <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
            {note}
          </div>
        )}
        <div style={{ marginTop: "20px" }}>
          <small>
            Source: {source || "unknown"} | Invoice: {invoiceNumber}
          </small>
        </div>
      </div>
    );
  }

  if (error) {
    const source = searchParams.get("source");
    const { title, buttons } = getErrorConfig(source);

    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#e74c3c",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>{title}</h2>
        <p>{error}</p>
        <div style={{ marginTop: "20px" }}>
          {buttons.map((button, index) => (
            <button
              key={index}
              onClick={() => {
                if (button.action === "navigate") {
                  navigate(button.path);
                } else if (button.action === "reload") {
                  window.location.reload();
                } else if (button.action === "goBack") {
                  navigate(-1);
                }
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: button.color,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                margin: "5px",
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#7f8c8d" }}>
          <details>
            <summary>Debug Info</summary>
            <div style={{ textAlign: "left", marginTop: "10px" }}>
              <p>Source: {source}</p>
              <p>Invoice: {invoiceNumber}</p>
              <p>
                URL Data: {searchParams.get("data") ? "Present" : "Missing"}
              </p>
              <p>
                Navigation State:{" "}
                {location.state?.invoice ? "Present" : "Missing"}
              </p>
            </div>
          </details>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>No Invoice Data</h2>
        <p>
          Could not load invoice data for: <strong>{invoiceNumber}</strong>
        </p>
        <button
          onClick={() => navigate()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Create New Invoice
        </button>
      </div>
    );
  }

  return (
    <div
      id="invoice-container"
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "210mm",
        margin: "0 auto",
        backgroundColor: "white",
        color: "#333",
        lineHeight: "1.4",
      }}
    >

      {/* Header Section*/}
      <div>
        <h2
          style={{
            textAlign: 'center',
            fontWeight: 'bolder',
            letterSpacing: '1px',
            fontSize: '2rem',
            fontFamily: 'Times New Roman',
            color:'blueviolet',
            paddingTop:'0px',
            paddingBottom:'0px',
            textDecoration: 'underline',
          }}
        >
          Tax Invoice
        </h2>
  
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              marginBottom: 7,
              display: 'flex',
              alignItems: 'center', 
            }}
          >
            <img
              src={logo}
              alt="Company Logo"
              style={{
                height: 120,
                width: 120,
                objectFit: 'contain',
              }}
            />
          </div>
          <div
            style={{
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h3
              style={{
                fontWeight: 'bolder',
                color: 'rgb(32, 98, 3)',
                fontSize: '1.5rem',
                letterSpacing: '1px',
                fontFamily: 'Algerian, sans-serif',
              }}
            >
              GOLDEN HARVEST
            </h3>
            <div
              style={{
                lineHeight: 1.7,
                color: 'black',
                fontSize: 'small',
                fontFamily: 'Arial, sans-serif',
                textAlign: 'right',
              }}
            >
              <div>
                <FaIdCard style={{ marginRight: 6, fontStyle: 'italic' }} />
                {"GSTIN: 37CTWPJ4314B1ZN"}
              </div>
              <div>
                <FaIdBadge style={{ marginRight: 6, fontStyle: 'italic' }} />
                {"FSSAI: 10125001000050"}
              </div>
              <div>
                <FaMobileAlt style={{ marginRight: 6 }} />
                {"+91  9949589098"}
              </div>
              <div>
                <FaEnvelope style={{ marginRight: 6 , textDecoration: 'none'}} />
                <a href="mailto:goldenharvest0648@gmail.com" style={{textDecoration: 'none', color:'black' }}>
                  goldenharvest0648@gmail.com
                </a>
              </div>
              <div>
                <FaMapMarker style={{ marginRight: 6 }} />
                {"SH-31, Chinna Thulugu, Gara, Srikakulam,"}
              </div>
              <div style={{ marginLeft: 20 }}>{"Andhra Pradesh - 532405"}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}
      >
      <div
        style={{
          borderTop: "8px solid #333",
          borderRadius: "8px",
          padding: "15px",
          gap: "6px",
          width: "100%",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          backgroundColor: "transparent",
        }}
      >
        {" "}
      </div>
      </div>
      
      {/* Customer and Invoice Details */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
        }}
      >
        {/* Bill To Section */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "bolder",
              color: "#2c3e50",
              textDecoration: "underline",
              marginBottom: "10px",
            }}
          >
            BILL TO:
          </h3>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "120px",
                }}
              >
                Customer Name:
              </strong>
              <div
                style={{
                  color: "blue",
                  textTransform: "capitalize",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  fontSize: "16px",
                  paddingLeft: '10px',
                }}
              >
                {customer.name}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "100px",
                }}
              >
                Phone Number:
              </strong>
              <div>
                <span style={{ fontWeight: "bold" , fontSize: "16px",
                  paddingLeft: '10px'}}>+91 </span>
                {customer.phone || "XXXXXXXXXXXX"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "100px",
                }}
              >
                Address:
              </strong>
              <div style={{paddingLeft: '10px', marginLeft: '3px'}}>{customer.address}</div>
            </div>
          </div>
        </div>

        {/* Invoice Details Section */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "bolder",
              textDecoration: "underline",
              color: "#2c3e50",
              marginBottom: "10px",
            }}
          >
            INVOICE DETAILS:
          </h3>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "120px",
                }}
              >
                Invoice No:
              </strong>
              <div
                style={{
                  color: "darkred",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {invoiceNumber}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "120px",
                }}
              >
                Invoice Date:
              </strong>
              <div>
                {invoiceDate
                  ? new Date(invoiceDate).toLocaleDateString("en-IN")
                  : "NA"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <strong
                style={{
                  color: "#1a3c0d",
                  minWidth: "120px",
                }}
              >
                State:
              </strong>
              <div>{customer.state}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
          fontSize: "12px",
          fontWeight: 400,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "#2c3e50",
              fontSize: "16px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                border: "1px solid #333",
                width: "5%",
              }}
            >
              S.No
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                border: "1px solid #333",
                width: "35%",
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                border: "1px solid #333",
                width: "10%",
              }}
            >
              Qty.
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                border: "1px solid #333",
                width: "15%",
              }}
            >
              Rate (₹)
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                border: "1px solid #333",
                width: "15%",
              }}
            >
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, index) => (
            <tr
              key={index}
              style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9" }}
            >
              <td
                style={{
                  padding: "10px 8px",
                  border: "1px solid #333",
                  verticalAlign: "top",
                }}
              >
                {index + 1}
              </td>
              <td
                style={{
                  padding: "10px 8px",
                  border: "1px solid #333",
                  verticalAlign: "top",
                }}
              >
                <div style={{ fontWeight: "500" }}>{item.name}</div>
              </td>
              <td
                style={{
                  padding: "10px 8px",
                  border: "1px solid #333",
                  verticalAlign: "top",
                }}
              >
                {item.qty || 0}
              </td>
              <td
                style={{
                  padding: "10px 8px",
                  border: "1px solid #333",
                  verticalAlign: "top",
                }}
              >
                {(item.rate || 0).toFixed(2)}
              </td>
              <td
                style={{
                  padding: "10px 8px",
                  border: "1px solid #333",
                  verticalAlign: "top",
                }}
              >
                {((item.qty || 0) * (item.rate || 0)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Terms & Conditions and Summary Side by Side */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "25px",
        }}
      >
        {/* Terms & Conditions */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#2c3e50",
              marginBottom: "10px",
            }}
          >
            Terms & Conditions:
          </h3>
          <ol
            style={{
              fontSize: "12px",
              paddingLeft: "20px",
              color: "#333",
              fontWeight: 50,
            }}
          >
            <li style={{ marginBottom: "5px" }}>
              Goods once sold cannot be returned.
            </li>
            <li style={{ marginBottom: "5px" }}>
              Shipping Charges applicable to customers outside Andhra Pradesh.
            </li>
            <li style={{ marginBottom: "5px" }}>
              Shipping Charges for first order is free.
            </li>
          </ol>

          <div
  style={{
    flex: 1,
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "bolder",
    marginTop: "20px",
    maxWidth: "250px",
    textTransform: "uppercase",
    textDecoration: "underline",
    color: "#000",
  }}
>
  Bank Details
</div>

<table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "6px",
    fontSize: "11px",
    color: "#1b1b1b",
    tableLayout: "fixed",
    wordWrap: "break-word",
  }}
>
  <tbody>
    <tr>
      <td
        style={{
          padding: "6px",
          width: "45%",
          fontWeight: "500",
        }}
      >
        A/c Holder Name :
      </td>
      <td style={{ padding: "6px" }}>
        Bandari JayaTeja
      </td>
    </tr>
    <tr>
      <td
        style={{
       
          padding: "6px",
          fontWeight: "500",
        }}
      >
        Account No:
      </td>
      <td style={{ padding: "6px" }}>
        33485836546
      </td>
    </tr>
    <tr>
      <td
        style={{
          padding: "6px",
          fontWeight: "500",
        }}
      >
        IFSC CODE:
      </td>
      <td style={{padding: "6px" }}>
        SBIN0002719
      </td>
    </tr>
    <tr>
      <td
        style={{
          padding: "6px",
          fontWeight: "500",
        }}
      >
        PhonePe / GPay / Paytm:
      </td>
      <td style={{ padding: "6px" }}>
        7285909898
      </td>
    </tr>
  </tbody>
</table>

        </div>

        {/* Summary Section */}
        <div style={{ flex: 1, textAlign: "right", fontSize: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingBottom: "5px",
              borderBottom: "1px dashed #ddd",
            }}
          >
            <span>Sub Total:</span>
            <span>₹{subTotal.toFixed(2)}</span>
          </div>
          {cgst > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                paddingBottom: "5px",
                borderBottom: "1px dashed #ddd",
              }}
            >
              <span>CGST @2.5%:</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                paddingBottom: "5px",
                borderBottom: "1px dashed #ddd",
              }}
            >
              <span>SGST @2.5%:</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>
          )}
          {igst > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                paddingBottom: "5px",
                borderBottom: "1px dashed #ddd",
              }}
            >
              <span>IGST @5%:</span>
              <span>₹{igst.toFixed(2)}</span>
            </div>
          )}
          {shipping > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                paddingBottom: "5px",
                borderBottom: "1px dashed #ddd",
              }}
            >
              <span>Shipping Charges:</span>
              <span>₹{shipping.toFixed(2)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingTop: "8px",
              borderTop: "2px solid #ddd",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {/* Amount in Words */}
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "4px",
            fontSize: "12px",
            fontStyle: "italic",
            flex: 2,
          }}
        >
          <strong>AMOUNT IN WORDS</strong>
          <br />
          {amountInWords}
        </div>

        {/* Signature Section */}

        <div style={{ textAlign: "right", flex: 1 }}>
          <div
            style={{
              marginBotton: "10px",
              fontSize: "11px",
              textAlign: "left",
            }}
          >
            For GoldenHarvest
          </div>
          <div
            style={{
              display: "inline-block",
              width: "200px",
              borderTop: "1px solid #333",
              marginTop: "50px",
              marginBottom: "5px",
            }}
          ></div>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>
            AUTHORISED SIGNATORY
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          marginTop: "30px",
          color: "steelblue",
          fontSize: "25px",
          paddingTop: "20px",
          borderTop: "1px solid rgb(3, 3, 40)",
          backgroundColor: "beige",
          fontWeight: 900,
        }}
      >
        Thank You for Your Business! Visit Again
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "30px",
          gap: "15px",
          flexWrap: "wrap",
        }}
        className="no-print"
      >
        <button
          onClick={handlePrint}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          🖨️ Print Invoice
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          style={{
            padding: "12px 24px",
            backgroundColor: pdfLoading ? "#95a5a6" : "#2ecc71",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: pdfLoading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            minWidth: "200px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {pdfLoading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.3)",
                width: `${pdfProgress}%`,
                transition: "width 0.3s ease",
              }}
            />
          )}

          <span style={{ position: "relative", zIndex: 1 }}>
            {pdfLoading ? (
              <>
                {pdfStatus.includes("Checking") && "🔍 Checking..."}
                {pdfStatus.includes("Generating") && "🖨️ Generating..."}
                {pdfStatus.includes("Downloading") && `📥 ${pdfProgress}%`}
                {pdfStatus.includes("Validating") && "🔍 Validating..."}
                {pdfStatus.includes("Finalizing") && "⚡ Finalizing..."}
                {!pdfStatus && "⏳ Processing..."}
              </>
            ) : (
              "📄 Download PDF"
            )}
          </span>
        </button>

        {pdfStatus && (
          <div
            style={{
              fontSize: "12px",
              color: pdfStatus.includes("✅")
                ? "#27ae60"
                : pdfStatus.includes("❌")
                ? "#e74c3c"
                : "#3498db",
              fontWeight: "bold",
              textAlign: "center",
              minHeight: "20px",
            }}
          >
            {pdfStatus}
            {pdfProgress > 0 && pdfProgress < 100 && ` (${pdfProgress}%)`}
          </div>
        )}
        <button
          onClick={handleEditInvoice}
          style={{
            padding: "12px 24px",
            backgroundColor: "#f39c12",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          ✏️ Edit Invoice
        </button>
        <button
          onClick={handleGoBack}
          style={{
            padding: "12px 24px",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          ↩️ Go Back
        </button>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-container, #invoice-container * {
              visibility: visible;
            }
            #invoice-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              box-shadow: none;
            }
            .no-print {
              display: none !important;
            }
            button {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}
