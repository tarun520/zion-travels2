export type ServiceCategory = 'car-rental' | 'chauffeur' | 'bus-rental';

export interface UnavailablePeriod {
  id: string;
  startAt: string;
  endAt: string;
  note?: string;
}

export interface Car {
  id: string;
  name: string;
  brand: string;
  type: string;
  price: number;
  priceUnit: string;
  seats: number;
  quantity: number;
  transmission: string;
  fuel: string;
  image: string;
  description: string;
  available: boolean;
  /** Which public page this vehicle appears on */
  serviceCategory: ServiceCategory;
  unavailablePeriods?: UnavailablePeriod[];
}

export type CarInput = Omit<Car, 'id'>;

export function serviceCategoryLabel(category: ServiceCategory | string | undefined): string {
  if (category === 'chauffeur') {
    return 'Chauffeur Service';
  }
  if (category === 'bus-rental') {
    return 'Bus Rentals';
  }
  return 'Car Rentals';
}
