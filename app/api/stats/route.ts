import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';
import { Buyer } from '@/models/Buyer';
import { Product } from '@/models/Product';

export async function GET() {
  try {
    // Attempt MongoDB Atlas connection
    await connectToDatabase();
    
    const [totalInvoices, totalRevenueAgg, totalCustomers, totalProducts, recentInvoices] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Buyer.countDocuments(),
      Product.countDocuments(),
      Invoice.find().sort({ invoiceDate: -1 }).limit(10).lean()
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    return NextResponse.json({
      connectedToAtlas: true,
      stats: {
        totalRevenue,
        totalInvoices,
        totalCustomers,
        totalProducts,
        averageInvoice: totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0,
      },
      recentInvoices
    });
  } catch (err: any) {
    // Fallback gracefully to pre-exported JSON data if MongoDB Atlas is not configured yet
    const exportsDir = path.join(process.cwd(), 'data-exports');
    try {
      const customers = JSON.parse(fs.readFileSync(path.join(exportsDir, 'customers.json'), 'utf8'));
      const products = JSON.parse(fs.readFileSync(path.join(exportsDir, 'products_master_all.json'), 'utf8'));
      const invoices = JSON.parse(fs.readFileSync(path.join(exportsDir, 'invoices_history.json'), 'utf8'));

      const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + (inv.totalAmount || 0), 0);

      return NextResponse.json({
        connectedToAtlas: false,
        message: 'Running in offline/preview mode using exported JSON files. Set MONGODB_URI in .env.local to connect to MongoDB Atlas.',
        stats: {
          totalRevenue: Math.round(totalRevenue),
          totalInvoices: invoices.length,
          totalCustomers: customers.length,
          totalProducts: products.length,
          averageInvoice: Math.round(totalRevenue / invoices.length),
        },
        recentInvoices: invoices.slice(0, 10)
      });
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to fetch statistics', details: err.message }, { status: 500 });
    }
  }
}
