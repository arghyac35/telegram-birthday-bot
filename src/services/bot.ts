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
    sendMessage(ctx, ctx.message, 'Hi, there how are you?.', -1).catch(logger.error);
  });

  bot.hears(/^[/|.](help|h)$/i, async (ctx) => {
    const text = `
      <b>Command ｜ Description</b>
      Comming soon...
      `;
    sendMessage(ctx, ctx.message, text, 60000).catch(logger.error);
  });

  bot.hears(/^[/|.](myBirthday|mb) (.+)/i, async (ctx) => {

    let res: any;
    try {
      res = await birthdayServiceInstance.addBirthday(ctx.match[2], ctx.message.from.id, ctx.message.chat.id);
      await sendMessage(ctx, ctx.message, res, -1);
    } catch (error) {
      sendMessage(ctx, ctx.message, error.message, -1).catch(logger.error);
    }
  });
}


function isSudoUser(msg: any): number {
  if (SUDO_USERS.some(d => d === msg.from.id)) {
    return 0;
  }
  return -1;
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
