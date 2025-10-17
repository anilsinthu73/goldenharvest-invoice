import { FaEnvelope, FaIdCard, FaMapMarkerAlt, FaMobileAlt, FaRegIdBadge } from 'react-icons/fa';
import logo from '../../assets/logo.png';

export default function InvoiceHeader() {
  return (
    <div>
      <h2
        className="mb-1"
        style={{
          textAlign: 'center',
          fontWeight: 'bolder',
          letterSpacing: '1px',
          fontSize: '2rem',
          fontFamily: 'Times New Roman',
        }}
      >
        Tax Invoice
      </h2>

      <div
        className="d-flex"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center', // Vertically center content
        }}
      >
        <div
          className="company-logo"
          style={{
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center', 
            height: 180,
          }}
        >
          <img
            src={logo}
            alt="Company Logo"
            style={{
              height: 180,
              width: 180,
              objectFit: 'contain',
            }}
          />
        </div>
        <div
          className="company-info"
          style={{
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Center info vertically
            height: 180, // Match logo height for alignment
          }}
        >
          <h3
            style={{
              fontWeight: 'bolder',
              margin: 0,
              color: 'rgb(21, 213, 18)',
              fontSize: '1.5rem',
              letterSpacing: '1px',
              fontFamily: 'Verdana, sans-serif',
            }}
          >
            GOLDEN HARVEST
          </h3>
          <div
            style={{
              lineHeight: 1.7,
              fontSize: '14px',
              fontWeight: 'bolder',
              fontFamily: 'Arial, sans-serif',
              marginTop: 6,
              textAlign: 'right',
            }}
          >
             <div>
              <FaMobileAlt style={{ marginRight: 6 }} />
              {"+91  9949589098"}
            </div>
            <div>
              <FaIdCard style={{ marginRight: 6, fontStyle: 'italic' }} />
              {"GSTIN: 37CTWPJ4314B1ZN"}
            </div>
            <div>
              <FaRegIdBadge style={{ marginRight: 6, fontStyle: 'italic' }} />
              {"FSSAI: 10125001000050"}
            </div>
           
            <div>
              <FaEnvelope style={{ marginRight: 6 }} />
              {"goldenharvest0648@gmail.com"}
            </div>
            <div>
              <FaMapMarkerAlt style={{ marginRight: 6 }} />
              {"SH-31, Chinna Thulugu, Gara, Srikakulam,"}
            </div>
            <div style={{ marginLeft: 20 }}>{"Andhra Pradesh - 532405"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}