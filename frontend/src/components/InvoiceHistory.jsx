import { useEffect, useState } from "react";

export default function InvoiceHistory({ onViewInvoice }) {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fy = getCurrentFY();
    const history = JSON.parse(localStorage.getItem(`invoiceHistory_${fy}`)) || [];
    setInvoices(history);
  }, []);

  const getCurrentFY = () => {
    const d = new Date();
    return d.getMonth() + 1 < 4
      ? `${d.getFullYear() - 1}-${String(d.getFullYear()).slice(2)}`
      : `${d.getFullYear()}-${String(d.getFullYear() + 1).slice(2)}`;
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (invNo) => {
    if (!window.confirm("Delete this invoice?")) return;
    const updated = invoices.filter((inv) => inv.invoiceNumber !== invNo);
    setInvoices(updated);
    localStorage.setItem(`invoiceHistory_${getCurrentFY()}`, JSON.stringify(updated));
  };

  return (
    <div className="invoice-history">
      <h5>Past Invoices</h5>
      <input
        type="text"
        placeholder="Search by Invoice # or Customer"
        className="form-control mb-2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="table table-sm table-striped">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((inv) => (
            <tr key={inv.invoiceNumber}>
              <td>{inv.invoiceNumber}</td>
              <td>{inv.invoiceDate}</td>
              <td>{inv.customer.name}</td>
              <td>{inv.totals?.total || "-"}</td>
              <td>
                <button
                  className="btn btn-sm btn-info me-1"
                  onClick={() => onViewInvoice(inv)}
                >
                  View
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(inv.invoiceNumber)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {filteredInvoices.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center">
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
