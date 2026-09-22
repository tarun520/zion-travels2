import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { buildWhatsAppUrl } from '../../config/contact.config';

export interface HomeService {
  id: string;
  title: string;
  description: string;
  image: string;
  action: 'cars' | 'chauffeur' | 'bus' | 'whatsapp';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;

  services: HomeService[] = [
    {
      id: 'car-rentals',
      title: 'Car Rentals',
      description:
        'Self-drive and flexible car hire for city trips, weekends, and outstation travel — clean vehicles ready when you are.',
      image: '/wix/car1-lg.jpg',
      action: 'cars',
    },
    {
      id: 'chauffeur-service',
      title: 'Chauffeur Service',
      description:
        'Professional drivers for airport transfers, business travel, and day-long city rides with comfort and punctuality.',
      image: '/wix/car2-lg.jpg',
      action: 'chauffeur',
    },
    {
      id: 'bus-rentals',
      title: 'Bus Rentals',
      description:
        'Group travel made easy — buses for weddings, corporate outings, tours, and events with dependable service.',
      image: '/wix/banner.jpg',
      action: 'bus',
    },
  ];

  private revealObserver?: IntersectionObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    private router: Router
  ) {}

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

  onServiceClick(service: HomeService): void {
    if (service.action === 'cars') {
      this.router.navigate(['/car-rentals']);
      return;
    }
    if (service.action === 'chauffeur') {
      this.router.navigate(['/chauffeur-service']);
      return;
    }
    if (service.action === 'bus') {
      this.router.navigate(['/bus-rentals']);
      return;
    }
    this.enquire(service);
  }

  openCarRentals(): void {
    this.router.navigate(['/car-rentals']);
  }

  openChauffeurService(): void {
    this.router.navigate(['/chauffeur-service']);
  }

  openBusRentals(): void {
    this.router.navigate(['/bus-rentals']);
  }

  enquire(service: HomeService): void {
    const message = [
      `Hi Zion Travels, I'm interested in your ${service.title} service.`,
      '',
      'Please share availability and pricing.',
    ].join('\n');
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  }
}
