
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
