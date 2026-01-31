# Our Photo Map

A beautiful interactive 3D globe application for mapping photos from your adventures together. Upload photos with GPS data and watch them appear as pins on a rotating globe!

## Features

- **Interactive 3D Globe** - Explore your memories on a beautiful rotating Earth
- **Automatic GPS Extraction** - Photos with location data are automatically placed on the map
- **Manual Location Setting** - Set coordinates for photos without GPS data
- **Photo Gallery** - Click on map pins to view photos organized by date
- **Responsive Design** - Works beautifully on both desktop and mobile
- **Local Storage** - Your photos persist between sessions

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. Click "Add Photos" to upload images
2. Photos with GPS data will be automatically placed on the globe
3. For photos without GPS, you can manually enter coordinates
4. Click on any pin on the globe to view the photos from that location
5. Photos are displayed organized by date within each location

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **react-globe.gl** - 3D globe visualization
- **Tailwind CSS** - Styling
- **exifr** - GPS data extraction from photos
- **date-fns** - Date formatting
- **Lucide React** - Icons

## Project Structure

```
src/
  components/
    Globe.tsx         # 3D globe component
    PhotoGallery.tsx  # Photo viewer modal
    PhotoUpload.tsx   # Photo upload modal
    Sidebar.tsx       # Location list sidebar
  hooks/
    usePhotoStorage.ts # Photo persistence hook
  types/
    photo.ts          # TypeScript types
  utils/
    exif.ts           # EXIF data extraction
  App.tsx             # Main application
  main.tsx            # Entry point
```
