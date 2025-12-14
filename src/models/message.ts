import { Schema, model, Document, Types } from 'mongoose';

export interface MessageDocument extends Document {
  account: Types.ObjectId;
  chatId: string;
  messageId: number;
  text?: string;
  fromId?: string;
  date: Date;
  raw: any;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    chatId: { type: String, required: true },
    messageId: { type: Number, required: true },
    text: { type: String },
    fromId: { type: String },
    date: { type: Date, required: true },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

MessageSchema.index({ account: 1, chatId: 1, messageId: 1 }, { unique: true });

export const MessageModel = model<MessageDocument>('Message', MessageSchema);
