/**
 * GST Calculation and Indian Number-to-Words Utilities
 * tailored for Abbai Micro Engineering Tax Invoices.
 */

// Converts numbers into Indian currency format words (Lakhs, Crores, Thousands)
export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num < 10) return singleDigits[num];
    if (num < 20) return teens[num - 10];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + singleDigits[num % 10] : '');
  }

  function convertThreeDigits(num: number): string {
    let result = '';
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    if (hundred > 0) {
      result += singleDigits[hundred] + ' Hundred';
      if (rest > 0) result += ' ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  let rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  let words = '';

  const crores = Math.floor(rupees / 10000000);
  rupees %= 10000000;

  const lakhs = Math.floor(rupees / 100000);
  rupees %= 100000;

  const thousands = Math.floor(rupees / 1000);
  rupees %= 1000;

  const remaining = rupees;

  if (crores > 0) words += convertTwoDigits(crores) + ' Crore ';
  if (lakhs > 0) words += convertTwoDigits(lakhs) + ' Lakh ';
  if (thousands > 0) words += convertTwoDigits(thousands) + ' Thousand ';
  if (remaining > 0) words += convertThreeDigits(remaining);

  words = words.trim();
  if (!words) words = 'Zero';

  let result = 'Rupees ' + words;
  if (paise > 0) {
    result += ' and Paise ' + convertTwoDigits(paise);
  }
  result += ' Only';

  return result;
}

export interface TaxCalculationInput {
  items: Array<{ quantity: number; rate: number }>;
  buyerStateCode?: string; // Default: '33' (Tamil Nadu)
  sellerStateCode?: string; // Default: '33'
}

export interface TaxCalculationResult {
  taxableAmount: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  totalAmount: number;
  amountInWords: string;
}

export function calculateInvoiceTaxes({
  items,
  buyerStateCode = '33',
  sellerStateCode = '33',
}: TaxCalculationInput): TaxCalculationResult {
  const taxable = items.reduce((acc, curr) => {
    const qty = Number(curr.quantity) || 0;
    const rate = Number(curr.rate) || 0;
    return acc + (qty * rate);
  }, 0);

  const taxableAmount = Math.round(taxable * 100) / 100;
  const isInterState = buyerStateCode.trim() !== '' && buyerStateCode.trim() !== sellerStateCode.trim();

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = 18;
    igstAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  } else {
    cgstRate = 9;
    sgstRate = 9;
    cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
    sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  }

  const exactTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const finalTotal = Math.round(exactTotal * 100) / 100;

  return {
    taxableAmount,
    isInterState,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax: Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100,
    roundOff: 0,
    totalAmount: finalTotal,
    amountInWords: numberToWordsIndian(finalTotal),
  };
}
