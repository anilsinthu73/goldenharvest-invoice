// src/App.jsx
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import InvoiceForm from "./components/formPage/InvoiceForm";
import InvoicePreview from "./components/previewPage/Invoicepreview";

export default function App() {
  return (
    <Router>
      <nav className="navbar navbar-expand bg-light p-2">
        <Link to="/" className="btn btn-outline-primary me-2">New Invoice</Link>
        <Link to="/dashboard" className="btn btn-outline-success">Dashboard</Link>
      </nav>

      <div className="container mt-3">
        <Routes>
          <Route path="/" element={<InvoiceForm />} />
          <Route path="/preview" element={<InvoicePreview />} />
          <Route path="/preview/:invoiceNumber" element={<InvoicePreview />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
