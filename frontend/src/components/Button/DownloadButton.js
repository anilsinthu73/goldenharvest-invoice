import { useState } from "react";
import { downloadInvoicePDF } from "../services/pdfService"; // adjust your import

const DownloadPDFButton = ({ invoiceData, invoiceNumber }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatus, setPdfStatus] = useState("");

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);
      setPdfProgress(0);
      setPdfStatus("🔍 Checking invoice...");

      await downloadInvoicePDF(invoiceData, invoiceNumber, (status, percent) => {
        setPdfStatus(status);
        setPdfProgress(percent);
      });

      setPdfStatus("✅ PDF downloaded successfully!");
      setPdfProgress(100);
    } catch (error) {
      console.error("❌ PDF download failed:", error);
      setPdfStatus(`❌ ${error.message}`);
    } finally {
      setTimeout(() => setPdfLoading(false), 1000);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <button
        onClick={handleDownloadPDF}
        disabled={pdfLoading}
        style={{
          padding: "12px 24px",
          backgroundColor: pdfLoading ? "#95a5a6" : "#2ecc71",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: pdfLoading ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "bold",
          minWidth: "220px",
          position: "relative",
          overflow: "hidden",
          transition: "background-color 0.3s ease",
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
              {pdfStatus.includes("Preparing") && "⚙️ Preparing..."}
              {pdfStatus.includes("Generating") && "🖨️ Generating..."}
              {pdfStatus.includes("Downloading") && `📥 ${Math.round(pdfProgress)}%`}
              {pdfStatus.includes("Validating") && "🔍 Validating..."}
              {pdfStatus.includes("Finalizing") && "⚡ Finalizing..."}
              {pdfStatus.includes("completed") && "✅ Done!"}
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
            marginTop: "8px",
            fontSize: "12px",
            color: pdfStatus.includes("✅")
              ? "#27ae60"
              : pdfStatus.includes("❌")
              ? "#e74c3c"
              : "#3498db",
            fontWeight: "bold",
            textAlign: "center",
            minHeight: "20px",
            transition: "color 0.3s ease",
          }}
        >
          {pdfStatus}{" "}
          {pdfProgress > 0 && pdfProgress < 100 && `(${Math.round(pdfProgress)}%)`}
        </div>
      )}
    </div>
  );
};

export default DownloadPDFButton;