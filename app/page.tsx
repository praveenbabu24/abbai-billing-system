'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Building2, 
  FileCheck, 
  Printer, 
  CheckSquare, 
  Square,
  Sparkles,
  Save,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Edit3,
  Lock,
  RotateCcw
} from 'lucide-react';
import { SweetAlert } from '@/lib/sweetalert';
import { calculateInvoiceTaxes } from '@/lib/gst';

interface InvoiceItem {
  drawingNo: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function BillingTerminalPage() {
  const router = useRouter();

  // Invoice Metadata & Auto-Increment State
  const [invoiceNo, setInvoiceNo] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditingInvoiceNo, setIsEditingInvoiceNo] = useState(false); // Non-edit mode by default
  const [isAutoIncremented, setIsAutoIncremented] = useState(true);
  const [loadingNextInvoiceNo, setLoadingNextInvoiceNo] = useState(false);

  // Optional Columns
  const [showDrawingNo, setShowDrawingNo] = useState(true);
  const [showHsn, setShowHsn] = useState(true);

  // Delivery Challan Details
  const [dcNo, setDcNo] = useState('');
  const [dcDate, setDcDate] = useState('');
  const [jobOrderNo, setJobOrderNo] = useState('');

  // Buyer Info
  const [customers, setCustomers] = useState<any[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('33');

  // Customer Live Search from MongoDB Atlas (NOT static total saved)
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [isBuyerTyping, setIsBuyerTyping] = useState(false);
  const [buyerSuggestions, setBuyerSuggestions] = useState<any[]>([]);
  const [isSearchingBuyers, setIsSearchingBuyers] = useState(false);
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  // Product Description Autocomplete State (Live queries MongoDB Atlas as user types!)
  const [catalog, setCatalog] = useState<any[]>([]);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dbSuggestions, setDbSuggestions] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  // Drawing Number Autocomplete State (Live queries MongoDB Atlas by DRG NO!)
  const [activeDrgSearchIndex, setActiveDrgSearchIndex] = useState<number | null>(null);
  const [drgSearchQuery, setDrgSearchQuery] = useState('');
  const [isTypingDrg, setIsTypingDrg] = useState(false);
  const [drgSuggestions, setDrgSuggestions] = useState<any[]>([]);
  const [isSearchingDrg, setIsSearchingDrg] = useState(false);

  // Live Query MongoDB Atlas for Buyer Suggestions when user types
  useEffect(() => {
    if (!isBuyerTyping || !buyerSearchQuery.trim()) {
      setBuyerSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingBuyers(true);
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(buyerSearchQuery.trim())}&limit=8`);
        const data = await res.json();
        if (data.customers && Array.isArray(data.customers)) {
          setBuyerSuggestions(data.customers);
        }
      } catch (e) {
        setBuyerSuggestions(
          customers.filter(c => 
            (c.name && c.name.toLowerCase().includes(buyerSearchQuery.toLowerCase())) ||
            (c.gstin && c.gstin.toLowerCase().includes(buyerSearchQuery.toLowerCase()))
          ).slice(0, 8)
        );
      } finally {
        setIsSearchingBuyers(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [buyerSearchQuery, isBuyerTyping, customers]);

  // Live Query MongoDB Atlas for Product Suggestions when user types
  useEffect(() => {
    if (!isTyping || !searchQuery.trim()) {
      setDbSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDb(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=12`);
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setDbSuggestions(data.products);
        }
      } catch (e) {
        setDbSuggestions(
          catalog.filter(p => 
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.drawingNo && p.drawingNo.toLowerCase().includes(searchQuery.toLowerCase()))
          ).slice(0, 8)
        );
      } finally {
        setIsSearchingDb(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, isTyping, catalog]);

  // Live Query MongoDB Atlas for Drawing Number Suggestions when user types in DRG NO
  useEffect(() => {
    if (!isTypingDrg || !drgSearchQuery.trim()) {
      setDrgSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDrg(true);
      try {
        const res = await fetch(`/api/products?drg=${encodeURIComponent(drgSearchQuery.trim())}&limit=12`);
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setDrgSuggestions(data.products);
        }
      } catch (e) {
        setDrgSuggestions(
          catalog.filter(p => 
            p.drawingNo && p.drawingNo.toLowerCase().includes(drgSearchQuery.toLowerCase())
          ).slice(0, 8)
        );
      } finally {
        setIsSearchingDrg(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [drgSearchQuery, isTypingDrg, catalog]);

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { drawingNo: '', description: '', hsnCode: '8445', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);

  // Auto-fetch next incremental invoice number starting from GVK70
  const loadNextInvoiceNumber = async () => {
    setLoadingNextInvoiceNo(true);
    try {
      const res = await fetch('/api/invoices/next-number');
      const data = await res.json();
      if (data.nextInvoiceNo) {
        setInvoiceNo(data.nextInvoiceNo);
        setIsAutoIncremented(true);
        if (data.financialYear) setFinancialYear(data.financialYear);
      } else {
        setInvoiceNo('AME 26/27 GVK70');
        setIsAutoIncremented(true);
      }
    } catch (e) {
      setInvoiceNo('AME 26/27 GVK70');
      setIsAutoIncremented(true);
    } finally {
      setLoadingNextInvoiceNo(false);
    }
  };

  // Generate default Invoice No & Fetch initial data or prefill from URL
  useEffect(() => {
    loadNextInvoiceNumber();

    fetch('/api/customers?limit=200')
      .then(res => res.json())
      .then(data => {
        if (data.customers) setCustomers(data.customers);
      })
      .catch(() => {});

    fetch('/api/products?limit=2500')
      .then(res => res.json())
      .then(data => {
        if (data.products) setCatalog(data.products);
      })
      .catch(() => {});

    // Check if buyer prefill was requested via URL ?buyer=...
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefillBuyer = params.get('buyer');
      if (prefillBuyer) {
        fetch(`/api/customers?search=${encodeURIComponent(prefillBuyer)}&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data.customers && data.customers.length > 0) {
              const found = data.customers[0];
              setBuyerName(found.name);
              setBuyerGstin(found.gstin || '');
              setBuyerAddress(found.address || '');
              setBuyerStateCode(found.stateCode || (found.gstin ? found.gstin.substring(0, 2) : '33'));
              SweetAlert.toast(`Loaded buyer: ${found.name}`, 'info');
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // Handle Buyer Selection from Live Autocomplete
  const handleSelectCustomerRecord = (cust: any) => {
    setBuyerName(cust.name);
    setBuyerGstin(cust.gstin || '');
    setBuyerAddress(cust.address || '');
    setBuyerStateCode(cust.stateCode || (cust.gstin ? cust.gstin.substring(0, 2) : '33'));
    setBuyerSearchQuery('');
    setIsBuyerTyping(false);
    setShowBuyerDropdown(false);
    SweetAlert.toast(`Selected: ${cust.name}`, 'success');
  };

  const handleClearBuyer = () => {
    setBuyerName('');
    setBuyerGstin('');
    setBuyerAddress('');
    setBuyerStateCode('33');
    setBuyerSearchQuery('');
    setIsBuyerTyping(false);
    setShowBuyerDropdown(false);
    setBuyerSuggestions([]);
  };

  // Line Item Operations
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? Number(value) : current.quantity;
      const r = field === 'rate' ? Number(value) : current.rate;
      current.amount = Math.round(q * r * 100) / 100;
    }
    updated[index] = current;
    setItems(updated);
  };

  // Case-Insensitive & Whitespace Normalizer for Products
  const normalizeProductKey = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/^(\d+[\s\:\.\-]+)+/, '') // ignore leading item indicators like "1: ", "2. "
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Robust check if product already exists in database catalog
  const isProductInCatalog = (desc: string, drg?: string) => {
    if (!desc || !desc.trim()) return false;
    const nDesc = normalizeProductKey(desc);
    const nDrg = normalizeProductKey(drg || '');

    return catalog.some(p => {
      const pDesc = normalizeProductKey(p.description);
      if (pDesc === nDesc) return true;
      if (nDrg && p.drawingNo && normalizeProductKey(p.drawingNo) === nDrg) return true;
      return false;
    });
  };

  // Handle Selection from Product Description Autocomplete
  const handleSelectProduct = (index: number, prod: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      drawingNo: prod.drawingNo || '',
      description: prod.description || '',
      hsnCode: prod.hsnCode || '8445',
      rate: prod.rate || 0,
      amount: Math.round((updated[index].quantity || 1) * (prod.rate || 0) * 100) / 100
    };
    setItems(updated);
    setActiveItemSearchIndex(null);
    setSearchQuery('');
    setIsTyping(false);

    // Sync into catalog state so "+ Save to DB" never appears for existing DB products
    setCatalog(prev => {
      const exists = prev.some(p => p._id === prod._id || normalizeProductKey(p.description) === normalizeProductKey(prod.description));
      return exists ? prev : [...prev, prod];
    });

    SweetAlert.toast(`Selected: ${prod.description.substring(0, 25)}...`, 'success');
  };

  // Handle Selection from Drawing Number Autocomplete
  const handleSelectProductFromDrg = (index: number, prod: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      drawingNo: prod.drawingNo || '',
      description: prod.description || updated[index].description || '',
      hsnCode: prod.hsnCode || '8445',
      rate: prod.rate || 0,
      amount: Math.round((updated[index].quantity || 1) * (prod.rate || 0) * 100) / 100
    };
    setItems(updated);
    setActiveDrgSearchIndex(null);
    setDrgSearchQuery('');
    setIsTypingDrg(false);

    // Sync into catalog state
    setCatalog(prev => {
      const exists = prev.some(p => p._id === prod._id || normalizeProductKey(p.description) === normalizeProductKey(prod.description));
      return exists ? prev : [...prev, prod];
    });

    SweetAlert.toast(`Loaded DRG: ${prod.drawingNo} (${prod.description.substring(0, 20)}...)`, 'success');
  };

  // Explicitly Save a Custom Product to MongoDB Atlas
  const handleSaveProductToDb = async (index: number) => {
    const item = items[index];
    if (!item.description.trim()) {
      return SweetAlert.warning('Missing Description', 'Enter product description first before saving to catalog.');
    }

    setSavingProductId(index);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: item.description.trim(),
          drawingNo: item.drawingNo.trim(),
          hsnCode: item.hsnCode || '8445',
          rate: Number(item.rate) || 0,
          unit: 'NOS'
        })
      });

      const data = await res.json();
      if (data.success) {
        setCatalog(prev => [...prev, data.product]);
        await SweetAlert.success(
          'Product Saved to Database!',
          `"${item.description}" has been permanently added to MongoDB Atlas product catalog.`
        );
      } else {
        SweetAlert.error('Save Failed', data.error || 'Could not save product.');
      }
    } catch (e: any) {
      SweetAlert.error('Error', e.message || 'Database connection error.');
    } finally {
      setSavingProductId(null);
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { drawingNo: '', description: '', hsnCode: showHsn ? '8445' : '', quantity: 1, rate: 0, amount: 0 }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      SweetAlert.warning('Minimum Item Requirement', 'An invoice must have at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Dynamic Taxes Calculation
  const taxSummary = calculateInvoiceTaxes({
    items: items.map(it => ({ quantity: it.quantity, rate: it.rate })),
    buyerStateCode: buyerStateCode || '33',
    sellerStateCode: '33'
  });

  // Submit Handler
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      return SweetAlert.error('Missing Buyer Name', 'Please select or enter the ordering company name.');
    }

    if (!buyerGstin.trim()) {
      return SweetAlert.error('Missing Buyer GSTIN', 'Please enter a valid 15-character GSTIN for the buyer.');
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(buyerGstin.trim().toUpperCase())) {
      return SweetAlert.error('Invalid GSTIN', `"${buyerGstin}" does not match Indian GSTIN format (e.g. 33AAGCP9427R1Z0).`);
    }

    const invalidItem = items.find(it => !it.description.trim() || it.quantity <= 0 || it.rate < 0);
    if (invalidItem) {
      return SweetAlert.error(
        'Incomplete Line Item', 
        'All line items must have a description, quantity > 0, and a valid rate.'
      );
    }

    const confirmed = await SweetAlert.confirm(
      'Generate Tax Invoice?',
      `Confirm creating invoice ${invoiceNo} for ${buyerName} totaling ₹${taxSummary.totalAmount.toLocaleString('en-IN')}?`,
      'Yes, Generate & Print'
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = {
        invoiceNo,
        financialYear,
        invoiceDate,
        showDrawingNo,
        showHsn,
        buyer: {
          name: buyerName.trim(),
          gstin: buyerGstin.trim().toUpperCase(),
          address: buyerAddress.trim(),
          stateCode: buyerStateCode.trim()
        },
        deliveryChallan: {
          dcNo: dcNo.trim(),
          dcDate: dcDate.trim(),
          jobOrderNo: jobOrderNo.trim()
        },
        items: items.map(it => ({
          drawingNo: showDrawingNo ? it.drawingNo : '',
          description: it.description,
          hsnCode: showHsn ? (it.hsnCode || '8445') : '',
          quantity: it.quantity,
          rate: it.rate,
          amount: it.amount
        }))
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        // Automatically add any newly entered products to MongoDB Atlas catalog
        let newAddedCount = 0;
        for (const item of items) {
          if (item.description.trim()) {
            const exists = isProductInCatalog(item.description, item.drawingNo);
            if (!exists) {
              try {
                const prodRes = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    description: item.description.trim(),
                    drawingNo: item.drawingNo.trim(),
                    hsnCode: item.hsnCode || '8445',
                    rate: item.rate,
                    unit: 'NOS'
                  })
                });
                const prodData = await prodRes.json();
                if (prodData.success) {
                  newAddedCount++;
                  setCatalog(prev => [...prev, prodData.product]);
                }
              } catch (e) {
                // skip individual failure
              }
            }
          }
        }

        if (newAddedCount > 0) {
          SweetAlert.toast(`${newAddedCount} new product(s) automatically saved to database!`, 'success');
        }

        await SweetAlert.success('Invoice Created Successfully!', `Invoice ${invoiceNo} is ready.`);
        router.push(`/invoices/${encodeURIComponent(invoiceNo)}`);
      } else {
        SweetAlert.error('Submission Failed', data.error || 'Server rejected the invoice payload.');
      }
    } catch (err: any) {
      SweetAlert.error('Network Error', err.message || 'Unable to connect to the billing server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmitInvoice} className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* ========================================================= */}
      {/* 1. TOP HEADER: CENTERED COMPANY PROFILE BANNER            */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-4 sm:p-8 rounded-2xl border border-slate-800 shadow-xl text-center flex flex-col items-center justify-center space-y-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] text-blue-400 font-bold uppercase tracking-wider bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/40">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Industrial GST Billing Terminal</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white uppercase break-words px-2">
          Abbai Micro Engineering
        </h1>

        <p className="text-[11px] sm:text-xs text-slate-300 max-w-xl text-center leading-relaxed px-2">
          34, Nethaji Street, Govinthanayganpalayam, Athipalayam Post, Coimbatore, Tamil Nadu, India - 641110
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 text-[11px] sm:text-xs">
          <span className="bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
            📞 +91 92451 09454, 94851 68373
          </span>
          <span className="bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
            ✉️ abbamicro@gmail.com
          </span>
          <span className="bg-emerald-950/80 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-lg border border-emerald-800/60">
            GSTIN: 33OKZPS6415J1Z2
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. INVOICE METADATA: NUMBER & DATE (EQUAL BALANCED SIZE)   */}
      {/* ========================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* Column 1: Invoice Number */}
          <div className="space-y-1.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between h-6">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">Invoice Number</span>
                {isAutoIncremented && !isEditingInvoiceNo && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                    Auto (GVK70+)
                  </span>
                )}
              </div>

              {/* Edit / Lock Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isEditingInvoiceNo;
                  setIsEditingInvoiceNo(nextState);
                  if (nextState) {
                    SweetAlert.toast('Invoice number unlocked: You can now edit.', 'info');
                  } else {
                    SweetAlert.toast('Invoice number locked (Non-edit mode).', 'success');
                  }
                }}
                className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all ${
                  isEditingInvoiceNo
                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
                title={isEditingInvoiceNo ? 'Lock invoice number (Non-editable)' : 'Make invoice number editable'}
              >
                {isEditingInvoiceNo ? (
                  <>
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Lock</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3 h-3 text-slate-500" />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={invoiceNo}
                readOnly={!isEditingInvoiceNo}
                onChange={(e) => {
                  setInvoiceNo(e.target.value);
                  setIsAutoIncremented(false);
                }}
                required
                className={`w-full h-11 border rounded-xl px-3.5 text-sm font-mono font-bold transition-all outline-none ${
                  isEditingInvoiceNo
                    ? 'bg-white border-amber-400 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:border-amber-500 shadow-sm'
                    : 'bg-slate-100/90 border-slate-300 text-blue-700 cursor-not-allowed select-all'
                }`}
                placeholder="AME 26/27 GVK70"
              />

              {!isEditingInvoiceNo && (
                <div className="absolute right-3.5 top-3 flex items-center space-x-1 text-[11px] text-slate-400 font-medium pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Locked</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 h-5">
              <span>{isEditingInvoiceNo ? '✏️ Editable mode' : '🔒 Auto-increment active'}</span>
              {!isAutoIncremented && (
                <button
                  type="button"
                  onClick={loadNextInvoiceNumber}
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold"
                  title="Reset to database auto-increment value"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Auto</span>
                </button>
              )}
            </div>
          </div>

          {/* Column 2: Invoice Date */}
          <div className="space-y-1.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between h-6">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Invoice Date</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                FY: {financialYear}
              </span>
            </div>

            <div className="relative">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 h-5">
              <span>Active Billing Cycle</span>
              <span className="text-emerald-700 font-bold">2026-27 Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BUYER & CHALLAN GRID (RESPONSIVE 2 COLUMNS)            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Bill To Card (Live Search from MongoDB Atlas) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">Bill To (Ordering Company)</span>
            </h2>
            {buyerName ? (
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
                <button
                  type="button"
                  onClick={handleClearBuyer}
                  className="text-[10px] text-slate-400 hover:text-red-600 px-1 font-bold"
                  title="Clear buyer info"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                Live MongoDB
              </span>
            )}
          </div>

          {/* Live Search & Autocomplete Input for Buyer */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Buyer Legal Name * (Type to search database)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type company name or GSTIN to search MongoDB live..."
                value={buyerName}
                onFocus={() => {
                  // Do not show suggestions on focus if not typed
                  setIsBuyerTyping(false);
                  setShowBuyerDropdown(false);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowBuyerDropdown(false);
                    setIsBuyerTyping(false);
                  }, 250);
                }}
                onChange={(e) => {
                  setBuyerName(e.target.value);
                  setBuyerSearchQuery(e.target.value);
                  setIsBuyerTyping(true);
                  setShowBuyerDropdown(true);
                }}
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-8"
              />
              {buyerName && (
                <button
                  type="button"
                  onClick={handleClearBuyer}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-0.5"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Buyer Dropdown: STRICTLY ONLY WHEN USER TYPES */}
            {showBuyerDropdown && isBuyerTyping && buyerSearchQuery.trim().length >= 1 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2.5 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase flex justify-between items-center">
                  <span className="flex items-center space-x-1.5">
                    <span>Buyers matching "{buyerSearchQuery}"</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                      {isSearchingBuyers ? 'Searching DB...' : 'MongoDB Live'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuyerDropdown(false);
                      setIsBuyerTyping(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                {buyerSuggestions.length > 0 ? (
                  buyerSuggestions.map((cust, cIdx) => (
                    <div
                      key={cIdx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCustomerRecord(cust);
                      }}
                      className="p-3 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                    >
                      <div className="space-y-0.5 pr-2">
                        <p className="font-bold text-slate-900 leading-snug">{cust.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{cust.address || 'Tamil Nadu'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold block">
                          {cust.gstin || 'UNREGISTERED'}
                        </span>
                        <span className="text-[9px] text-slate-400">State: {cust.stateCode || (cust.gstin ? cust.gstin.substring(0, 2) : '33')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 space-y-1">
                    <p>No matching registered buyers found in MongoDB.</p>
                    <p className="text-[11px] text-slate-500">You can continue typing to bill this customer as new.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Buyer GSTIN *</label>
              <input
                type="text"
                placeholder="33AAHFK6974G1Z3"
                value={buyerGstin}
                onChange={(e) => {
                  setBuyerGstin(e.target.value.toUpperCase());
                  if (e.target.value.length >= 2) setBuyerStateCode(e.target.value.substring(0, 2));
                }}
                required
                className="w-full font-mono uppercase border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State Code</label>
              <input
                type="text"
                value={buyerStateCode}
                onChange={(e) => setBuyerStateCode(e.target.value)}
                className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Billing & Delivery Address</label>
            <textarea
              rows={2}
              placeholder="64 POONGA NAGER VEERAPANDI..."
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Challan Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5 h-full flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Challan & Job Order Details</span>
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Your DC NO (Delivery Challan)</label>
            <input
              type="text"
              placeholder="e.g. 11026"
              value={dcNo}
              onChange={(e) => setDcNo(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">DC Date</label>
            <input
              type="text"
              placeholder="e.g. 22.10.2026"
              value={dcDate}
              onChange={(e) => setDcDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Job Order No</label>
            <input
              type="text"
              placeholder="e.g. JO-4491"
              value={jobOrderNo}
              onChange={(e) => setJobOrderNo(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. LINE ITEMS (RESPONSIVE MODERN MOBILE + DESKTOP)       */}
      {/* ========================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Line Items & Products</h2>
            <p className="text-xs text-slate-500">Search verified catalog or enter custom parts (auto-synced to MongoDB)</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* DRG NO Toggle */}
            <button
              type="button"
              onClick={() => setShowDrawingNo(!showDrawingNo)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                showDrawingNo
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
              title="Toggle Drawing Number (DRG NO) column"
            >
              {showDrawingNo ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              <span>DRG NO: {showDrawingNo ? 'Enabled' : 'Hidden'}</span>
            </button>

            {/* HSN Toggle */}
            <button
              type="button"
              onClick={() => setShowHsn(!showHsn)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                showHsn
                  ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
              title="Toggle HSN Code column"
            >
              {showHsn ? <CheckSquare className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              <span>HSN: {showHsn ? 'Enabled' : 'Hidden'}</span>
            </button>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItemRow}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        <div className="space-y-3.5">
          {items.map((item, index) => {
            const isCustomProduct = item.description.trim() && !isProductInCatalog(item.description, item.drawingNo);

            // Live matching products from MongoDB Atlas, with local catalog fallback
            const matchingProducts = (isTyping && searchQuery.trim().length >= 1)
              ? (dbSuggestions.length > 0 
                  ? dbSuggestions 
                  : catalog.filter(p => {
                      const desc = (p.description || '').toLowerCase();
                      const drg = (p.drawingNo || '').toLowerCase();
                      const q = searchQuery.toLowerCase().trim();
                      return desc.includes(q) || drg.includes(q);
                    }).slice(0, 10)
                )
              : [];

            return (
              <div 
                key={index} 
                className={`p-3.5 sm:p-4 bg-slate-50/80 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all space-y-3 relative ${
                  (activeItemSearchIndex === index || activeDrgSearchIndex === index) ? 'z-30 shadow-md ring-1 ring-blue-500/20' : 'z-10'
                }`}
              >
                {/* Description & Drawing No Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2.5">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <span className="w-8 h-9 rounded-xl bg-slate-200/90 text-slate-800 font-black text-xs flex items-center justify-center flex-shrink-0 border border-slate-300 shadow-sm">
                      #{index + 1}
                    </span>
                    {showDrawingNo && (
                      <div className="relative flex-1 sm:w-44 sm:flex-initial">
                        <input
                          type="text"
                          placeholder="DRG NO (Type to search)"
                          value={item.drawingNo}
                          onFocus={() => {
                            setActiveDrgSearchIndex(index);
                            setDrgSearchQuery('');
                            setIsTypingDrg(false); // DO NOT show suggestions until typed!
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveDrgSearchIndex(null);
                              setIsTypingDrg(false);
                            }, 250);
                          }}
                          onChange={(e) => {
                            handleItemChange(index, 'drawingNo', e.target.value);
                            setDrgSearchQuery(e.target.value);
                            setIsTypingDrg(true);
                            setActiveDrgSearchIndex(index);
                          }}
                          className="w-full h-9 border border-slate-300 rounded-xl px-3 text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />

                        {/* Live DRG NO Popup - STRICTLY ONLY WHEN USER TYPES */}
                        {activeDrgSearchIndex === index && isTypingDrg && drgSearchQuery.trim().length >= 1 && (
                          <div className="absolute left-0 top-full mt-1.5 w-[calc(100vw-3.5rem)] max-w-sm sm:w-80 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                            <div className="p-2.5 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase flex justify-between items-center">
                              <span className="flex items-center space-x-1.5">
                                <span>DRG "{drgSearchQuery}"</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                  {isSearchingDrg ? 'Searching DB...' : 'MongoDB Live'}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDrgSearchIndex(null);
                                  setIsTypingDrg(false);
                                }}
                                className="text-slate-400 hover:text-slate-700 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>

                            {drgSuggestions.length > 0 ? (
                              drgSuggestions.map((prod, dIdx) => (
                                <div
                                  key={dIdx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectProductFromDrg(index, prod);
                                  }}
                                  className="p-3 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                                >
                                  <div className="pr-2">
                                    <span className="font-mono text-blue-600 font-bold text-xs block">
                                      {prod.drawingNo || 'NO-DRG'}
                                    </span>
                                    <p className="font-medium text-slate-800 text-[11px] line-clamp-1">{prod.description}</p>
                                    <span className="text-[10px] text-slate-400">HSN: {prod.hsnCode}</span>
                                  </div>
                                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-xs flex-shrink-0">
                                    ₹{prod.rate}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400">
                                No drawing numbers matching "{drgSearchQuery}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product Description Input with Autocomplete (ONLY when typed) */}
                  <div className="flex-1 w-full relative">
                    <input
                      type="text"
                      placeholder="Type to search or enter new product description..."
                      value={item.description}
                      onFocus={() => {
                        setActiveItemSearchIndex(index);
                        setSearchQuery('');
                        setIsTyping(false); // DO NOT show suggestions on focus until typed!
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setActiveItemSearchIndex(null);
                          setIsTyping(false);
                        }, 250);
                      }}
                      onChange={(e) => {
                        handleItemChange(index, 'description', e.target.value);
                        setSearchQuery(e.target.value);
                        setIsTyping(true); // User actually typed -> show suggestions
                        setActiveItemSearchIndex(index);
                      }}
                      required
                      className="w-full h-9 border border-slate-300 rounded-xl px-3 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />

                    {/* Autocomplete Popup - STRICTLY ONLY WHEN USER TYPES */}
                    {activeItemSearchIndex === index && isTyping && searchQuery.trim().length >= 1 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                        <div className="p-2.5 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase flex justify-between items-center">
                          <span className="flex items-center space-x-1.5">
                            <span>Suggestions for "{searchQuery}"</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                              {isSearchingDb ? 'Searching DB...' : 'MongoDB Live'}
                            </span>
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setActiveItemSearchIndex(null);
                              setIsTyping(false);
                            }}
                            className="text-slate-400 hover:text-slate-700 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>

                        {matchingProducts.length > 0 ? (
                          matchingProducts.map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectProduct(index, prod);
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{prod.description}</p>
                                <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                  {prod.drawingNo && <span className="font-mono text-blue-600 font-semibold">{prod.drawingNo}</span>}
                                  <span>HSN: {prod.hsnCode}</span>
                                </div>
                              </div>
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-xs">
                                ₹{prod.rate}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center space-y-2">
                            <p className="text-xs text-slate-500">No matching catalog products found.</p>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSaveProductToDb(index);
                              }}
                              className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Add "{searchQuery}" to Database</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantitative Details Row (Aligned with matching heights & responsive columns) */}
                <div className={`grid gap-2.5 items-end pt-1 ${
                  showHsn ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-4'
                }`}>
                  {showHsn && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HSN Code</label>
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                        placeholder="8445"
                        className="w-full h-9 border border-slate-300 rounded-xl px-2.5 text-xs font-mono text-center bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full h-9 border border-slate-300 rounded-xl px-2.5 text-xs text-right font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-full h-9 border border-slate-300 rounded-xl px-2.5 text-xs text-right font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                    <div className="w-full h-9 bg-slate-100/90 border border-slate-200 rounded-xl px-2.5 text-xs text-right font-bold text-slate-900 flex items-center justify-end font-mono">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Actions: Save to DB & Delete */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end space-x-1.5 h-9">
                    {isCustomProduct && (
                      <button
                        type="button"
                        onClick={() => handleSaveProductToDb(index)}
                        disabled={savingProductId === index}
                        className="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
                        title="Save this product to MongoDB Atlas"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{savingProductId === index ? 'Saving...' : '+ Save to DB'}</span>
                        <span className="sm:hidden">{savingProductId === index ? 'Saving...' : '+ DB'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="h-9 px-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors flex items-center justify-center flex-shrink-0 active:scale-95"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. TAX SUMMARY & AMOUNT IN WORDS                          */}
      {/* ========================================================= */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="max-w-md space-y-2.5 w-full">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Chargeable (in words)</span>
          <p className="text-sm font-bold text-black bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-snug">
            {taxSummary.amountInWords}
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Bank: <strong>City Union Bank</strong> (A/C: 510909010164382, IFSC: CIUB0000410)</p>
            <p>• Cheques in favor of: <strong>"ABBAI MICRO ENGINEERING"</strong></p>
          </div>
        </div>

        {/* Financial Totals Breakdown */}
        <div className="w-full md:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Taxable Total:</span>
            <span>₹{taxSummary.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {taxSummary.cgstAmount > 0 && (
            <div className="flex justify-between text-slate-600 font-medium">
              <span>CGST (9%):</span>
              <span>₹{taxSummary.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {taxSummary.sgstAmount > 0 && (
            <div className="flex justify-between text-slate-600 font-medium">
              <span>SGST (9%):</span>
              <span>₹{taxSummary.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {taxSummary.igstAmount > 0 && (
            <div className="flex justify-between text-slate-600 font-medium">
              <span>IGST (18%):</span>
              <span>₹{taxSummary.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {taxSummary.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Round Off:</span>
              <span>₹{taxSummary.roundOff.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-sm text-slate-900">
            <span>Total Payable:</span>
            <span className="text-blue-600 font-mono text-base">
              ₹{taxSummary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. GENERATE & PRINT BUTTON (AT THE VERY BOTTOM)           */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/invoices')}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
        >
          Cancel & Return
        </button>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          <span>{saving ? 'Creating & Saving...' : 'Generate & Print Invoice'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
