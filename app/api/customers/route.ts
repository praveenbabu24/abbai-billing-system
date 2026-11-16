import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Buyer } from '@/models/Buyer';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const all = searchParams.get('all') === 'true';
  const limit = parseInt(searchParams.get('limit') || (all ? '500' : '20'), 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();
    let query: any = {};
    if (search && search.trim()) {
      const tokens = search.trim().split(/\s+/).map(escapeRegex).filter(Boolean);
      if (tokens.length > 0) {
        query.$and = tokens.map(token => ({
          $or: [
            { name: { $regex: token, $options: 'i' } },
            { gstin: { $regex: token, $options: 'i' } },
            { address: { $regex: token, $options: 'i' } }
          ]
        }));
      }
    }

    const [buyers, total] = await Promise.all([
      Buyer.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Buyer.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      customers: buyers,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      source: 'mongodb'
    });
  } catch (err: any) {
    // Fallback to data-exports/customers.json
    try {
      const exportsDir = path.join(process.cwd(), 'data-exports');
      const customers = JSON.parse(fs.readFileSync(path.join(exportsDir, 'customers.json'), 'utf8'));
      let filtered = customers;
      if (search && search.trim()) {
        const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        filtered = customers.filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const gstin = (c.gstin || '').toLowerCase();
          const addr = (c.address || '').toLowerCase();
          return tokens.every(tok => name.includes(tok) || gstin.includes(tok) || addr.includes(tok));
        });
      }

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        customers: paged,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        source: 'fallback_file'
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.gstin) {
      return NextResponse.json({ success: false, error: 'Customer Name and GSTIN are required.' }, { status: 400 });
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(body.gstin.trim().toUpperCase())) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid GSTIN format: "${body.gstin}". Must be 15 characters (e.g., 33AACHB1973K1ZF).` 
      }, { status: 400 });
    }

    await connectToDatabase();
    const newBuyer = await Buyer.create({
      name: body.name.trim(),
      gstin: body.gstin.trim().toUpperCase(),
      address: body.address?.trim() || 'Coimbatore, Tamil Nadu',
      stateCode: body.gstin.trim().substring(0, 2) || '33'
    });

    return NextResponse.json({ success: true, customer: newBuyer });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const gstin = searchParams.get('gstin');

  if (!id && !gstin) {
    return NextResponse.json({ success: false, error: 'Customer ID or GSTIN is required for deletion.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    let query: any = {};
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else if (gstin) {
      query.gstin = gstin.trim().toUpperCase();
    } else if (id) {
      query._id = id;
    }

    const result = await Buyer.deleteOne(query);
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Customer not found in database.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Customer permanently deleted from MongoDB Atlas.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
