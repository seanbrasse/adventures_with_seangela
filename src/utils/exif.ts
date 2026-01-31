import exifr from 'exifr';
import { v4 as uuidv4 } from 'uuid';
import type { Photo } from '../types/photo';

export async function extractPhotoData(file: File): Promise<Photo | null> {
  try {
    const exifData = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude'],
    });

    const url = URL.createObjectURL(file);
    const thumbnail = await createThumbnail(file);

    // Try to get GPS coordinates
    let lat: number | null = null;
    let lng: number | null = null;

    if (exifData?.latitude && exifData?.longitude) {
      lat = exifData.latitude;
      lng = exifData.longitude;
    }

    // Try to get date
    let date = new Date();
    if (exifData?.DateTimeOriginal) {
      date = new Date(exifData.DateTimeOriginal);
    } else if (exifData?.CreateDate) {
      date = new Date(exifData.CreateDate);
    } else if (exifData?.ModifyDate) {
      date = new Date(exifData.ModifyDate);
    }

    // If no GPS data, return null (user will need to set location manually)
    if (lat === null || lng === null) {
      return {
        id: uuidv4(),
        url,
        thumbnail,
        location: { lat: 0, lng: 0 },
        date,
        description: file.name,
      };
    }

    return {
      id: uuidv4(),
      url,
      thumbnail,
      location: { lat, lng },
      date,
      description: file.name,
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    const url = URL.createObjectURL(file);
    const thumbnail = await createThumbnail(file);

    return {
      id: uuidv4(),
      url,
      thumbnail,
      location: { lat: 0, lng: 0 },
      date: new Date(),
      description: file.name,
    };
  }
}

async function createThumbnail(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function groupPhotosByLocation(photos: Photo[], threshold = 0.5): Map<string, Photo[]> {
  const groups = new Map<string, Photo[]>();

  photos.forEach((photo) => {
    let foundGroup = false;

    for (const [key, groupPhotos] of groups) {
      const [lat, lng] = key.split(',').map(Number);
      const distance = getDistance(photo.location.lat, photo.location.lng, lat, lng);

      if (distance < threshold) {
        groupPhotos.push(photo);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      const key = `${photo.location.lat},${photo.location.lng}`;
      groups.set(key, [photo]);
    }
  });

  return groups;
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
