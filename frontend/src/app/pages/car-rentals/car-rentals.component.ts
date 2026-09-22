import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Car, ServiceCategory, serviceCategoryLabel } from '../../models/car.model';
import { CarService } from '../../services/car.service';
import { BookingModalComponent } from '../booking-modal/booking-modal.component';
import { isCurrentlyBlocked } from '../../utils/availability.util';

@Component({
  selector: 'app-car-rentals',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, BookingModalComponent],
  templateUrl: './car-rentals.component.html',
  styleUrl: './car-rentals.component.css',
})
export class CarRentalsComponent implements OnInit {
  cars: Car[] = [];
  loading = true;
  error = '';
  selectedCar: Car | null = null;
  bookingOpen = false;
  bookingSuccess = '';
  serviceCategory: ServiceCategory = 'car-rental';
  pageTitle = 'Car Rentals';
  pageSubtitle = 'Choose a vehicle and book via WhatsApp';
  private successTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private carService: CarService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.serviceCategory = (data['serviceCategory'] as ServiceCategory) || 'car-rental';
      this.pageTitle = data['title'] || serviceCategoryLabel(this.serviceCategory);
      this.pageSubtitle =
        data['subtitle'] ||
        (this.serviceCategory === 'chauffeur'
          ? 'Chauffeur-driven cars — book with driver via WhatsApp'
          : this.serviceCategory === 'bus-rental'
            ? 'Buses by seating capacity — book via WhatsApp'
            : 'Choose a vehicle and book via WhatsApp');
      this.loadCars();
    });
  }

  loadCars(): void {
    this.loading = true;
    this.error = '';
    this.carService.getCars(this.serviceCategory).subscribe({
      next: (cars) => {
        this.cars = cars;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load fleet.';
        this.loading = false;
      },
    });
  }

  openBooking(car: Car): void {
    if (!car.available) {
      return;
    }
    this.selectedCar = car;
    this.bookingOpen = true;
  }

  closeBooking(): void {
    this.bookingOpen = false;
    this.selectedCar = null;
  }

  onBooked(message: string): void {
    this.closeBooking();
    this.bookingSuccess = message;
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => {
      this.bookingSuccess = '';
    }, 5000);
  }

  dismissSuccess(): void {
    this.bookingSuccess = '';
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
  }

  isCurrentlyBlocked(car: Car): boolean {
    return isCurrentlyBlocked(car);
  }
}
