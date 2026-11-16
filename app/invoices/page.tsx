'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Search, 
  Printer, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { SweetAlert } from '@/lib/sweetalert';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [page, search]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?search=${encodeURIComponent(search)}&page=${page}&limit=20`);
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
        setTotalPages(data.pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceNo: string) => {
    const confirmed = await SweetAlert.confirm(
      'Delete Invoice?',
      `Are you sure you want to permanently delete invoice "${invoiceNo}" from MongoDB Atlas?`,
      'Yes, Delete'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/invoices?invoiceNo=${encodeURIComponent(invoiceNo)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        SweetAlert.success('Deleted', `Invoice "${invoiceNo}" was permanently deleted.`);
        fetchInvoices();
      } else {
        SweetAlert.error('Delete Failed', data.error);
      }
    } catch (err: any) {
      SweetAlert.error('Error', err.message);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Tax Invoices Register</h1>
          <p className="text-xs text-slate-500">
            {totalCount} Generated Tax Invoices synced with MongoDB Atlas
          </p>
        </div>
        <Link
          href="/"
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Invoice No, Buyer Name, or GSTIN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Invoice No</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Buyer Company</th>
                <th className="px-5 py-3.5">Buyer GSTIN</th>
                <th className="px-5 py-3.5 text-right">Taxable</th>
                <th className="px-5 py-3.5 text-right">Total Amount</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No invoices match your search.</td>
                </tr>
              ) : (
                invoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
                      {inv.invoiceNo || `AME-INV-${idx + 1}`}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 max-w-xs truncate">
                      {inv.buyerName || inv.buyer?.name}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      {inv.buyerGstin || inv.buyer?.gstin}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">
                      ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <Link
                          href={`/invoices/${encodeURIComponent(inv.invoiceNo || idx)}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteInvoice(inv.invoiceNo || inv._id)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Visible only on mobile screens) */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No invoices found.
          </div>
        ) : (
          invoices.map((inv, idx) => (
            <div 
              key={idx}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-blue-600 text-xs">
                  {inv.invoiceNo || `AME-INV-${idx + 1}`}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-'}
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-900 text-xs leading-snug">
                  {inv.buyerName || inv.buyer?.name}
                </p>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                  GST: {inv.buyerGstin || inv.buyer?.gstin}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Amount</span>
                  <span className="font-black text-slate-900 text-sm">
                    ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/invoices/${encodeURIComponent(inv.invoiceNo || idx)}`}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View / Print</span>
                  </Link>

                  <button
                    onClick={() => handleDeleteInvoice(inv.invoiceNo || inv._id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200"
                    title="Delete invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm text-xs font-semibold text-slate-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
