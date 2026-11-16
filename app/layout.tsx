import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { 
  FileText, 
  PlusCircle, 
  Users, 
  Package,
  Layers
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Abbai Micro Engineering - Billing Terminal',
  description: 'Industrial GST Billing System for Abbai Micro Engineering',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
        {/* Top Navbar */}
        <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 sticky top-0 z-50 shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Info */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center font-black text-white text-base shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                AME
              </div>
              <div className="truncate">
                <span className="font-extrabold text-base sm:text-lg tracking-tight group-hover:text-blue-400 transition-colors block leading-tight">
                  ABBAI MICRO ENGINEERING
                </span>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 leading-none mt-1">
                  <span className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">GST: 33OKZPS6415J1Z2</span>
                  <span className="hidden sm:inline">• Coimbatore</span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links (hidden on mobile) */}
            <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2">
              <Link 
                href="/" 
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Invoice</span>
              </Link>
              <Link 
                href="/invoices" 
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all flex items-center space-x-1.5"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Invoices</span>
              </Link>
              <Link 
                href="/customers" 
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all flex items-center space-x-1.5"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Customers</span>
              </Link>
              <Link 
                href="/products" 
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all flex items-center space-x-1.5"
              >
                <Package className="w-4 h-4 text-slate-400" />
                <span>Products</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-50 flex items-center justify-around py-2 px-1 text-slate-400 no-print shadow-2xl">
          <Link 
            href="/" 
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-blue-400 hover:text-blue-300 active:scale-95 transition-all text-[11px] font-semibold"
          >
            <PlusCircle className="w-5 h-5 mb-0.5" />
            <span>New Bill</span>
          </Link>
          <Link 
            href="/invoices" 
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg hover:text-white active:scale-95 transition-all text-[11px] font-medium"
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Invoices</span>
          </Link>
          <Link 
            href="/customers" 
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg hover:text-white active:scale-95 transition-all text-[11px] font-medium"
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Buyers</span>
          </Link>
          <Link 
            href="/products" 
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg hover:text-white active:scale-95 transition-all text-[11px] font-medium"
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span>Catalog</span>
          </Link>
        </nav>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          <p>© 2026 Abbai Micro Engineering • City Union Bank A/C: 510909010164382 • IFSC: CIUB0000410</p>
        </footer>
      </body>
    </html>
  );
}
