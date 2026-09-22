import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Car, CarInput, ServiceCategory } from '../models/car.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CarService {
  private readonly apiUrl = `${environment.apiBaseUrl}/cars`;

  constructor(private http: HttpClient) {}

  getCars(serviceCategory?: ServiceCategory): Observable<Car[]> {
    let params = new HttpParams();
    if (serviceCategory) {
      params = params.set('serviceCategory', serviceCategory);
    }
    return this.http.get<Car[]>(this.apiUrl, { params });
  }

  getCar(id: string): Observable<Car> {
    return this.http.get<Car>(`${this.apiUrl}/${id}`);
  }

  addCar(car: CarInput): Observable<Car> {
    return this.http.post<Car>(this.apiUrl, car);
  }

  updateCar(id: string, car: Partial<CarInput>): Observable<Car> {
    return this.http.put<Car>(`${this.apiUrl}/${id}`, car);
  }

  deleteCar(id: string): Observable<Car> {
    return this.http.delete<Car>(`${this.apiUrl}/${id}`);
  }
}
