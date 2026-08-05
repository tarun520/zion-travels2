import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BookingConfig,
  BookingRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
} from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly apiUrl = 'http://localhost:5055/api/bookings';

  constructor(private http: HttpClient) {}

  getConfig(): Observable<BookingConfig> {
    return this.http.get<BookingConfig>(`${this.apiUrl}/config`);
  }

  createOrder(payload: BookingRequest): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.apiUrl}/create-order`, payload);
  }

  verifyPayment(payload: VerifyPaymentRequest): Observable<{ success: boolean; booking: unknown }> {
    return this.http.post<{ success: boolean; booking: unknown }>(`${this.apiUrl}/verify`, payload);
  }

  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });
  }
}
