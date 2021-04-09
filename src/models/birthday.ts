import { IBirthday } from '../interfaces/IBirthday';
import mongoose from 'mongoose';
var Schema = mongoose.Schema;

const birthday = new Schema(
  {
    birthDate: {
      type: Date,
      require: true
    },
    tgUserId: {
      type: Number,
      require: true
    }
  },
  { timestamps: true },
);

export default mongoose.model<IBirthday & mongoose.Document>('birthday', birthday);
