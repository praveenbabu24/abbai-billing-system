# Abbai Micro Engineering — GST Billing System

A specialized, fast GST Tax Invoicing & Drawing Parts Billing Platform built with **Next.js**, **MongoDB Atlas (Mongoose)**, **Tailwind CSS**, and **SweetAlert2** (`sweetalert2`), pre-loaded with **47 verified B2B corporate buyers** and **1,062 verified engineering products & drawings** extracted and cleaned from Abbai Micro Engineering's invoice workbook (`ABBAI_MICRO_ENGINEERING_(1).xlsm`).

---

## 📁 Master Datasets (`./data-exports/`)

| File | Content | Records |
| :--- | :--- | :---: |
| **`company_profile.json`** | Abbai Micro Engineering profile, GSTIN (`33OKZPS6415J1Z2`), City Union Bank A/C & IFSC | 1 Master Profile |
| **`customers.json`** | Verified ordering companies with Company Name, Registered Address, and GSTIN | 47 Companies |
| **`products.json`** | Verified engineering products with valid standard rates (> 0), drawing numbers (`DRG NO`), and HSN codes | 1,062 Products |
| **`products_backup_before_clean.json`** | Complete raw pre-clean backup archive | 1,897 Products |

---

## ⚡ Quick Start

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment
In `.env` or `.env.local`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/abbai_billing?retryWrites=true&w=majority"
```

### Step 3: Start Application
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Key Features

- **Tax Invoice Terminal (`/`)**:
  - Auto-incrementing Invoice Numbers starting from `GVK70` (`AME 26/27 GVK70+`) with edit/lock toggle.
  - Symmetrical, equal-sized Invoice Number and Date configuration.
  - DRG NO and HSN switches logically placed right in the Line Items header.
  - Automatic detection of existing products to prevent duplicate "+ Save to DB".
  - Full Indian GST computation (CGST 9% + SGST 9% / IGST 18%) with auto Indian words conversion.
  - Automatic database sync for newly typed custom parts.

- **Exact 1:1 Official Tax Invoice (`/invoices/[id]`)**:
  - Exact replica of physical Abbai Micro Engineering bill with brand green (`#00B050`) and square outer border.
  - Fully responsive on mobile with zero horizontal scrollbar.
  - Calibrated print layout fitting **strictly on 1 single A4 page**.

- **Universal Case-Insensitive Search**:
  - Multi-token case-insensitive searches across products, drawings, customers, and invoices.

- **Directories & Live Sync**:
  - Live synced Buyer Directory (`/customers`) with pagination.
  - Verified Product & Drawing Catalog (`/products`) with pagination.
