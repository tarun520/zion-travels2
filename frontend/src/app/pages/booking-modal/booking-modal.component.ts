import { Component, EventEmitter, Input, NgZone, OnChanges, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Car } from '../../models/car.model';
import { BookingService, AvailabilityResponse } from '../../services/booking.service';

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
  @Output() booked = new EventEmitter<string>();

  customerName = '';
  customerEmail = '';
  customerPhone = '';
  startDate = '';
  endDate = '';

  submitting = false;
  checkingAvailability = false;
  error = '';
  success = '';
  availability: AvailabilityResponse | null = null;

  constructor(
    private bookingService: BookingService,
    private zone: NgZone
  ) {}

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
      this.availability = null;
      this.refreshAvailability();
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

  readonly advanceAmount = 1000;

  get remainingOffline(): number {
    return Math.max(this.total - this.advanceAmount, 0);
  }

  get onlineAdvance(): number {
    return Math.min(this.advanceAmount, this.total);
  }

  get canPay(): boolean {
    return Boolean(this.availability?.available) && !this.checkingAvailability && !this.submitting;
  }

  close(): void {
    if (this.submitting) {
      return;
    }
    this.closed.emit();
  }

  onDatesChange(): void {
    this.refreshAvailability();
  }

  refreshAvailability(): void {
    if (!this.car || !this.startDate || !this.endDate) {
      this.availability = null;
      return;
    }
    if (new Date(this.endDate) <= new Date(this.startDate)) {
      this.availability = null;
      this.error = 'End date must be after start date.';
      return;
    }

    this.checkingAvailability = true;
    this.error = '';
    this.bookingService.checkAvailability(this.car.id, this.startDate, this.endDate).subscribe({
      next: (result) => {
        this.availability = result;
        this.checkingAvailability = false;
        if (!result.available) {
          this.error = 'No cars left for these dates. Try different dates.';
        }
      },
      error: () => {
        this.checkingAvailability = false;
        this.availability = null;
        this.error = 'Unable to check availability.';
      },
    });
  }

  private finishSuccess(message: string): void {
    this.zone.run(() => {
      this.submitting = false;
      this.success = message;
      this.booked.emit(message);
    });
  }

  private finishError(message: string): void {
    this.zone.run(() => {
      this.submitting = false;
      this.error = message;
      this.refreshAvailability();
    });
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
    if (new Date(this.endDate) <= new Date(this.startDate)) {
      this.error = 'End date must be after start date.';
      return;
    }
    if (!this.availability?.available) {
      this.error = 'No cars left for these dates.';
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
                  next: (result) => {
                    const mailNote =
                      result?.receiptEmailQueued || result?.receiptEmailSent
                        ? ' A receipt will be emailed to you.'
                        : '';
                    this.finishSuccess(
                      `Advance paid. Booking confirmed for ${order.carName}. Pay remaining balance offline.${mailNote}`
                    );
                  },
                  error: (err) => {
                    this.finishError(err?.error?.error || 'Could not confirm booking.');
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
              description: `${order.carName} · Advance ₹${order.advanceAmountInr}`,
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
                    next: (result) => {
                      const mailNote =
                        result?.receiptEmailQueued || result?.receiptEmailSent
                          ? ' A receipt will be emailed to you.'
                          : '';
                      this.finishSuccess(
                        `Advance paid. Booking confirmed! Pay remaining balance offline.${mailNote}`
                      );
                    },
                    error: (err) => {
                      this.finishError(err?.error?.error || 'Payment verification failed.');
                    },
                  });
              },
              modal: {
                ondismiss: () => {
                  this.finishError('Payment cancelled.');
                },
              },
            });
            rzp.open();
          } catch {
            this.finishError('Unable to start Razorpay checkout.');
          }
        },
        error: (err) => {
          this.finishError(err?.error?.error || 'Failed to create booking order.');
        },
      });
  }
}
