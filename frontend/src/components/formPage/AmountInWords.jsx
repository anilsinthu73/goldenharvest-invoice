import { useEffect, useState } from 'react';
import { convertAmountToWords } from '../../utils/InvoiceUtils';

export default function AmountInWords({ totalAmount }) {
    console.log("💡 AmountInWords Component Rendered with totalAmount:", totalAmount);
  const [amountInWords, setAmountInWords] = useState('');

  useEffect(() => {
    const words = convertAmountToWords(totalAmount);
    setAmountInWords(words);
  }, [totalAmount]);


  const containerStyle = {
    margin: '20px 0',
    display: 'flex',
    width: '100%',
    padding: '10px',

  };

  const cardStyle = {

    padding: '16px'
  };

  const titleStyle = {
    fontSize: '16px',
    fontWeight: '800',
    color: '#1b1b1b',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const textStyle = {
    fontSize: '16px',
    display: 'inline-block',
    fontWeight: '700',
    color: '#1b1b1b  ',
    lineHeight: '1.4',
    minHeight: '24px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontStyle: 'italic',
    textWrap:'wrap'
  };
  

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>Amount in Words</div>
        <div style={textStyle}>
          {amountInWords}
        </div>
      </div>
      {/* Signature Section */}
      <div style={{...cardStyle, textAlign: 'right', flex:1, marginRight:"150px"}}>
          <div style={{...textStyle, border:"none", fontStyle:"normal", fontWeight:"400", paddingTop:"10px"}}>
          (Signature)
        </div>
        <div style={titleStyle}>Authorised Signatory</div>
      
      </div>
    </div>
  );
}