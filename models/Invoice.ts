import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoiceItem {
  itemNumber: number;
  drawingNo?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IInvoice extends Document {
  invoiceNo: string;
  financialYear: string;
  invoiceDate: Date;
  dueDate: Date;
  showDrawingNo: boolean;
  showHsn: boolean;
  buyer: {
    buyerId?: mongoose.Types.ObjectId;
    name: string;
    gstin: string;
    address: string;
    stateCode: string;
  };
  deliveryChallan?: {
    dcNo?: string;
    dcDate?: string;
    jobOrderNo?: string;
  };
  items: IInvoiceItem[];
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  roundOff: number;
  totalAmount: number;
  amountInWords: string;
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID';
  amountPaid: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNo: { type: String, required: true, unique: true, index: true },
  financialYear: { type: String, default: '2026-27' },
  invoiceDate: { type: Date, required: true, default: Date.now, index: true },
  dueDate: { type: Date, required: true },
  showDrawingNo: { type: Boolean, default: true },
  showHsn: { type: Boolean, default: true },
  buyer: {
    buyerId: { type: Schema.Types.ObjectId, ref: 'Buyer' },
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
    itemNumber: { type: Number, required: true },
    drawingNo: { type: String, default: '' },
    description: { type: String, required: true },
    hsnCode: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0.01 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true }
  }],
  taxableAmount: { type: Number, required: true },
  cgstRate: { type: Number, default: 9 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 9 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountInWords: { type: String, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['UNPAID', 'PAID', 'PARTIALLY_PAID'], 
    default: 'UNPAID',
    index: true 
  },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export const Invoice: Model<IInvoice> = (mongoose.models.Invoice as Model<IInvoice>) || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
