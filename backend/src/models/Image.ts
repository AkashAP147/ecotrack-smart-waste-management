import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  buffer: Buffer;
  contentType: string;
}

const imageSchema = new Schema<IImage>({
  buffer: {
    type: Buffer,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
});

export default mongoose.model<IImage>('Image', imageSchema);
