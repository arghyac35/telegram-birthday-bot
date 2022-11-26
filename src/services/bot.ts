import { Container, Inject } from 'typedi';
import { Telegraf, Context } from 'telegraf';
import { Logger } from 'winston';
import config from '../config';
import BirthdayService from './birthday';

const SUDO_USERS = config.sudoUsers ? config.sudoUsers.split(',').map((userId) => Number(userId)) : [];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class BotService {
  private birthdayServiceInstance: BirthdayService;
  private logger = Container.get<Logger>('logger');
  private bot = Container.get<Telegraf<Context>>('tgBot');

  constructor() {
    this.birthdayServiceInstance = Container.get<BirthdayService>(BirthdayService);
    this.bot.start((ctx) => {
      this.sendMessage(ctx, ctx.message, 'Hi, there how are you?.', -1).catch(this.logger.error);
    });

    this.bot.help(async (ctx) => {
      const text = `<b>Command ｜ Description</b>\n<code>/myBirthday </code>DD-MM-YYYY, you can also give it without year as DD-MM\n<code>/listBirthdays</code> - shows all the saved birthdays group by month\n<code>/currentBirthday</code> - Shows today's birthday\n<code>/deleteBirthday </code>userid - Delete birthday for an user using tg user id not username, this is only for admins.\n<code>/setBirthday </code>DD-MM-YYYY name - Set the birthday for anyone using name. This is meant to be used in private chat mainly, where we can save our firends bday and get reminders.`;
      this.sendMessage(ctx, ctx.message, text, -1).catch(this.logger.error);
    });

    this.bot.on('text', async (ctx) => {
      let text = ctx.message.text.trim();
      if (text === '@' + ctx.botInfo.username) {
        this.sendMessage(
          ctx,
          ctx.message,
          'Hello, How are you today? Please use /help command to learn more about me.',
          -1,
        ).catch(this.logger.error);
        return;
      } else if (!text.startsWith('.') && !text.startsWith('/')) {
        return;
      }
      // Check if commands consists this bots username
      let arrtext = text.split('@');
      let isCommandForCurrentBot = false;
      if (arrtext.length > 1) {
        const username = arrtext[1].split(' ')[0];
        if (username === ctx.botInfo.username) {
          // Remove the username so that it behvaes as normal command
          text = text.replace('@' + ctx.botInfo.username, '');
          isCommandForCurrentBot = true;
        } else {
          // Donot do anything when the command consists username of someother bot
          return;
        }
      }

      arrtext = text.split(' ');
      const command = arrtext[0].toLowerCase().slice(1);
      const param = arrtext[1];
      switch (command) {
        case 'mb':
        case 'mybirthday':
          if (!param) {
            return await this.sendMessage(ctx, ctx.message, 'Please provide your birthday...', 10000);
          }
          this.myBirthday(ctx, param);
          break;
        case 'sb':
        case 'setbirthday':
          if (arrtext.length < 2) {
            return await this.sendMessage(ctx, ctx.message, 'Please provide valid parameters', 10000);
          }
          this.setBirthday(ctx, param, arrtext[2]);
          break;
        case 'lb':
        case 'listbirthdays':
          this.listBirthdays(ctx);
          break;
        case 'cb':
        case 'currentbirthday':
          this.currentBirthday(ctx);
          break;
        case 'db':
        case 'deletebirthday':
          if (!param) {
            return await this.sendMessage(ctx, ctx.message, 'Please provide userid of tg..', 10000);
          }
          this.deleteBirthday(ctx, param);
          break;
        default:
          if (isCommandForCurrentBot) {
            await this.sendMessage(ctx, ctx.message, 'Not a valid command for this bot', 10000);
          }
          break;
      }
    });
  }

  private async myBirthday(ctx: Context, param: string) {
    let res: any;
    try {
      res = await this.birthdayServiceInstance.addBirthday(param, ctx.message.chat.id, ctx.message.from.id);
      await this.sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      this.logger.error('error: myBirthday: %o', error);
      this.sendMessage(ctx, ctx.message, error.message, -1).catch(this.logger.error);
    }
  }

  private async setBirthday(ctx: Context, birthday: string, name: string) {
    let res: any;
    try {
      res = await this.birthdayServiceInstance.addBirthday(birthday, ctx.message.chat.id, null, name);
      await this.sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      this.logger.error('error: setBirthday: %o', error);
      this.sendMessage(ctx, ctx.message, error.message, -1).catch(this.logger.error);
    }
  }

  private async listBirthdays(ctx: Context) {
    let res = '';
    try {
      res = await this.birthdayServiceInstance.listBirthdays(ctx.message.chat.id, ctx.chat.type === 'private');
      await this.sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      this.logger.error('error: listBirthdays: %o', error);
      this.sendMessage(ctx, ctx.message, error.message, -1).catch(this.logger.error);
    }
  }

  private async currentBirthday(ctx: Context) {
    let res = '';
    try {
      res = await this.birthdayServiceInstance.getCurrentBdayByChat(ctx.message.chat.id);
      await this.sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      this.logger.error('error: currentBirthday: %o', error);
      this.sendMessage(ctx, ctx.message, error.message, -1).catch(this.logger.error);
    }
  }

  private async deleteBirthday(ctx: Context, param: string) {
    let res = '';
    try {
      if (ctx.chat.type === 'private') {
        res = await this.birthdayServiceInstance.deleteBirthday(ctx.message.chat.id, param);
      } else {
        const chatAdmins = await ctx.getChatAdministrators();

        const isAdmin = chatAdmins.some((admin) => admin.user.id === ctx.message.from.id);
        if (isAdmin) {
          res = await this.birthdayServiceInstance.deleteBirthday(ctx.message.chat.id, param);
        } else {
          res = 'This command can only be executed by admin.';
        }
      }
      await this.sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      this.logger.error('error: deleteBirthday: %o', error);
      this.sendMessage(ctx, ctx.message, error.message, -1).catch(this.logger.error);
    }
  }

  private async sendMessage(bot: Context, msg, text: string, delay?: number, quickDeleteOriginal?: boolean) {
    if (!delay) delay = 10000;
    return new Promise((resolve, reject) => {
      this.bot.telegram
        .sendMessage(msg.chat.id, text, {
          reply_to_message_id: msg.message_id,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        })
        .then((res) => {
          if (delay > -1) {
            this.deleteMsg(bot, res, delay);
            if (quickDeleteOriginal) {
              this.deleteMsg(bot, msg);
            } else {
              this.deleteMsg(bot, msg, delay);
            }
          }
          resolve(res);
        })
        .catch((err) => {
          this.logger.error('error: sendMessage: %o', err);
          reject(err);
        });
    });
  }

  private async deleteMsg(bot: Context, msg, delay?: number): Promise<any> {
    if (delay) await sleep(delay);

    this.bot.telegram.deleteMessage(msg.chat.id, msg.message_id.toString()).catch((err) => {
      this.logger.error(
        'Failed to delete message. Does the bot have message delete permissions for this chat? %o',
        err,
      );
    });
  }
}
