import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBuyer extends Document {
  name: string;
  gstin: string;
  address: string;
  stateCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const BuyerSchema = new Schema<IBuyer>({
  name: { type: String, required: true, index: true },
  gstin: { 
    type: String, 
    required: true, 
    uppercase: true, 
    index: true 
  },
  address: { type: String, required: true },
  stateCode: { type: String, default: '33' }
}, {
  timestamps: true
});

export const Buyer: Model<IBuyer> = (mongoose.models.Buyer as Model<IBuyer>) || mongoose.model<IBuyer>('Buyer', BuyerSchema);
