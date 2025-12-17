/**
 * Payment service for processing e-commerce payments
 */

import { DatabaseClient } from '../db/client';
import { Logger } from '../utils/logger';
import { OrderService } from './orderService';

/**
 * Payment method types supported by the system
 */
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';

/**
 * Payment status tracking
 */
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

/**
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Input for creating a new payment
 */
export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  cardToken?: string;
}

/**
 * PaymentService handles all payment processing operations
 */
export class PaymentService {
  private db: DatabaseClient;
  private logger: Logger;
  private orderService: OrderService;

  constructor(db: DatabaseClient, logger: Logger, orderService: OrderService) {
    this.db = db;
    this.logger = logger;
    this.orderService = orderService;
  }

  /**
   * Process a payment for an order
   * @param input Payment details including order ID and payment method
   * @returns The created payment transaction
   */
  async processPayment(input: CreatePaymentInput): Promise<PaymentTransaction> {
    this.logger.info('Processing payment', { orderId: input.orderId, amount: input.amount });

    // Create pending transaction
    const transaction = await this.db.insert<PaymentTransaction>('payment_transactions', {
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      status: 'pending',
      createdAt: new Date(),
    });

    try {
      // Process based on payment method
      await this.executePayment(transaction, input);

      // Update transaction status
      const updated = await this.db.update<PaymentTransaction>(
        'payment_transactions',
        transaction.id,
        { status: 'completed', completedAt: new Date() }
      );

      this.logger.info('Payment completed', { transactionId: transaction.id });
      return updated;
    } catch (error) {
      // Mark as failed
      await this.db.update<PaymentTransaction>(
        'payment_transactions',
        transaction.id,
        {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Refund a completed payment
   * @param transactionId The ID of the transaction to refund
   * @param reason Optional reason for the refund
   * @returns The updated payment transaction
   */
  async refundPayment(transactionId: string, reason?: string): Promise<PaymentTransaction> {
    this.logger.info('Processing refund', { transactionId, reason });

    const transaction = await this.db.findById<PaymentTransaction>(
      'payment_transactions',
      transactionId
    );

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    // Execute refund logic here
    const updated = await this.db.update<PaymentTransaction>(
      'payment_transactions',
      transactionId,
      { status: 'refunded' }
    );

    this.logger.info('Refund completed', { transactionId });
    return updated;
  }

  /**
   * Get payment history for an order
   * @param orderId The order ID to get payments for
   * @returns Array of payment transactions
   */
  async getPaymentHistory(orderId: string): Promise<PaymentTransaction[]> {
    return this.db.findMany<PaymentTransaction>('payment_transactions', {
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Internal method to execute payment based on method type
   */
  private async executePayment(
    transaction: PaymentTransaction,
    input: CreatePaymentInput
  ): Promise<void> {
    switch (input.method) {
      case 'credit_card':
      case 'debit_card':
        await this.processCardPayment(transaction, input.cardToken);
        break;
      case 'paypal':
        await this.processPayPalPayment(transaction);
        break;
      case 'bank_transfer':
        await this.processBankTransfer(transaction);
        break;
      default:
        throw new Error(`Unsupported payment method: ${input.method}`);
    }
  }

  private async processCardPayment(
    transaction: PaymentTransaction,
    cardToken?: string
  ): Promise<void> {
    if (!cardToken) {
      throw new Error('Card token required for card payments');
    }
    // TODO: Integrate with payment gateway (Stripe, etc.)
    this.logger.debug('Processing card payment', { transactionId: transaction.id });
  }

  private async processPayPalPayment(transaction: PaymentTransaction): Promise<void> {
    // TODO: Integrate with PayPal API
    this.logger.debug('Processing PayPal payment', { transactionId: transaction.id });
  }

  private async processBankTransfer(transaction: PaymentTransaction): Promise<void> {
    // TODO: Handle bank transfer logic
    this.logger.debug('Processing bank transfer', { transactionId: transaction.id });
  }
}
