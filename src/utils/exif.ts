import exifr from 'exifr';
import heic2any from 'heic2any';
import { v4 as uuidv4 } from 'uuid';
import type { Photo } from '../types/photo';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ExtractedPhotoData {
  id: string;
  file: File;
  thumbnail: string;
  location: { lat: number; lng: number; name?: string };
  date: Date;
  description: string;
  needsLocation: boolean;
}

async function convertHeicToJpeg(file: File): Promise<File> {
  if (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic')) {
    return file;
  }

  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
    const newName = file.name.replace(/\.heic$/i, '.jpg');
    return new File([jpegBlob], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC:', error);
    return file;
  }
}

export async function extractPhotoData(file: File): Promise<ExtractedPhotoData | null> {
  try {
    // Extract EXIF before conversion (HEIC files have EXIF too)
    const exifData = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude'],
    });

    // Convert HEIC to JPEG if needed
    const processedFile = await convertHeicToJpeg(file);

    const thumbnail = await createThumbnail(processedFile);

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

    const needsLocation = lat === null || lng === null;

    return {
      id: uuidv4(),
      file: processedFile,
      thumbnail,
      location: { lat: lat ?? 0, lng: lng ?? 0 },
      date,
      description: file.name.replace(/\.[^/.]+$/, ''),
      needsLocation,
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);

    try {
      const processedFile = await convertHeicToJpeg(file);
      const thumbnail = await createThumbnail(processedFile);

      return {
        id: uuidv4(),
        file: processedFile,
        thumbnail,
        location: { lat: 0, lng: 0 },
        date: new Date(),
        description: file.name.replace(/\.[^/.]+$/, ''),
        needsLocation: true,
      };
    } catch (thumbError) {
      console.error('Error creating thumbnail:', thumbError);
      return null;
    }
  }
}

export async function uploadPhotoToStorage(
  id: string,
  file: File,
  thumbnail: string
): Promise<{ url: string; thumbnailUrl: string } | null> {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback to object URLs for local storage mode
    return {
      url: URL.createObjectURL(file),
      thumbnailUrl: thumbnail,
    };
  }

  try {
    // Always save as jpg for consistency
    const fileName = `${id}.jpg`;
    const thumbnailName = `${id}_thumb.jpg`;

    // Convert file to blob if needed
    let uploadBlob: Blob = file;
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      // Convert to JPEG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = await createImageFromFile(file);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      uploadBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });
    }

    // Upload full image
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, uploadBlob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      return null;
    }

    // Upload thumbnail (convert base64 to blob)
    const thumbnailBlob = await fetch(thumbnail).then(r => r.blob());
    const { error: thumbError } = await supabase.storage
      .from('photos')
      .upload(thumbnailName, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (thumbError) {
      console.error('Error uploading thumbnail:', thumbError);
    }

    // Get public URLs
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
    const { data: thumbUrlData } = supabase.storage.from('photos').getPublicUrl(thumbnailName);

    return {
      url: urlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Error in uploadPhotoToStorage:', error);
    return null;
  }
}

function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function createThumbnail(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
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
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
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
