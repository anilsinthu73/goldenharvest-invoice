export default function CustomerSection({
  invoiceMeta,
  updateInvoiceMeta,
  onNewInvoice,
}) {
  const containerStyle = {
    borderTop: "8px solid #333",
    display: "flex",
    flexWrap: "wrap",
    borderRadius: "8px",
    padding: "15px",
    gap: "12px",
    width: "100%",
    fontSize: "14px",
    backgroundColor: "transparent",
    borderBottom: "8px solid #333",
  };

  const columnStyle = {
    flex: "1 1 300px",
    padding: "10px",
    borderRadius: "8px",
  };
  const fieldStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
    gap: "6px",
  };
  const labelStyle = { width: "120px", fontWeight: "bold" };
  const inputStyle = {
    flex: 1,
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    border: "none",
    outline: "none",
    padding: "2px 4px",
    backgroundColor: "transparent",
  };
  const textareaStyle = { ...inputStyle, resize: "none", height: "50px" };
  const buttonStyle = {
    marginTop: "10px",
    padding: "8px 12px",
    background:
      "linear-gradient(90deg, rgba(0,250,123,1) 0%, rgba(0,204,255,1) 100%)",
    border: "none",
    color: "#fff",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "background 0.3s ease",
  };

  // Handle field updates using updateInvoiceMeta function
  const handleFieldChange = (field, value) => {
    if (typeof updateInvoiceMeta === "function") {
      updateInvoiceMeta(field, value);
    } else {
      console.error("updateInvoiceMeta is not a function:", updateInvoiceMeta);
    }
  };

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
    "Other",
  ];

  return (
    <div style={containerStyle}>
      {/* BILL TO Section */}
      <div style={columnStyle}>
        <h4>BILL TO:</h4>
        <div style={fieldStyle}>
          <label style={labelStyle}>Customer Name:</label>
          <input
            style={{
              ...inputStyle,
              textTransform: "uppercase",
              fontWeight: "bold",
              letterSpacing: "1px",
              fontSize: "14px",
              color: "blue",
            }}
            placeholder="Customer Name"
            value={invoiceMeta.billToName}
            onChange={(e) => handleFieldChange("billToName", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Phone:</label>
          <span style={{ fontWeight: "bold" }}>+91</span>
          <input
            style={inputStyle}
            type="text"
            inputMode="numeric"
            placeholder="Phone Number"
            value={
              invoiceMeta.billToPhone
                ? invoiceMeta.billToPhone
                    .replace(/(\d{5})(\d{0,5})/, "$1 $2")
                    .trim()
                : ""
            }
            maxLength={11} // 10 digits + 1 space
            onChange={(e) => {
              let digits = e.target.value.replace(/\D/g, "");
              if (digits.length > 10) digits = digits.slice(0, 10);
              handleFieldChange("billToPhone", digits);
            }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Address:</label>
          <textarea
            style={textareaStyle}
            placeholder="Address"
            value={invoiceMeta.billToAddress}
            onChange={(e) => handleFieldChange("billToAddress", e.target.value)}
          />
        </div>
      </div>

      {/* INVOICE DETAILS Section */}
      <div style={columnStyle}>
        <h4>INVOICE DETAILS:</h4>
        <div style={fieldStyle}>
          <label style={labelStyle}>Invoice No:</label>
          <input
            style={{
              ...inputStyle,
              color: "red",
              fontWeight: "bold",
              fontSize: "16px",
            }}
            value={invoiceMeta.invoiceNo}
            readOnly
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Invoice Date:</label>
          <input
            type="date"
            style={inputStyle}
            value={invoiceMeta.invoiceDate}
            onChange={(e) => handleFieldChange("invoiceDate", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>State:</label>
          <select
            style={inputStyle}
            value={invoiceMeta.state}
            onChange={(e) => handleFieldChange("billToState", e.target.value)}
          >
            <option value="">Select State</option>
            {indianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <button style={buttonStyle} onClick={onNewInvoice}>
          + New Invoice
        </button>
      </div>
    </div>
  );
}
