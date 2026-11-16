import { NextResponse, NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';
import { calculateInvoiceTaxes } from '@/lib/gst';

// In-memory fallback array for newly generated invoices if Atlas is not yet connected
let localInvoices: any[] = [];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    await connectToDatabase();
    let query: any = {};
    if (search && search.trim()) {
      const tokens = search.trim().split(/\s+/).map(escapeRegex).filter(Boolean);
      if (tokens.length > 0) {
        query.$and = tokens.map(token => ({
          $or: [
            { invoiceNo: { $regex: token, $options: 'i' } },
            { 'buyer.name': { $regex: token, $options: 'i' } },
            { 'buyer.gstin': { $regex: token, $options: 'i' } }
          ]
        }));
      }
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ invoiceDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Invoice.countDocuments(query)
    ]);

    return NextResponse.json({ success: true, invoices, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err: any) {
    let filtered = localInvoices;
    if (search && search.trim()) {
      const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      filtered = localInvoices.filter((inv: any) => {
        const invNo = (inv.invoiceNo || '').toLowerCase();
        const bName = (inv.buyer?.name || inv.buyerName || '').toLowerCase();
        const bGstin = (inv.buyer?.gstin || inv.buyerGstin || '').toLowerCase();
        return tokens.every(tok => invNo.includes(tok) || bName.includes(tok) || bGstin.includes(tok));
      });
    }
    const paged = filtered.slice((page - 1) * limit, page * limit);
    return NextResponse.json({
      success: true,
      invoices: paged,
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit) || 1
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.buyer || !body.buyer.name || !body.buyer.gstin) {
      return NextResponse.json({ success: false, error: 'Buyer Name and Buyer GSTIN are required.' }, { status: 400 });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required on the invoice.' }, { status: 400 });
    }

    // Auto-calculate taxes and number-to-words
    const taxResult = calculateInvoiceTaxes({
      items: body.items,
      buyerStateCode: body.buyer.stateCode || body.buyer.gstin.substring(0, 2) || '33',
      sellerStateCode: '33'
    });

    // Auto-generate invoice number if not provided (starting from GVK70)
    let invoiceNo = body.invoiceNo?.trim();
    if (!invoiceNo) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
      const endYear = startYear + 1;
      const shortStart = startYear.toString().slice(-2);
      const shortEnd = endYear.toString().slice(-2);
      const fyShort = `${shortStart}/${shortEnd}`;

      let maxNum = 69;
      try {
        await connectToDatabase();
        const existingInvoices = await Invoice.find({}, { invoiceNo: 1 }).lean();
        for (const inv of existingInvoices) {
          if (inv.invoiceNo) {
            const match = inv.invoiceNo.match(/GVK0*(\d+)/i);
            if (match && match[1]) {
              const parsed = parseInt(match[1], 10);
              if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
            }
          }
        }
      } catch (e) {}

      const nextNum = Math.max(70, maxNum + 1);
      invoiceNo = `AME ${fyShort} GVK${nextNum}`;
    }

    const invoiceData = {
      invoiceNo,
      financialYear: body.financialYear || '2026-27',
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      showDrawingNo: body.showDrawingNo !== false,
      showHsn: body.showHsn !== false,
      buyer: {
        name: body.buyer.name,
        gstin: body.buyer.gstin,
        address: body.buyer.address || 'Coimbatore, Tamil Nadu',
        stateCode: body.buyer.stateCode || '33'
      },
      deliveryChallan: {
        dcNo: body.deliveryChallan?.dcNo || '',
        dcDate: body.deliveryChallan?.dcDate || '',
        jobOrderNo: body.deliveryChallan?.jobOrderNo || ''
      },
      items: body.items.map((it: any, index: number) => ({
        itemNumber: index + 1,
        drawingNo: it.drawingNo || '',
        description: it.description,
        hsnCode: it.hsnCode || '',
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        amount: Math.round((Number(it.quantity) || 1) * (Number(it.rate) || 0) * 100) / 100
      })),
      taxableAmount: taxResult.taxableAmount,
      cgstRate: taxResult.cgstRate,
      cgstAmount: taxResult.cgstAmount,
      sgstRate: taxResult.sgstRate,
      sgstAmount: taxResult.sgstAmount,
      igstRate: taxResult.igstRate,
      igstAmount: taxResult.igstAmount,
      roundOff: taxResult.roundOff,
      totalAmount: taxResult.totalAmount,
      amountInWords: taxResult.amountInWords,
      paymentStatus: 'UNPAID',
      notes: body.notes || ''
    };

    try {
      await connectToDatabase();
      const newInvoice = await Invoice.create(invoiceData);
      localInvoices.unshift(invoiceData);
      return NextResponse.json({ success: true, invoice: newInvoice });
    } catch (dbErr) {
      localInvoices.unshift(invoiceData);
      return NextResponse.json({ success: true, invoice: invoiceData });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceNo = searchParams.get('invoiceNo') || searchParams.get('id');

  if (!invoiceNo) {
    return NextResponse.json({ success: false, error: 'Invoice Number or ID is required for deletion.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const query: any = {
      $or: [
        { invoiceNo: invoiceNo },
        ...(mongoose.Types.ObjectId.isValid(invoiceNo) ? [{ _id: invoiceNo }] : [])
      ]
    };
    const result = await Invoice.deleteOne(query);

    localInvoices = localInvoices.filter(inv => inv.invoiceNo !== invoiceNo && String(inv._id) !== invoiceNo);

    return NextResponse.json({ 
      success: true, 
      message: `Invoice ${invoiceNo} deleted successfully from database.`,
      deletedCount: result.deletedCount 
    });
  } catch (err: any) {
    localInvoices = localInvoices.filter(inv => inv.invoiceNo !== invoiceNo);
    return NextResponse.json({ success: true, message: `Invoice removed from local cache. (DB Error: ${err.message})` });
  }
}
