export interface BookingRequest {
  carId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
}

export interface CreateOrderResponse {
  bookingId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  demoMode: boolean;
  carName: string;
  days: number;
  amountInr: number;
}

export interface VerifyPaymentRequest {
  bookingId: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  demoConfirm?: boolean;
}

export interface BookingConfig {
  keyId: string;
  configured: boolean;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export {};
