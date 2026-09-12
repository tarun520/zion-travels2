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
  unavailablePeriods?: UnavailablePeriod[];
}

export type CarInput = Omit<Car, 'id'>;
