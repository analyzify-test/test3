/**
 * Application entry point
 */

export { UserService } from './services/userService';
export { OrderService } from './services/orderService';
export { DatabaseClient } from './db/client';
export { Logger, defaultLogger } from './utils/logger';
export * from './types/user';
export * from './types/order';

import { DatabaseClient } from './db/client';
import { Logger } from './utils/logger';
import { UserService } from './services/userService';
import { OrderService } from './services/orderService';

export interface AppConfig {
  databaseUrl: string;
  logLevel?: string;
}

/**
 * Initializes the application with all services
 */
export async function initializeApp(config: AppConfig) {
  const logger = new Logger('app');
  const db = new DatabaseClient(config.databaseUrl);

  await db.connect();
  logger.info('Database connected');

  const userService = new UserService(db, logger.child('user'));
  const orderService = new OrderService(db, logger.child('order'), userService);

  return {
    db,
    logger,
    userService,
    orderService,
  };
}
