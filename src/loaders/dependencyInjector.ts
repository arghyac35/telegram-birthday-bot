import { Container } from 'typedi';
import LoggerInstance from './logger';
import config from '../config';
import { Telegraf } from 'telegraf'
import bothandler from '../services/bot'

export default async ({ models }: { models: { name: string; model: any }[] }): Promise<any> => {
  try {
    if (config.tgBotToken === undefined) {
      throw new Error('BOT_TOKEN must be provided!')
    }

    models.forEach(m => {
      Container.set(m.name, m.model);
    });

    const bot = new Telegraf(config.tgBotToken);
    Container.set('tgBot', bot);
    Container.set('logger', LoggerInstance);

    bothandler();

  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
