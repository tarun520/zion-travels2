import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Car } from '../../models/car.model';
import { CarService } from '../../services/car.service';
import { BookingModalComponent } from '../booking-modal/booking-modal.component';
import { isCurrentlyBlocked } from '../../utils/availability.util';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CurrencyPipe, BookingModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;

  cars: Car[] = [];
  loading = true;
  error = '';
  selectedCar: Car | null = null;
  bookingOpen = false;
  bookingSuccess = '';
  private successTimer?: ReturnType<typeof setTimeout>;

  private revealObserver?: IntersectionObserver;

  constructor(
    private carService: CarService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.loadCars();
  }

  ngAfterViewInit(): void {
    const video = this.heroVideo?.nativeElement;
    if (video) {
      video.muted = true;
      const tryPlay = () => video.play().catch(() => undefined);
      if (video.readyState >= 2) {
        tryPlay();
      } else {
        video.addEventListener('canplay', tryPlay, { once: true });
      }
    }

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    this.observeReveals();
  }

  private observeReveals(): void {
    if (!this.revealObserver) {
      return;
    }
    const nodes = this.host.nativeElement.querySelectorAll('.reveal:not(.in-view)');
    nodes.forEach((node) => this.revealObserver!.observe(node));
  }

  loadCars(): void {
    this.loading = true;
    this.error = '';
    this.carService.getCars().subscribe({
      next: (cars) => {
        this.cars = cars;
        this.loading = false;
        setTimeout(() => this.observeReveals(), 0);
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
