import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { buildCallUrl, buildMapsUrl } from '../../config/contact.config';
import { SiteAssetsService } from '../../services/site-assets.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  menuOpen = false;
  logo = '/zion-logo.jpg';
  readonly callUrl = buildCallUrl();
  readonly mapsUrl = buildMapsUrl();

  constructor(private siteAssetsService: SiteAssetsService) {}

  ngOnInit(): void {
    this.siteAssetsService.getAssets().subscribe({
      next: (assets) => {
        if (assets.logo) {
          this.logo = assets.logo;
          this.siteAssetsService.applyFavicon(assets.logo);
        }
      },
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
