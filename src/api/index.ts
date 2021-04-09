import { Router } from 'express';
import tgBotUpdates from './routes/tgBotUpdates'

// guaranteed to get dependencies
export default () => {
  const app = Router();
  tgBotUpdates(app)

  return app
}
