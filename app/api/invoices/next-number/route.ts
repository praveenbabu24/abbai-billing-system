import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 3 = Apr
    const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    const endYear = startYear + 1;
    const shortStart = startYear.toString().slice(-2);
    const shortEnd = endYear.toString().slice(-2);
    const financialYear = `${startYear}-${shortEnd}`;
    const fyShort = `${shortStart}/${shortEnd}`;

    let maxNum = 69; // Base starting point so next becomes at least 70

    try {
      await connectToDatabase();
      // Fetch all invoices to inspect their GVK numbers
      const invoices = await Invoice.find({}, { invoiceNo: 1 }).lean();
      
      for (const inv of invoices) {
        if (inv.invoiceNo) {
          const match = inv.invoiceNo.match(/GVK0*(\d+)/i);
          if (match && match[1]) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      }
    } catch (dbErr: any) {
      console.warn('DB query failed for next invoice number, using starting value 70:', dbErr.message);
    }

    // Auto increment: starting from 70, then 71, 72, etc.
    const nextNumber = Math.max(70, maxNum + 1);
    const nextInvoiceNo = `AME ${fyShort} GVK${nextNumber}`;

    return NextResponse.json({
      success: true,
      nextInvoiceNo,
      nextNumber,
      financialYear,
      startingNumber: 70
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      nextInvoiceNo: 'AME 26/27 GVK70',
      nextNumber: 70
    }, { status: 500 });
  }
}
