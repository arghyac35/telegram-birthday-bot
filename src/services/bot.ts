import { Container } from "typedi";
import { Telegraf, Context } from 'telegraf'
import { Logger } from 'winston';
import config from "../config";
import BirthdayService from "./birthday";

const SUDO_USERS = config.sudoUsers ? config.sudoUsers.split(',').map(userId => Number(userId)) : [];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default () => {
  const bot = Container.get('tgBot') as Telegraf<Context>;
  const birthdayServiceInstance = Container.get(BirthdayService);
  const logger: Logger = Container.get('logger');

  bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    sendMessage(ctx, ctx.message, 'Hi, there how are you?.', -1).catch(logger.error);
  });

  bot.help(async (ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    const text = `<b>Command ｜ Description</b>\n<code>/myBirthday </code>DD-MM-YYYY, you can also give it without year as DD-MM\n<code>/listBirthdays</code> - shows all the saved birthdays group by month\n<code>/currentBirthday</code> - Shows today's birthday\n<code>/deleteBirthday </code>userid - Delete birthday for an user using tg user id not username, this is only for admins.`;
    sendMessage(ctx, ctx.message, text, -1).catch(logger.error);
  });

  bot.hears(/^[/|.](myBirthday|mb) (.+)/i, async (ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    let res: any;
    try {
      res = await birthdayServiceInstance.addBirthday(ctx.match[2], ctx.message.from.id, ctx.message.chat.id);
      await sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      sendMessage(ctx, ctx.message, error.message, -1).catch(logger.error);
    }
  });

  bot.hears(/^[/|.](listBirthdays|lb)$/i, async (ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    let res = '';
    try {
      res = await birthdayServiceInstance.listBirthdays(ctx.message.chat.id);
      await sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      sendMessage(ctx, ctx.message, error.message, -1).catch(logger.error);
    }
  });

  bot.hears(/^[/|.](currentBirthday|cb)$/i, async (ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    let res = '';
    try {
      res = await birthdayServiceInstance.getCurrentBdayByChat(ctx.message.chat.id);
      await sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      sendMessage(ctx, ctx.message, error.message, -1).catch(logger.error);
    }
  });

  bot.hears(/^[/|.](deleteBirthday|db) (.+)/i, async (ctx) => {
    if (ctx.chat.type === 'private') {
      sendMessage(ctx, ctx.message, 'I am not made to be used in private chats.', -1).catch(logger.error);
      return;
    }
    let res = '';
    try {
      const chatAdmins = await ctx.getChatAdministrators();

      const isAdmin = chatAdmins.some(admin => admin.user.id === ctx.message.from.id);
      if (isAdmin) {
        res = await birthdayServiceInstance.deleteBirthday(ctx.message.chat.id, ctx.match[2]);
      } else {
        res = 'This command can only be executed by admin.'
      }
      await sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      sendMessage(ctx, ctx.message, error.message, -1).catch(logger.error);
    }
  });
}

async function sendMessage(bot: Context, msg, text: string, delay?: number, quickDeleteOriginal?: boolean) {
  if (!delay) delay = 10000;
  return new Promise((resolve, reject) => {
    bot.telegram.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
      .then((res) => {
        if (delay > -1) {
          deleteMsg(bot, res, delay);
          if (quickDeleteOriginal) {
            deleteMsg(bot, msg);
          } else {
            deleteMsg(bot, msg, delay);
          }
        }
        resolve(res);
      })
      .catch((err) => {
        console.error(`sendMessage error: ${err.message}`);
        reject(err);
      });
  });
}

async function deleteMsg(bot: Context, msg, delay?: number): Promise<any> {
  if (delay) await sleep(delay);

  bot.telegram.deleteMessage(msg.chat.id, msg.message_id.toString())
    .catch(err => {
      console.log(`Failed to delete message. Does the bot have message delete permissions for this chat? ${err.message}`);
    });
}
