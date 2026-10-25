import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { defaultSiteAssets, SiteAssets } from '../models/site-assets.model';

@Injectable({
  providedIn: 'root',
})
export class SiteAssetsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/site-assets`;
  private readonly assetsSubject = new BehaviorSubject<SiteAssets>(defaultSiteAssets());
  readonly assets$ = this.assetsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAssets(): Observable<SiteAssets> {
    return this.http.get<SiteAssets>(this.apiUrl).pipe(
      tap((assets) => this.assetsSubject.next({ ...defaultSiteAssets(), ...assets }))
    );
  }

  updateAssets(assets: SiteAssets): Observable<SiteAssets> {
    return this.http.put<SiteAssets>(this.apiUrl, assets).pipe(
      tap((saved) => this.assetsSubject.next({ ...defaultSiteAssets(), ...saved }))
    );
  }

  applyFavicon(url: string): void {
    if (typeof document === 'undefined' || !url) {
      return;
    }
    const links = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    links.forEach((link) => link.setAttribute('href', url));
  }
}
