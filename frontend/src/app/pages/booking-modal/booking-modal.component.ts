import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { buildWhatsAppUrl } from '../../config/contact.config';
import { Car, serviceCategoryLabel } from '../../models/car.model';
import { getCarAvailability } from '../../utils/availability.util';

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

  error = '';
  dateAvailabilityMessage = '';

  ngOnChanges(): void {
    if (this.open) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      this.startDate = today.toISOString().slice(0, 10);
      this.endDate = tomorrow.toISOString().slice(0, 10);
      this.error = '';
      this.validateDates();
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

  get datesValid(): boolean {
    return Boolean(
      this.startDate &&
        this.endDate &&
        new Date(this.endDate) > new Date(this.startDate)
    );
  }

  get canSubmit(): boolean {
    return (
      Boolean(this.car?.available) &&
      this.datesValid &&
      getCarAvailability(this.car, this.startDate, this.endDate).available
    );
  }

  close(): void {
    this.closed.emit();
  }

  onDatesChange(): void {
    this.validateDates();
  }

  private validateDates(): void {
    this.error = '';
    this.dateAvailabilityMessage = '';

    if (!this.startDate || !this.endDate) {
      return;
    }

    if (new Date(this.endDate) <= new Date(this.startDate)) {
      this.error = 'End date must be after start date.';
      return;
    }

    const availability = getCarAvailability(this.car, this.startDate, this.endDate);
    if (!availability.available && availability.reason === 'blocked_period') {
      this.dateAvailabilityMessage =
        'This car is marked unavailable by admin for part of the selected dates.';
    } else if (availability.available) {
      this.dateAvailabilityMessage = 'Selected dates look available.';
    }
  }

  submit(): void {
    if (!this.car) {
      return;
    }

    this.error = '';

    if (!this.car.available) {
      this.error = 'This car is not available for booking.';
      return;
    }

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

    const availability = getCarAvailability(this.car, this.startDate, this.endDate);
    if (!availability.available) {
      this.error = 'This car is unavailable for the selected dates.';
      return;
    }

    const vehicleLabel = this.car.serviceCategory === 'bus-rental' ? 'Bus' : 'Car';
    const serviceLabel = serviceCategoryLabel(this.car.serviceCategory);
    const message = [
      `Hi Zion Travels, I would like to book via ${serviceLabel}.`,
      '',
      `Service: ${serviceLabel}`,
      `${vehicleLabel}: ${this.car.name}${this.car.serviceCategory === 'bus-rental' ? ` (${this.car.seats} seats)` : ` (${this.car.brand} · ${this.car.type})`}`,
      `Dates: ${this.startDate} to ${this.endDate} (${this.days} day(s))`,
      `Estimated total: ₹${this.total.toLocaleString('en-IN')}`,
      '',
      `Name: ${this.customerName.trim()}`,
      `Email: ${this.customerEmail.trim()}`,
      `Phone: ${this.customerPhone.trim()}`,
    ].join('\n');

    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
    this.booked.emit('Opening WhatsApp to complete your booking…');
  }
}
