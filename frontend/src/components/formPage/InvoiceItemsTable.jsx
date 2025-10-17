// src/components/InvoiceItemsTable.jsx
import { useEffect, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { fmt } from "../../utils/InvoiceUtils";

export default function InvoiceItemsTable({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setError(null);
        const res = await fetch("http://localhost:5000/api/products");
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("🔎 API Response:", data);

        let fetchedProducts = [];
        if (Array.isArray(data.rates)) {
          fetchedProducts = data.rates.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            rate: Number(p.rate),
          }));
        } else if (Array.isArray(data)) {
          fetchedProducts = data.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            rate: Number(p.rate),
          }));
        } else {
          console.error("⚠️ Unexpected API structure", data);
          setError("Unexpected data format from server");
        }

        console.log("✅ Normalized Products:", fetchedProducts);
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("❌ Error fetching products:", err);
        setError(`Failed to load products: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSelectProduct = (index, productName) => {
    console.log("🔄 Selecting product:", productName);
    
    const selectedProduct = products.find(p => p.name === productName);
    
    if (selectedProduct) {
      console.log("✅ Found product:", selectedProduct);
      // Update name and rate
      onUpdateItem(index, "name", selectedProduct.name);
      onUpdateItem(index, "rate", selectedProduct.rate);
      // Set quantity to 1 if empty
      if (!items[index]?.qty) {
        onUpdateItem(index, "qty", 1);
      }
    } else {
      console.log("❌ No product found, clearing fields");
      onUpdateItem(index, "name", "");
      onUpdateItem(index, "rate", "");
      onUpdateItem(index, "qty", "");
    }
  };

  const handleQtyChange = (index, value) => {
    onUpdateItem(index, "qty", value === "" ? "" : Number(value));
  };

  const handleRateChange = (index, value) => {
    onUpdateItem(index, "rate", value === "" ? "" : Number(value));
  };

  


  return (
    <div className="items-table-section">
      {error && (
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <div>
            <strong>Warning:</strong> {error}
          </div>
        </div>
      )}

      <table className="table table-bordered invoice-items-table text-end">
        <thead className="table-light text-center">
          <tr>
            <th style={{ width: "5%" }}>S.NO</th>
            <th style={{ width: "25%" }} className="text-start">
              Description
            </th>
            <th style={{ width: "10%" }}>Qty.</th>
            <th style={{ width: "15%" }}>Rate (₹)</th>
            <th style={{ width: "15%" }}>Amount (₹)</th>
            {items.length > 1 && <th style={{ width: "8%" }}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <InvoiceItemRow
              key={idx}
              index={idx}
              item={item}
              onSelectProduct={handleSelectProduct}
              onQtyChange={handleQtyChange}
              onRateChange={handleRateChange}
              onRemoveItem={onRemoveItem}
              canRemove={items.length > 1}
              products={products}
              loading={loading}
            />
          ))}
        </tbody>
      </table>

      <button
        className="btn btn-sm btn-outline-primary mb-3"
        onClick={onAddItem}
        disabled={loading}
      >
        <FaPlus className="me-1" /> 
        {loading ? "Loading..." : "Add Item"}
      </button>
     </div>
  );
}

function InvoiceItemRow({
  index,
  item,
  onSelectProduct,
  onQtyChange,
  onRateChange,
  onRemoveItem,
  canRemove,
  products,
  loading,
}) {
  const lineTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);

  const handleProductChange = (e) => {
    const selectedProductName = e.target.value;
    onSelectProduct(index, selectedProductName);
  };

  const inputStyle = {
    textAlign: "right",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    width: "50%",
  };
  // Get the selected product details
  const selectedProduct = products.find(p => p.name === item.name);

  // Debug current item state
  console.log(`Row ${index} state:`, item);
  console.log(`Row ${index} selected product:`, selectedProduct);

  const [searchTerm, setSearchTerm] = useState(item.name || "");

  // Filter products based on search term
  const filteredProducts = searchTerm
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // If user types an exact product name, auto-select it
    const matchedProduct = products.find(
      p => p.name.toLowerCase() === value.toLowerCase()
    );
    if (matchedProduct) {
      onSelectProduct(index, matchedProduct.name);
    } else {
      onSelectProduct(index, value);
    }
  };

  const handleProductClick = (productName) => {
    setSearchTerm(productName);
    onSelectProduct(index, productName);
  };

  return (
    <tr>
      <td className="text-end" style={{textAlign:"center", paddingRight:"14px", borderRight: "2px bold black"}} >{index + 1}</td>
      <td className="text-start" style={{ position: "relative" }}>
        <input
          type="text"
          className="form-control"
          style={{...inputStyle, textAlign: "left", width: "100%", paddingLeft: "7px" }}
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={loading ? "Loading products..." : "Search Product"}
          disabled={loading}
          autoComplete="on"
        />
        {/* Show dropdown only if not loading and there are matches */}
        {!loading && searchTerm && filteredProducts.length > 0 && (
          <ul
            className="list-group position-absolute w-100"
            style={{
              zIndex: 10,
              whiteSpace: "nowrap",
              spacing: "3px",
              maxHeight: "180px",
              overflowY: "auto",
              top: "100%",
              left: 0,
            }}
          >
            {filteredProducts.map((product, idx) => (
              <li
                key={idx}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => handleProductClick(product.name)}
              >
                {product.name}-{product.quantity} @{fmt.currency(product.rate)}
              </li>
            ))}
          </ul>
        )}
        {loading && (
          <div className="mt-1 small text-info">
            <em>Loading products...</em>
          </div>
        )}
      </td>
      {/* Quantity */}
      <td>
        <input
          type="number"
          className="form-control text-end"
          style={{ ...inputStyle, textAlign: "right" , width: "70%", marginLeft: "auto", paddingRight: "4px", paddingLeft: "25px"}}
          value={item.qty ?? ""}
          min="0"
          step="1"
          placeholder="0"
          onChange={(e) => onQtyChange(index, e.target.value)}
        />
      </td>
      {/* Rate */}
      <td>
        <input
          type="number"
          className="form-control text-end flex-end"
          style={{ ...inputStyle, textAlign: "right" , width: "70%", marginLeft: "auto", paddingRight: "4px", paddingLeft: "25px"}}
          value={item.rate ?? ""}
          min="100"
          step="0.50"
          placeholder="0.00"
          onChange={(e) => onRateChange(index, e.target.value)}
        />
      </td>
      {/* Amount */}
      <td className="text-end align-right align-middle fw-bold" style={{ minWidth: "80px" , fontSize: "14px", fontWeight: "bold", textAlign: "right"}}>

        <span className="fw-semibold">{fmt.currency(lineTotal)}</span>
      </td>
      {/* Action */}
      <td className="text-center align-middle" style={{ minWidth: "60px" , textAlign: "center", verticalAlign: "middle", alignContent: "center"}}>
        {index > 0 && (
          <button
            className="btn btn-sm btn-outline-danger"
            title="Remove Item"
            onClick={() => onRemoveItem(index)}
            disabled={!canRemove}
          >
            <FaTrash />
          </button>
        )}
      </td>
    </tr>
  );
}