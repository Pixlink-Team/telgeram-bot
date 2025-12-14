import { Schema, model, Document } from 'mongoose';

export interface AccountDocument extends Document {
  phone: string;
  session: string;
  apiId: number;
  apiHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<AccountDocument>(
  {
    phone: { type: String, required: true, unique: true },
    session: { type: String, required: true },
    apiId: { type: Number, required: true },
    apiHash: { type: String, required: true },
  },
  { timestamps: true },
);

export const AccountModel = model<AccountDocument>('Account', AccountSchema);
