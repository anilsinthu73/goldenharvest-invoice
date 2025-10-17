// Fetch existing invoices from API
export const fetchExistingInvoices = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/invoices');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.success && data.invoices) {
      console.log('Fetched existing invoices:', data.invoices.length);
      return data.invoices;
    }
    return [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};


export async function generateInvoiceNumber() {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const prefix = `GH${yy}${mm}${dd}`;

  try {
    // Fetch existing invoices from API
    const existingInvoices = await fetchExistingInvoices();
    
    if (existingInvoices.length === 0) {
      // No existing invoices, start with 01
      return `${prefix}01`;
    }

    // Extract invoice numbers and filter today's invoices
    const invoiceNumbers = existingInvoices.map(inv => inv['Invoice No'] || inv.invoiceNo);
    const todaysInvoices = invoiceNumbers.filter(num => num.startsWith(prefix));
    
    console.log(`Found ${todaysInvoices.length} invoices for today:`, todaysInvoices);

    if (todaysInvoices.length === 0) {
      return `${prefix}01`;
    }

     const sequenceNumbers = todaysInvoices.map(num => {
      const sequencePart = num.slice(-2); 
      return parseInt(sequencePart, 10);
    }).filter(num => !isNaN(num));

    if (sequenceNumbers.length === 0) {
      return `${prefix}01`;
    }

    const maxSequence = Math.max(...sequenceNumbers);
    const nextSequence = maxSequence + 1;

    if (nextSequence > 99) {
      throw new Error('Daily invoice limit reached (99 invoices per day)');
    }

    const nextInvoiceNumber = `${prefix}${String(nextSequence).padStart(2, "0")}`;
    console.log(`Generated next invoice number: ${nextInvoiceNumber}`);
    
    return nextInvoiceNumber;

  } catch (error) {
    console.error('Error generating invoice number from API, using fallback:', error);
    return generateInvoiceNumberFallback(prefix);
  }
}



export const convertAmountToWords = (amount) => {
    if (!amount || amount === 0) return 'Zero Rupees Only';

    const num = parseFloat(amount);
    if (isNaN(num)) return 'Invalid Amount';

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let words = convertNumberToWords(rupees) + ' Rupee' + (rupees !== 1 ? 's' : '');
    
    if (paise > 0) {
      words += ' and ' + convertNumberToWords(paise) + ' Paise' + (paise !== 1 ? 's' : '');
    }
    
    return words + ' Only';
  };

  const convertNumberToWords = (num) => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num < 20) return ones[num];
    
    let word = '';

    if (num >= 10000000) {
      const crore = Math.floor(num / 10000000);
      word += convertNumberToWords(crore) + ' Crore ';
      num %= 10000000;
    }

    if (num >= 100000) {
      const lakh = Math.floor(num / 100000);
      word += convertNumberToWords(lakh) + ' Lakh ';
      num %= 100000;
    }

    if (num >= 1000) {
      const thousand = Math.floor(num / 1000);
      word += convertNumberToWords(thousand) + ' Thousand ';
      num %= 1000;
    }

    if (num >= 100) {
      const hundred = Math.floor(num / 100);
      word += ones[hundred] + ' Hundred ';
      num %= 100;
    }

    if (num > 0) {
      if (word !== '') word += 'and ';
      
      if (num < 20) {
        word += ones[num];
      } else {
        word += tens[Math.floor(num / 10)];
        if (num % 10 > 0) {
          word += ' ' + ones[num % 10];
        }
      }
    }

    return word.trim();
  };



export const fmt = {
  currency: (amount, symbol = "₹") => `${symbol}${Number(amount || 0).toFixed(2)}`,
  date: (dateObj, sep = "-") => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  },
  fiscalYear: (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    return month < 4 ? `${year - 1}-${String(year).slice(2)}` : `${year}-${String(year + 1).slice(2)}`;
  }
};
