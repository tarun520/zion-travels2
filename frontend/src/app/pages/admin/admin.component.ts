import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Car, CarInput, UnavailablePeriod, serviceCategoryLabel } from '../../models/car.model';
import { CarService } from '../../services/car.service';
import {
  formatPeriodRange,
  fromDatetimeLocalValue,
  isCurrentlyBlocked,
} from '../../utils/availability.util';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  cars: Car[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';
  editingId: string | null = null;

  form: CarInput = this.emptyForm();
  periodStart = '';
  periodEnd = '';
  periodNote = '';

  readonly formatPeriodRange = formatPeriodRange;
  readonly isCurrentlyBlocked = isCurrentlyBlocked;
  readonly serviceCategoryLabel = serviceCategoryLabel;
  listFilter: 'all' | 'car-rental' | 'chauffeur' | 'bus-rental' = 'all';

  constructor(private carService: CarService) {}

  ngOnInit(): void {
    this.loadCars();
  }

  emptyForm(): CarInput {
    return {
      name: '',
      brand: '',
      type: 'Sedan',
      price: 0,
      priceUnit: 'day',
      seats: 5,
      quantity: 1,
      transmission: 'Manual',
      fuel: 'Petrol',
      image: '',
      description: '',
      available: true,
      serviceCategory: 'car-rental',
      unavailablePeriods: [],
    };
  }

  loadCars(): void {
    this.loading = true;
    this.error = '';
    this.carService.getCars().subscribe({
      next: (cars) => {
        this.cars = cars;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load cars. Is the backend reachable?';
        this.loading = false;
      },
    });
  }

  get filteredCars(): Car[] {
    if (this.listFilter === 'all') {
      return this.cars;
    }
    return this.cars.filter((car) => (car.serviceCategory || 'car-rental') === this.listFilter);
  }

  startEdit(car: Car): void {
    this.editingId = car.id;
    this.form = {
      name: car.name,
      brand: car.brand,
      type: car.type,
      price: car.price,
      priceUnit: car.priceUnit,
      seats: car.seats,
      quantity: car.quantity || 1,
      transmission: car.transmission,
      fuel: car.fuel,
      image: car.image,
      description: car.description,
      available: car.available,
      serviceCategory: car.serviceCategory || 'car-rental',
      unavailablePeriods: [...(car.unavailablePeriods || [])],
    };
    this.periodStart = '';
    this.periodEnd = '';
    this.periodNote = '';
    this.success = '';
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.periodStart = '';
    this.periodEnd = '';
    this.periodNote = '';
  }

  addUnavailablePeriod(): void {
    this.error = '';

    if (!this.periodStart || !this.periodEnd) {
      this.error = 'Select both start and end date/time for unavailability.';
      return;
    }

    const startAt = fromDatetimeLocalValue(this.periodStart);
    const endAt = fromDatetimeLocalValue(this.periodEnd);
    if (new Date(endAt) <= new Date(startAt)) {
      this.error = 'End date/time must be after start date/time.';
      return;
    }

    const period: UnavailablePeriod = {
      id: crypto.randomUUID(),
      startAt,
      endAt,
      note: this.periodNote.trim(),
    };

    this.form.unavailablePeriods = [...(this.form.unavailablePeriods || []), period];
    this.periodStart = '';
    this.periodEnd = '';
    this.periodNote = '';
  }

  removeUnavailablePeriod(periodId: string): void {
    this.form.unavailablePeriods = (this.form.unavailablePeriods || []).filter(
      (period) => period.id !== periodId
    );
  }

  submit(): void {
    this.success = '';
    this.error = '';

    if (!this.form.name.trim()) {
      this.error = 'Car name is required.';
      return;
    }
    if (this.form.price === null || this.form.price === undefined || Number(this.form.price) < 0) {
      this.error = 'Enter a valid price.';
      return;
    }
    if (!this.form.quantity || Number(this.form.quantity) < 1) {
      this.error = 'Quantity must be at least 1.';
      return;
    }
    if (this.form.serviceCategory === 'bus-rental' && (!this.form.seats || Number(this.form.seats) < 2)) {
      this.error = 'Enter number of seats for the bus.';
      return;
    }

    const payload: CarInput = {
      ...this.form,
      name: this.form.name.trim(),
      brand: this.form.brand.trim(),
      description: this.form.description.trim(),
      image:
        this.form.image.trim() ||
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
      price: Number(this.form.price),
      seats: Number(this.form.seats) || 5,
      quantity: Math.floor(Number(this.form.quantity)) || 1,
      serviceCategory: this.form.serviceCategory || 'car-rental',
      unavailablePeriods: this.form.unavailablePeriods || [],
    };

    this.saving = true;

    const request$ = this.editingId
      ? this.carService.updateCar(this.editingId, payload)
      : this.carService.addCar(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.success = this.editingId
          ? this.form.serviceCategory === 'bus-rental'
            ? 'Bus updated.'
            : 'Car updated.'
          : this.form.serviceCategory === 'bus-rental'
            ? 'Bus added.'
            : 'Car added.';
        this.editingId = null;
        this.form = this.emptyForm();
        this.periodStart = '';
        this.periodEnd = '';
        this.periodNote = '';
        this.loadCars();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.error || 'Failed to save car.';
      },
    });
  }

  remove(car: Car): void {
    if (!confirm(`Delete "${car.name}"?`)) {
      return;
    }
    this.carService.deleteCar(car.id).subscribe({
      next: () => {
        this.success = 'Car deleted.';
        if (this.editingId === car.id) {
          this.cancelEdit();
        }
        this.loadCars();
      },
      error: () => {
        this.error = 'Failed to delete car.';
      },
    });
  }
}
