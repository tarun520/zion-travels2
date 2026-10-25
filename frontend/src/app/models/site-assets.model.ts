export interface SiteAssets {
  logo: string;
  heroVideo: string;
  heroPoster: string;
  aboutMainImage: string;
  aboutFloatImage: string;
  carRentalImage: string;
  chauffeurImage: string;
  busRentalImage: string;
}

export function defaultSiteAssets(): SiteAssets {
  return {
    logo: '/zion-logo.jpg',
    heroVideo:
      'https://video.wixstatic.com/video/11062b_802873a9c69b4642966143da07b8ea88/720p/mp4/file.mp4',
    heroPoster: '/wix/banner.jpg',
    aboutMainImage: '/wix/car2-lg.jpg',
    aboutFloatImage: '/wix/car1-lg.jpg',
    carRentalImage: '/wix/car1-lg.jpg',
    chauffeurImage: '/wix/car2-lg.jpg',
    busRentalImage: '/wix/banner.jpg',
  };
}
