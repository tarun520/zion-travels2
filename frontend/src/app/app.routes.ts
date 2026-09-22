import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AdminComponent } from './pages/admin/admin.component';
import { CarRentalsComponent } from './pages/car-rentals/car-rentals.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'car-rentals',
    component: CarRentalsComponent,
    data: {
      serviceCategory: 'car-rental',
      title: 'Car Rentals',
      subtitle: 'Self-drive and hire cars — book via WhatsApp',
    },
  },
  {
    path: 'chauffeur-service',
    component: CarRentalsComponent,
    data: {
      serviceCategory: 'chauffeur',
      title: 'Chauffeur Service',
      subtitle: 'Cars with professional drivers — book via WhatsApp',
    },
  },
  {
    path: 'bus-rentals',
    component: CarRentalsComponent,
    data: {
      serviceCategory: 'bus-rental',
      title: 'Bus Rentals',
      subtitle: 'Buses by seating capacity — book via WhatsApp',
    },
  },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' },
];
