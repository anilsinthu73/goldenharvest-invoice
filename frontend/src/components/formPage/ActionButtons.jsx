export default function ActionButtons({
  onSave,
  onNewInvoice,
  onPreviewInvoice,
  onCancel
}) {
  const buttonStyle = {
    minWidth: "140px",
    padding: "10px 20px",
    fontSize: "14px",
    borderRadius: "6px",
    cursor: "pointer"
  };


  const containerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "20px",
    marginBottom: "20px"
  };


  return (
    <div style={containerStyle}>
      {/* <AmountInWords totalAmount={amountInWords} /> */}

      <button
        style={{ ...buttonStyle, backgroundColor: "#28a745", color: "#fff", border: "none" }}
        onClick={onSave}    >
        Save Invoice
      </button>

      <button
        style={{ ...buttonStyle, backgroundColor: "#007bff", color: "#fff", border: "none" }}
        onClick={onNewInvoice}
      >
        + New Invoice
      </button>

      <button
        style={{ ...buttonStyle, backgroundColor: "#007bff", color: "#fff", border: "none" }}
        onClick={onPreviewInvoice}
      >
        Preview Invoice
      </button>

      <button
        style={{ ...buttonStyle, backgroundColor: "#ffc107", color: "#212529", border: "none" }}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
