export default function InvoiceFooter() {
  const footerNoteContainerStyle = {
    width: "100%",
    padding: "10px 0",
    marginTop: "20px",
    textAlign: "center",
    fontWeight: "bold",
    backgroudColor:"rgba(25,65,98,0.8)",
    fontSize: "36px",
    color: "rgba(8, 0, 99, 1)",
    borderRadius: "4px",
  };

  return (
      <div style={footerNoteContainerStyle}>
        Thank You for Your Business! Visit Again
      </div>
  );
}
