import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Car, CarInput } from '../../models/car.model';
import { CarService } from '../../services/car.service';

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
      transmission: 'Manual',
      fuel: 'Petrol',
      image: '',
      description: '',
      available: true,
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
        this.error = 'Unable to load cars. Is the backend running on port 5055?';
        this.loading = false;
      },
    });
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
      transmission: car.transmission,
      fuel: car.fuel,
      image: car.image,
      description: car.description,
      available: car.available,
    };
    this.success = '';
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
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
    };

    this.saving = true;

    const request$ = this.editingId
      ? this.carService.updateCar(this.editingId, payload)
      : this.carService.addCar(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.success = this.editingId ? 'Car updated.' : 'Car added.';
        this.editingId = null;
        this.form = this.emptyForm();
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
