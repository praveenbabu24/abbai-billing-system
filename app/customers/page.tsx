'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  X,
  Building2,
  Trash2,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { SweetAlert } from '@/lib/sweetalert';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&page=${page}&limit=12`);
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
        setTotalPages(data.pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      SweetAlert.error('Error', 'Could not load customer directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newGstin.trim()) {
      return SweetAlert.error('Validation Error', 'Customer Name and GSTIN are required.');
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(newGstin.trim().toUpperCase())) {
      return SweetAlert.error(
        'Invalid GSTIN', 
        `"${newGstin}" is not a valid 15-character Indian GSTIN (e.g., 33AACHB1973K1ZF).`
      );
    }

    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          gstin: newGstin.trim().toUpperCase(),
          address: newAddress.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        SweetAlert.success('Customer Added!', `"${newName}" has been saved to MongoDB Atlas.`);
        setShowAddModal(false);
        setNewName('');
        setNewGstin('');
        setNewAddress('');
        fetchCustomers();
      } else {
        SweetAlert.error('Could Not Add Customer', data.error);
      }
    } catch (err: any) {
      SweetAlert.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (customer: any) => {
    const custId = customer._id || customer.gstin;
    const confirmed = await SweetAlert.confirm(
      'Delete Customer from Database?',
      `Are you sure you want to permanently delete "${customer.name}"? It will be removed from MongoDB Atlas.`,
      'Yes, Delete Customer'
    );

    if (!confirmed) return;

    setDeletingId(custId);
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(customer._id || '')}&gstin=${encodeURIComponent(customer.gstin || '')}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await SweetAlert.success('Customer Deleted', `"${customer.name}" has been removed from database.`);
        fetchCustomers();
      } else {
        SweetAlert.error('Delete Failed', data.error || 'Could not delete customer.');
      }
    } catch (e: any) {
      SweetAlert.error('Error', e.message || 'Failed to delete customer.');
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'CO';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Customers Directory</h1>
          <p className="text-xs text-slate-500">
            {totalCount} Corporate Buyers synced live with MongoDB Atlas
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search customers by company name, GSTIN, or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* REDESIGNED MODERN CUSTOMER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs font-semibold">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading corporate buyers from MongoDB Atlas...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No customers match your search query.
          </div>
        ) : (
          customers.map((c, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Company Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-700">
                    {getInitials(c.name)}
                  </div>

                  {/* GSTIN Badge */}
                  <div className="text-right">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{c.gstin || 'UNREGISTERED'}</span>
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                      State Code: {c.stateCode || (c.gstin ? c.gstin.substring(0, 2) : '33')}
                    </span>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                    {c.name}
                  </h3>
                </div>

                {/* Address */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 flex items-start space-x-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{c.address || 'Coimbatore, Tamil Nadu, India'}</span>
                  </p>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/?buyer=${encodeURIComponent(c.name)}`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(c)}
                  disabled={deletingId === (c._id || c.gstin)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Delete customer permanently from database"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm text-xs font-semibold text-slate-600">
          <span>Showing Page {page} of {totalPages} ({totalCount} total)</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-900 px-2">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ABC ENGINEERING WORKS"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / GST Number * (15 Characters)</label>
                <input
                  type="text"
                  placeholder="33AACHB1973K1ZF"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                  required
                  className="w-full font-mono uppercase border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  placeholder="Full office/factory address in Coimbatore..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
