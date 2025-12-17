/**
 * Order service for managing e-commerce orders
 */

import { DatabaseClient } from '../db/client';
import { Logger } from '../utils/logger';
import { UserService } from './userService';
import { Order, OrderItem, CreateOrderInput } from '../types/order';

export class OrderService {
  private db: DatabaseClient;
  private logger: Logger;
  private userService: UserService;

  constructor(db: DatabaseClient, logger: Logger, userService: UserService) {
    this.db = db;
    this.logger = logger;
    this.userService = userService;
  }

  /**
   * Creates a new order for a user
   */
  async createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
    this.logger.info('Creating order', { userId, items: input.items.length });

    // Verify user exists
    const user = await this.userService.findByEmail(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate total
    const total = this.calculateOrderTotal(input.items);

    const order = await this.db.insert<Order>('orders', {
      userId,
      items: input.items,
      total,
      status: 'pending',
      createdAt: new Date(),
    });

    this.logger.info('Order created', { orderId: order.id, total });
    return order;
  }

  /**
   * Calculates the total price for order items
   */
  private calculateOrderTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Gets an order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.db.findOne<Order>('orders', { id: orderId });
  }

  /**
   * Updates order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    this.logger.info('Updating order status', { orderId, status });
    return this.db.update<Order>('orders', orderId, { status });
  }

  /**
   * Gets all orders for a user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    return this.db.findMany<Order>('orders', { userId });
  }

  /**
   * Cancels an order and notifies the user
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Update status
    const cancelled = await this.updateOrderStatus(orderId, 'cancelled');

    // Get user to notify
    const user = await this.userService.findByEmail(order.userId);
    this.logger.info('Order cancelled', { orderId, userId: user?.email });

    return cancelled;
  }

  /**
   * Processes a refund for an order
   * Returns the refund amount
   */
  async refundOrder(orderId: string, refundPercent: number): Promise<number> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate refund amount
    const refundAmount = order.total * refundPercent;

    // Update order status
    await this.updateOrderStatus(orderId, 'refunded');

    this.logger.info('Order refunded', { orderId, refundAmount });

    return refundAmount;
  }

  /**
   * Gets the total revenue from all completed orders
   */
  async getTotalRevenue(): Promise<number> {
    const orders = await this.db.findMany<Order>('orders', { status: 'completed' });
    let total = 0;
    for (const order of orders) {
      total = total + order.total;
    }
    return total;
  }
}
// Test comment 1765995459
