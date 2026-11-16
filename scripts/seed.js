const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Helper to automatically parse .env or .env.local without external dependencies
function loadEnvFile() {
  const envCandidates = ['.env.local', '.env'];
  for (const envFile of envCandidates) {
    const fullPath = path.join(__dirname, '..', envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnvFile();

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
const exportsDir = path.join(__dirname, '..', 'data-exports');

const BuyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstin: { type: String, required: true },
  address: { type: String, required: true },
  stateCode: { type: String, default: '33' }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  drawingNo: { type: String, default: '' },
  description: { type: String, required: true },
  hsnCode: { type: String, required: true, default: '8445' },
  rate: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'NOS' },
  frequentBuyers: [{ type: String }]
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  financialYear: { type: String, default: '2026-27' },
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  invoiceType: { type: String, default: 'WITH_MATERIALS' },
  buyer: {
    name: { type: String, required: true },
    gstin: { type: String, required: true },
    address: { type: String, required: true },
    stateCode: { type: String, default: '33' }
  },
  deliveryChallan: {
    dcNo: { type: String, default: '' },
    dcDate: { type: String, default: '' },
    jobOrderNo: { type: String, default: '' }
  },
  items: [{
    itemNumber: Number,
    drawingNo: String,
    description: String,
    hsnCode: String,
    quantity: Number,
    rate: Number,
    amount: Number
  }],
  taxableAmount: Number,
  cgstRate: Number,
  cgstAmount: Number,
  sgstRate: Number,
  sgstAmount: Number,
  igstRate: Number,
  igstAmount: Number,
  roundOff: Number,
  totalAmount: Number,
  amountInWords: String,
  paymentStatus: { type: String, default: 'UNPAID' }
}, { timestamps: true });

const Buyer = mongoose.models.Buyer || mongoose.model('Buyer', BuyerSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

async function runSeed() {
  if (!MONGODB_URI) {
    console.error('\n❌ ERROR: MONGODB_URI is undefined.');
    console.error('Please make sure .env or .env.local contains your connection string:');
    console.error('  MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/abbai_billing?..."\n');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'abbai_billing'
    });
    console.log('✅ Connected to MongoDB Atlas successfully (Database: abbai_billing).');

    // 1. Seed Buyers (only name, address, gstin, stateCode)
    const customersFile = path.join(exportsDir, 'customers.json');
    if (fs.existsSync(customersFile)) {
      const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
      await Buyer.deleteMany({});
      const insertedBuyers = await Buyer.insertMany(customers);
      console.log(`✅ Seeded ${insertedBuyers.length} buyers/customers (name, address, gstin).`);
    }

    // 2. Seed Unified Products
    const productsFile = path.join(exportsDir, 'products.json');
    if (fs.existsSync(productsFile)) {
      const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
      await Product.deleteMany({});
      const insertedProducts = await Product.insertMany(products);
      console.log(`✅ Seeded ${insertedProducts.length} products (single unified category).`);
    }

    // 3. Clear Invoices (Clean slate, 0 invoices)
    await Invoice.deleteMany({});
    console.log('✅ Invoices collection reset to 0 (clean slate for new bills).');

    console.log('\n🎉 MongoDB Atlas seeding completed successfully!');
  } catch (err) {
    console.error('\n❌ Error seeding database:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
