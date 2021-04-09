import { Service, Inject } from 'typedi';
import { Telegraf } from 'telegraf'
import moment from 'moment';

@Service()
export default class BirthdayService {
  constructor(
    @Inject('tgBot') private bot: Telegraf,
    @Inject('birthdayModel') private birthdayModel: Models.BirthdayModel,
    @Inject('logger') private logger
  ) { }

  public async addBirthday(inputDate: string, tgUserId: number, tgChatId: number): Promise<string> {
    inputDate = inputDate.trim();

    this.logger.debug('Provided inputDate: %s', inputDate);

    const arrInpDate = inputDate.split('-');
    let arrSize = arrInpDate.length;
    let momentInputDate: moment.Moment;
    let returnMessage = '';

    if (arrSize === 2) {
      momentInputDate = moment(inputDate, 'DD-MM');
    } else if (arrSize === 3) {
      momentInputDate = moment(inputDate, 'DD-MM-YYYY');
    } else {
      throw new Error('Invalid date.')
    }

    this.logger.debug('momentInputDate: %s', momentInputDate);
    if (momentInputDate.isValid()) {
      this.logger.debug('Date is valid, procedding with db operation.');

      // await this.birthdayModel.updateOne({ tgUserId }, { $set: { birthDate: momentInputDate.toDate() } }, { upsert: true });
      const recordExists = await this.birthdayModel.findOne({ tgUserId });
      if (recordExists) {
        recordExists.birthDate = momentInputDate.toDate();
        await recordExists.save();
        returnMessage = `Your birthday has been updated. Now I will wish you on: ${momentInputDate.format('Do MMMM')}`
      } else {
        await this.birthdayModel.create({ tgUserId, tgChatId, birthDate: momentInputDate.toDate() });
        returnMessage = `Hurray your birthday is saved!! I will wish you on: ${momentInputDate.format('Do MMMM')}`
      }
    } else {
      throw new Error(`MomentJs Cannot parse given date: ${inputDate}`);
    }

    return returnMessage;
  }
}
