const convertToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  let words = '';

  if (rupees > 0) {
    if (rupees >= 100000) {
      const lakhs = Math.floor(rupees / 100000);
      words += convertToWords(lakhs) + ' Lakh ';
      rupees %= 100000;
    }
    if (rupees >= 1000) {
      const thousands = Math.floor(rupees / 1000);
      words += (thousands >= 20 ? b[Math.floor(thousands / 10)] + ' ' + a[thousands % 10] : a[thousands]) + ' Thousand ';
      rupees %= 1000;
    }
    if (rupees >= 100) {
      const hundreds = Math.floor(rupees / 100);
      words += a[hundreds] + ' Hundred ';
      rupees %= 100;
    }
    if (rupees > 0) {
      words += rupees < 20 ? a[rupees] + ' ' : b[Math.floor(rupees / 10)] + ' ' + (rupees % 10 > 0 ? a[rupees % 10] + ' ' : '');
    }
    words += 'Rupees';
  }

  if (paise > 0) {
    if (words !== '') words += ' and ';
    words += paise < 20 ? a[paise] + ' ' : b[Math.floor(paise / 10)] + ' ' + (paise % 10 > 0 ? a[paise % 10] + ' ' : '');
    words += 'Paises';
  }

  return words + ' Only';
};

module.exports = { convertToWords };
