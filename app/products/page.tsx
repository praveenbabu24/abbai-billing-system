'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  X, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Filter
} from 'lucide-react';
import { SweetAlert } from '@/lib/sweetalert';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New Product Form
  const [newDesc, setNewDesc] = useState('');
  const [newDrg, setNewDrg] = useState('');
  const [newHsn, setNewHsn] = useState('8445');
  const [newRate, setNewRate] = useState('');
  const [newUnit, setNewUnit] = useState('NOS');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&page=${page}&limit=25`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setTotalPages(data.pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      SweetAlert.error('Error', 'Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDesc.trim()) {
      return SweetAlert.error('Validation Error', 'Product description is required.');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDesc.trim(),
          drawingNo: newDrg.trim(),
          hsnCode: newHsn.trim(),
          rate: Number(newRate) || 0,
          unit: newUnit.trim() || 'NOS'
        })
      });

      const data = await res.json();
      if (data.success) {
        SweetAlert.success('Product Added!', `"${newDesc}" has been permanently added to MongoDB Atlas.`);
        setShowAddModal(false);
        setNewDesc('');
        setNewDrg('');
        setNewRate('');
        fetchProducts();
      } else {
        SweetAlert.error('Failed to Add Product', data.error);
      }
    } catch (err: any) {
      SweetAlert.error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    const prodId = product._id || product.description;
    const confirmed = await SweetAlert.confirm(
      'Delete Product from Database?',
      `Are you sure you want to permanently delete "${product.description}"? It will be removed from MongoDB Atlas.`,
      'Yes, Delete Product'
    );

    if (!confirmed) return;

    setDeletingId(prodId);
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(product._id || '')}&description=${encodeURIComponent(product.description || '')}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await SweetAlert.success('Product Deleted', `"${product.description}" removed from catalog.`);
        fetchProducts();
      } else {
        SweetAlert.error('Delete Failed', data.error || 'Could not delete product.');
      }
    } catch (err: any) {
      SweetAlert.error('Error', err.message || 'Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Products & Drawings Catalog</h1>
          <p className="text-xs text-slate-500">
            {totalCount} Verified Engineering Parts & Drawing Numbers in MongoDB Atlas (Rate &gt; 0)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Dual Search Bar (Product Description & Drawing Number) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products by Drawing Number (DRG NO), Description, or HSN Code (Case-Insensitive)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 w-12 text-center">#</th>
                <th className="px-5 py-3.5">Drawing No (DRG NO)</th>
                <th className="px-5 py-3.5">Product Description</th>
                <th className="px-5 py-3.5 text-center">HSN Code</th>
                <th className="px-5 py-3.5 text-center">Unit</th>
                <th className="px-5 py-3.5 text-right">Standard Rate (₹)</th>
                <th className="px-5 py-3.5 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-xs font-semibold">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Searching MongoDB Atlas database...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-xs">No products match your search.</td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-bold text-center">
                      {(page - 1) * 25 + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600">
                      {p.drawingNo || '-'}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {p.description}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs">
                      <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-slate-700 font-bold">
                        {p.hsnCode || '8445'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-slate-500 font-medium">
                      {p.unit || 'NOS'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">
                      ₹{Number(p.rate || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        disabled={deletingId === (p._id || p.description)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete product permanently from database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Searching database...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No products found.
          </div>
        ) : (
          products.map((p, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs leading-snug">{p.description}</p>
                  {p.drawingNo && (
                    <span className="font-mono text-blue-600 font-bold text-[11px] block mt-0.5">
                      {p.drawingNo}
                    </span>
                  )}
                </div>
                <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-xl">
                  ₹{Number(p.rate || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div className="space-x-1.5">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold">HSN: {p.hsnCode || '8445'}</span>
                  <span>• {p.unit || 'NOS'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(p)}
                  disabled={deletingId === (p._id || p.description)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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
          <span>Showing Page {page} of {totalPages} ({totalCount} items in DB)</span>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Drawing Number (DRG NO)</label>
                <input
                  type="text"
                  placeholder="e.g. DRG NO: S53310160100"
                  value={newDrg}
                  onChange={(e) => setNewDrg(e.target.value.toUpperCase())}
                  className="w-full font-mono uppercase border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description *</label>
                <input
                  type="text"
                  placeholder="e.g. LIMIT SWITCH FLAB"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={newHsn}
                    onChange={(e) => setNewHsn(e.target.value)}
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Rate (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
