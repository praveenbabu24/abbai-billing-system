import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  drawingNo: string;
  description: string;
  hsnCode: string;
  rate: number;
  unit: string;
  frequentBuyers?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  drawingNo: { type: String, default: '', index: true },
  description: { type: String, required: true, index: 'text' },
  hsnCode: { type: String, required: true, default: '8445', index: true },
  rate: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'NOS' },
  frequentBuyers: [{ type: String }]
}, {
  timestamps: true
});

export const Product: Model<IProduct> = (mongoose.models.Product as Model<IProduct>) || mongoose.model<IProduct>('Product', ProductSchema);
