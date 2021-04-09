import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import mongooseLoader from './mongoose';
import Logger from './logger';

export default async ({ expressApp }) => {

  await mongooseLoader();
  Logger.info('✌️ DB loaded and connected!');

  const birthdayModel = {
    name: 'birthdayModel',
    model: require('../models/birthday').default,
  };

  await dependencyInjectorLoader({
    models: [
      birthdayModel
    ],
  });
  Logger.info('✌️ Dependency Injector loaded');

  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');
};
