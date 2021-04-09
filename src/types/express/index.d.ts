import { Document, Model } from 'mongoose';
import { IBirthday } from '../../interfaces/IBirthday';

declare global {
  namespace Models {
    export type BirthdayModel = Model<IBirthday & Document>;
  }
}
