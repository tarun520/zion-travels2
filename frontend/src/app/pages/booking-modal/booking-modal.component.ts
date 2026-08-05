import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Car } from '../../models/car.model';
import { BookingService } from '../../services/booking.service';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './booking-modal.component.html',
  styleUrl: './booking-modal.component.css',
})
export class BookingModalComponent implements OnChanges {
  @Input() car: Car | null = null;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() booked = new EventEmitter<void>();

  customerName = '';
  customerEmail = '';
  customerPhone = '';
  startDate = '';
  endDate = '';

  submitting = false;
  error = '';
  success = '';

  constructor(private bookingService: BookingService) {}

  ngOnChanges(): void {
    if (this.open) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      this.startDate = today.toISOString().slice(0, 10);
      this.endDate = tomorrow.toISOString().slice(0, 10);
      this.error = '';
      this.success = '';
      this.submitting = false;
    }
  }

  get days(): number {
    if (!this.startDate || !this.endDate) {
      return 1;
    }
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 1);
  }

  get total(): number {
    return this.car ? this.car.price * this.days : 0;
  }

  close(): void {
    if (this.submitting) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (!this.car) {
      return;
    }

    this.error = '';
    this.success = '';

    if (!this.customerName.trim() || !this.customerEmail.trim() || !this.customerPhone.trim()) {
      this.error = 'Please fill name, email, and phone.';
      return;
    }
    if (!this.startDate || !this.endDate) {
      this.error = 'Please select booking dates.';
      return;
    }
    if (new Date(this.endDate) < new Date(this.startDate)) {
      this.error = 'End date must be on or after start date.';
      return;
    }

    this.submitting = true;

    this.bookingService
      .createOrder({
        carId: this.car.id,
        customerName: this.customerName.trim(),
        customerEmail: this.customerEmail.trim(),
        customerPhone: this.customerPhone.trim(),
        startDate: this.startDate,
        endDate: this.endDate,
      })
      .subscribe({
        next: async (order) => {
          try {
            if (order.demoMode) {
              this.bookingService
                .verifyPayment({
                  bookingId: order.bookingId,
                  demoConfirm: true,
                })
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    this.success = `Demo booking confirmed for ${order.carName}. Add Razorpay keys in backend/.env for live payments.`;
                    this.booked.emit();
                  },
                  error: (err) => {
                    this.submitting = false;
                    this.error = err?.error?.error || 'Could not confirm demo booking.';
                  },
                });
              return;
            }

            await this.bookingService.loadRazorpayScript();
            const rzp = new window.Razorpay({
              key: order.keyId,
              amount: order.amount,
              currency: order.currency,
              name: 'Zion Travels',
              description: `${order.carName} · ${order.days} day(s)`,
              order_id: order.orderId,
              prefill: {
                name: this.customerName.trim(),
                email: this.customerEmail.trim(),
                contact: this.customerPhone.trim(),
              },
              theme: { color: '#116dff' },
              handler: (response: {
                razorpay_order_id: string;
                razorpay_payment_id: string;
                razorpay_signature: string;
              }) => {
                this.bookingService
                  .verifyPayment({
                    bookingId: order.bookingId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  })
                  .subscribe({
                    next: () => {
                      this.submitting = false;
                      this.success = 'Payment successful. Your car is booked!';
                      this.booked.emit();
                    },
                    error: (err) => {
                      this.submitting = false;
                      this.error = err?.error?.error || 'Payment verification failed.';
                    },
                  });
              },
              modal: {
                ondismiss: () => {
                  this.submitting = false;
                  this.error = 'Payment cancelled.';
                },
              },
            });
            rzp.open();
          } catch {
            this.submitting = false;
            this.error = 'Unable to start Razorpay checkout.';
          }
        },
        error: (err) => {
          this.submitting = false;
          this.error = err?.error?.error || 'Failed to create booking order.';
        },
      });
  }
}
