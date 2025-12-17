/**
 * User service for managing user operations
 */

import { DatabaseClient } from '../db/client';
import { Logger } from '../utils/logger';
import { User, CreateUserInput, UpdateUserInput } from '../types/user';

export class UserService {
  private db: DatabaseClient;
  private logger: Logger;

  constructor(db: DatabaseClient, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Creates a new user in the database
   */
  async createUser(input: CreateUserInput): Promise<User> {
    this.logger.info('Creating user', { email: input.email });

    const existingUser = await this.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await this.db.insert<User>('users', {
      email: input.email,
      name: input.name,
      createdAt: new Date(),
    });

    this.logger.info('User created', { userId: user.id });
    return user;
  }

  /**
   * Finds a user by their email address
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.db.findOne<User>('users', { email });
  }

  /**
   * Updates an existing user
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    this.logger.info('Updating user', { userId });

    const user = await this.db.update<User>('users', userId, {
      ...input,
      updatedAt: new Date(),
    });

    return user;
  }

  /**
   * Deletes a user from the system
   */
  async deleteUser(userId: string): Promise<void> {
    this.logger.warn('Deleting user', { userId });
    await this.db.delete('users', userId);
  }

  /**
   * Lists all users with pagination
   */
  async listUsers(limit: number = 10, offset: number = 0): Promise<User[]> {
    return this.db.findMany<User>('users', {}, { limit, offset });
  }
}
// Updated for embeddings
