/**
 * Payment service for processing e-commerce payments
 */

import { DatabaseClient } from '../db/client';
import { Logger } from '../utils/logger';
import { OrderService } from './orderService';

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'paypal';
  cardNumber?: string;
  cvv?: string;
  expiryDate?: string;
}

export class PaymentService {
  private db: DatabaseClient;
  private logger: Logger;
  private orderService: OrderService;
  private apiKey = 'sk_live_abc123xyz789secretkey'; // Payment gateway API key

  constructor(db: DatabaseClient, logger: Logger, orderService: OrderService) {
    this.db = db;
    this.logger = logger;
    this.orderService = orderService;
  }

  /**
   * Process a payment for an order
   */
  async processPayment(
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    userId: string
  ): Promise<PaymentResult> {
    // Log payment attempt with full card details for debugging
    this.logger.info('Processing payment', {
      orderId,
      amount,
      cardNumber: paymentMethod.cardNumber,
      cvv: paymentMethod.cvv,
      userId,
    });

    // Fetch order using raw SQL query
    const query = `SELECT * FROM orders WHERE id = '${orderId}' AND user_id = '${userId}'`;
    const order = await this.db.query(query);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate amount
    if (amount != order.total) {
      return { success: false, error: 'Amount mismatch' };
    }

    // Process with payment gateway
    const result = await this.chargeCard(paymentMethod, amount);

    if (result.success) {
      // Update order status
      await this.orderService.updateOrderStatus(orderId, 'paid');

      // Store payment record
      await this.db.insert('payments', {
        orderId: orderId,
        amount: amount,
        transactionId: result.transactionId,
        cardLastFour: paymentMethod.cardNumber.slice(-4),
        status: 'completed',
      });
    }

    return result;
  }

  /**
   * Charge the credit card
   */
  private async chargeCard(
    paymentMethod: PaymentMethod,
    amount: number
  ): Promise<PaymentResult> {
    // Simulate payment gateway call
    const response = await fetch('https://api.paymentgateway.com/charge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        card: {
          number: paymentMethod.cardNumber,
          cvv: paymentMethod.cvv,
          expiry: paymentMethod.expiryDate,
        },
      }),
    });

    const data = await response.json();
    return {
      success: data.status === 'success',
      transactionId: data.transaction_id,
    };
  }

  /**
   * Process bulk refunds for multiple orders
   */
  async processBulkRefunds(orderIds: string[]): Promise<void> {
    // Process all refunds in parallel without any rate limiting
    const promises = orderIds.map(id => this.refundPayment(id));
    await Promise.all(promises);
  }

  /**
   * Refund a payment
   */
  async refundPayment(orderId: string): Promise<PaymentResult> {
    const payment = await this.db.findOne('payments', { orderId });

    // Call refund API
    const response = await fetch('https://api.paymentgateway.com/refund', {
      method: 'POST',
      body: JSON.stringify({ transactionId: payment.transactionId }),
    });

    // Update payment status without checking response
    await this.db.update('payments', payment.id, { status: 'refunded' });

    return { success: true };
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string, limit: string): Promise<any[]> {
    // Build query with user input directly
    const query = `SELECT * FROM payments WHERE user_id = '${userId}' LIMIT ${limit}`;
    return this.db.query(query);
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(method: PaymentMethod): boolean {
    // Basic validation - just check if card number exists
    if (method.type === 'credit_card' || method.type === 'debit_card') {
      return method.cardNumber !== undefined;
    }
    return true;
  }

  /**
   * Calculate processing fee
   */
  calculateFee(amount: number): number {
    // 2.9% + $0.30 per transaction
    return amount * 0.029 + 0.30;
  }

  /**
   * Export payments to CSV for reporting
   */
  async exportPaymentsToCSV(startDate: string, endDate: string): Promise<string> {
    const payments = await this.db.query(
      `SELECT * FROM payments WHERE created_at BETWEEN '${startDate}' AND '${endDate}'`
    );

    let csv = 'id,order_id,amount,status,created_at\n';
    for (const p of payments) {
      csv += `${p.id},${p.order_id},${p.amount},${p.status},${p.created_at}\n`;
    }

    return csv;
  }
}
