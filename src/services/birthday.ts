import { Service, Inject } from 'typedi';
import { Telegraf } from 'telegraf'
import moment from 'moment';
import { IBirthday } from '../interfaces/IBirthday';
import _ from 'lodash';

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
      momentInputDate = moment.utc(inputDate, 'DD-MM');
    } else if (arrSize === 3) {
      momentInputDate = moment.utc(inputDate, 'DD-MM-YYYY');
    } else {
      throw new Error('Invalid date.')
    }

    this.logger.debug('momentInputDate: %s', momentInputDate);
    if (momentInputDate.isValid()) {
      this.logger.debug('Date is valid, procedding with db operation.');

      const recordExists = await this.birthdayModel.findOne({ tgUserId, tgChatId });
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

  public async listBirthdays(tgChatId: number): Promise<string> {
    const list = await this.birthdayModel.find({ tgChatId }).sort({ birthDate: 1 });

    // group the birthdays by month
    let groupbyMonth = _.groupBy(list, (result) => moment(result.birthDate).month());

    let message = '';

    if (Object.keys(groupbyMonth).length > 0) {
      for (const key in groupbyMonth) {
        if (Object.prototype.hasOwnProperty.call(groupbyMonth, key)) {
          const arrBirthdays = groupbyMonth[key];

          // get the month by moment month number
          message += `${moment().month(key).format("MMMM")}:\n`;

          await this.asyncForEach(arrBirthdays, async (birthday) => {
            const chatMember = await this.bot.telegram.getChatMember(birthday.tgChatId, birthday.tgUserId);
            const memeberFirstName = chatMember.user.first_name;
            message += `${moment(birthday.birthDate).format('Do')} - ${memeberFirstName}\n`;
          });

          message += '\n';
        }
      }
    } else { message = 'No birthdays saved for this chat.' }

    return message;
  }

  public async getTodaysList(tgChatId?: number | string): Promise<IBirthday[]> {
    const currentDate = new Date();
    this.logger.silly('Current date--> %s', currentDate);
    // Fetch todays birthday by date and month
    const aggregate: any = [{
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: '$birthDate' }, { $dayOfMonth: currentDate }] },
            { $eq: [{ $month: '$birthDate' }, { $month: currentDate }] },
          ],
        },
      }
    }];

    if (tgChatId) {
      aggregate.push({
        $match: { tgChatId }
      });
    }

    return await this.birthdayModel.aggregate(aggregate);
  }

  public async getCurrentBdayByChat(tgChatId: number | string): Promise<string> {
    const birthdays = await this.getTodaysList(tgChatId);
    let message = '';
    if (birthdays.length > 0) {
      message = 'Today\'s birthday list:\n'
      await this.asyncForEach(birthdays, async birthday => {
        const chatMember = await this.bot.telegram.getChatMember(tgChatId, birthday.tgUserId);
        message += `${chatMember.user.first_name} ${chatMember.user.last_name}\n`;
      });
    } else message = 'No one have birthday today.';

    return message;
  }

  public async sendTodaysBdayMessage(): Promise<void> {
    // Fetch todays birthday by date and month
    const data = await this.getTodaysList();

    this.logger.silly('bday list--> %j', data);

    // Seperate the unique chatIds and send a single bday message to those chats
    const uniqueChatids = [...new Set(data.map(item => item.tgChatId))];

    await this.asyncForEach(uniqueChatids, async (chatId) => {

      const chatSpecificBirthdays = data.filter(birthday => birthday.tgChatId === chatId);

      if (chatSpecificBirthdays.length > 0) {
        let message = 'Wish you a very happy birthday ';

        // Construct the birthday message for each user
        await this.asyncForEach(chatSpecificBirthdays, async (birthday) => {
          const chatMember = await this.bot.telegram.getChatMember(chatId, birthday.tgUserId);
          const memberUsername = chatMember.user.username;
          const memberName = chatMember.user.first_name + ' ' + chatMember.user.last_name;

          if (memberUsername) {
            message += `@${memberUsername}`;
          } else if (memberName) {
            message += `${memberName}`;
          } else {
            message += `${birthday.tgUserId}`;
          }
          message += ', ';
        })
        // Remove the last comma and space
        message = message.slice(0, -2);

        this.bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
        }).then((ctx) => {
          this.logger.info('Message sent to chat: %s', ctx.chat.id);
          this.bot.telegram.pinChatMessage(ctx.chat.id, ctx.message_id, { disable_notification: true }).catch(error => {
            this.logger.error(`Error pinning message to chat: ${ctx.chat.id} %o`, error.message);
          });
        }
        ).catch(error => {
          this.logger.error(`Error sending message to chat: ${chatId} %o`, error);
        });
      } else {
        this.logger.info(`There are no birthdays for chat: ${chatId}`);
      }
    });
  }

  public async deleteBirthday(tgChatId: number, tgUserId: any): Promise<string> {
    tgUserId = tgUserId.trim();
    const del = await this.birthdayModel.deleteOne({ tgChatId, tgUserId });
    let message = ''
    if (del.ok) {
      const chatMember = await this.bot.telegram.getChatMember(tgChatId, tgUserId);
      message = `Birthday for user: ${chatMember.user.first_name} removed`;
    } else {
      message = 'Cannot delete, birthday for the specified user is not saved.'
    }

    return message;
  }

  async asyncForEach(array: any[], callback: (value: any, index: number, array: any[]) => any) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
}
