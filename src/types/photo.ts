export interface PhotoLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  location: PhotoLocation;
  date: Date;
  description?: string;
}

export interface PhotoGroup {
  location: PhotoLocation;
  photos: Photo[];
}
