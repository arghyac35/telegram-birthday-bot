import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import config from '../../config';
import { Telegraf } from 'telegraf'
import BirthdayService from '../../services/birthday';

const route = Router();

export default (app: Router) => {
  app.use('/botUpdates', route);

  route.post(`/${config.tgBotToken}`, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling botUpdates endpoint')
    try {
      const bot = Container.get('tgBot') as Telegraf;

      return bot.handleUpdate(req.body, res)

    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });


  route.get(`/getTodaysBirthday/${config.tgBotToken}`, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling getTodaysClass endpoint')
    try {
      const birthdayServiceInstance = Container.get(BirthdayService);
      await birthdayServiceInstance.getTodaysList();
      res.sendStatus(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
