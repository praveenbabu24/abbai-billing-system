import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/models/Product';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const drg = searchParams.get('drg') || searchParams.get('drawingNo') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();
    let query: any = {};

    if (drg && drg.trim()) {
      // Dedicated drawing number search (Strictly Case-Insensitive)
      query.drawingNo = { $regex: escapeRegex(drg.trim()), $options: 'i' };
    } else if (search && search.trim()) {
      // Multi-token Case-Insensitive search across description, drawingNo, and hsnCode
      const tokens = search.trim().split(/\s+/).map(escapeRegex).filter(Boolean);
      if (tokens.length > 0) {
        query.$and = tokens.map(token => ({
          $or: [
            { description: { $regex: token, $options: 'i' } },
            { drawingNo: { $regex: token, $options: 'i' } },
            { hsnCode: { $regex: token, $options: 'i' } }
          ]
        }));
      }
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ description: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      products,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      source: 'mongodb'
    });
  } catch (err: any) {
    // Fallback to data-exports/products.json
    try {
      const exportsDir = path.join(process.cwd(), 'data-exports');
      const products = JSON.parse(fs.readFileSync(path.join(exportsDir, 'products.json'), 'utf8'));
      let filtered = products;

      if (drg && drg.trim()) {
        const s = drg.trim().toLowerCase();
        filtered = products.filter((p: any) => p.drawingNo && p.drawingNo.toLowerCase().includes(s));
      } else if (search && search.trim()) {
        const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        filtered = products.filter((p: any) => {
          const desc = (p.description || '').toLowerCase();
          const dNo = (p.drawingNo || '').toLowerCase();
          const hsn = (p.hsnCode || '').toLowerCase();
          return tokens.every(tok => desc.includes(tok) || dNo.includes(tok) || hsn.includes(tok));
        });
      }

      const total = filtered.length;
      const paged = filtered.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        products: paged,
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
    if (!body.description) {
      return NextResponse.json({ success: false, error: 'Product description is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const cleanDesc = body.description.trim();

    // Check if product with identical description already exists (case-insensitive)
    const existing = await Product.findOne({
      description: { $regex: `^${escapeRegex(cleanDesc)}$`, $options: 'i' }
    });

    if (existing) {
      // Update existing product without creating duplicate
      if (body.rate && Number(body.rate) > 0) existing.rate = Number(body.rate);
      if (body.drawingNo && !existing.drawingNo) existing.drawingNo = body.drawingNo.trim();
      if (body.hsnCode) existing.hsnCode = body.hsnCode.trim();
      await existing.save();
      return NextResponse.json({ success: true, product: existing, existed: true });
    }

    const newProduct = await Product.create({
      description: cleanDesc,
      drawingNo: body.drawingNo?.trim() || '',
      hsnCode: body.hsnCode?.trim() || '8445',
      rate: Number(body.rate) || 0,
      unit: body.unit || 'NOS'
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const description = searchParams.get('description');

  if (!id && !description) {
    return NextResponse.json({ success: false, error: 'Product ID or Description is required for deletion.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    let query: any = {};
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else if (description) {
      query.description = description;
    } else if (id) {
      query._id = id;
    }

    const result = await Product.deleteOne(query);
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Product not found in database.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product permanently deleted from MongoDB Atlas.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
