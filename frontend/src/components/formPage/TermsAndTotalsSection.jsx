import { fmt } from "../../utils/InvoiceUtils";

export default function TermsAndTotalsSection({
  subtotalTotal,
  isAP,
  cgst,
  sgst,
  igst,
  shippingCharges,
  onShippingChargesChange,
  total,
}) {
  const containerStyle = {
    backgroundColor: "transparent",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: "20px",
    gap: "20px",
    flexWrap: "wrap",
    padding: "10px",
    borderRadius: "8px",
  };

  const termsStyle = {
    flex: "0 0 50%",
    minWidth: "250px",
  };

  const totalsStyle = {
    backgroundColor: "transparent",
    flex: "0 0 250px",
    borderRadius: "8px",

  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
  };

  const totalRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
    marginTop: "8px",
  };

  const inputStyle = {
    flex: 1,
    textAlign: "right",
    justifyContent: "flex-end",
    display: "inline-block",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    border: "none",
    outline: "none",
    padding: "2px 4px",
    backgroundColor: "transparent",
  };

  return (
    <div style={containerStyle}>
      {/* Terms & Conditions */}
      <div style={termsStyle}>
        <h4>Terms & Conditions:</h4>
        <ol className="small" style={{ paddingLeft: "20px" }}>
          <li>Goods once sold cannot be returned.</li>
          <li>
            Shipping Charges applicable to customers outside Andhra Pradesh.
          </li>
          <li>Shipping Charges for first order is free.</li>
        </ol>
        {/* <br></br>
        <hr></hr>
        <p  style={{ color: "#555", fontSize: "12px", marginTop: "12px", maxWidth: "300px", fontWeight: "light" , fontFamily:" serif, cursive, sans-serif,hevelvetica" }} className="fst-italic, text-center, align-middle">
          This is a computer-generated invoice and does not require a physical
          signature.
        </p> */}

        <div>
          <div style={{textAlign : 'left', fontSize:' 14px ',fontWeight: 'bolder', marginTop: "20px", maxWidth: "200px", textTransform: 'uppercase', textDecoration: 'underline'}}>
            Bank Details
          </div>
          <div className="table">
            <table style={{margin:'2px solid #1b1b1b' }}>
            <tr>
              <td>A/c Holder Name :</td>
              <td>Bandari JayaTeja</td>
            </tr>
            <tr>
              <td>Account No:</td>
              <td>33485836546</td>
            </tr>
            <tr>
              <td>IFSC CODE:</td>
              <td>SBIN0002719</td>
            </tr>
            <tr>
              <td>PhonePay / G Pay / Paytm</td>
              <td>7285909898</td>
            </tr>
            </table>
        
          </div>
        </div>
      
      </div>

      {/* Totals & Taxes */}
      <div style={{...totalsStyle,  marginRight:"150px"}}>
        <div style={rowStyle}>
          <span>Sub Total:</span>
          <span>{fmt.currency(subtotalTotal)}</span>
        </div>

        {isAP ? (
          <>
            <div style={rowStyle}>
              <span>CGST @2.5%:</span>
              <span>{fmt.currency(cgst)}</span>
            </div>
            <div style={rowStyle}>
              <span>SGST @2.5%:</span>
              <span>{fmt.currency(sgst)}</span>
            </div>
          </>
        ) : (
          <div style={rowStyle}>
            <span>IGST @5%:</span>
            <span>{fmt.currency(igst)}</span>
          </div>
        )}

        <div style={rowStyle}>
          <span>Shipping Charges:</span>
          <input
            type="number"
            placeholder="0"
            style={inputStyle}
            value={shippingCharges|| ""}
            onChange={(e) =>
              onShippingChargesChange(Number(e.target.value || 0))
            }
            min={150}
            step={50}
            max={500}
          />
        </div>

        <div style={totalRowStyle}>
          <span>Total:</span>
          <span>{fmt.currency(total)}</span>
        </div>
      </div>
    </div>
  );
}
