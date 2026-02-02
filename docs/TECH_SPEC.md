# Photo Map Globe - Technical Specification

## 1. Technology Stack

### Core
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool and dev server |

### Mapping
| Technology | Purpose |
|------------|---------|
| Mapbox GL JS | 3D globe rendering |
| react-map-gl | React bindings for Mapbox |

### Storage
| Technology | Purpose |
|------------|---------|
| Supabase | Database and file storage (optional) |
| localStorage | Settings persistence |
| Object URLs | Fallback for local-only mode |

### Utilities
| Library | Purpose |
|---------|---------|
| exifr | EXIF metadata extraction |
| heic2any | HEIC to JPEG conversion |
| date-fns | Date formatting |
| uuid | Unique ID generation |
| lucide-react | Icons |

---

## 2. Project Structure

```
v_day_26/
├── docs/
│   ├── PRD.md              # Product requirements
│   └── TECH_SPEC.md        # This document
├── src/
│   ├── components/
│   │   ├── App.tsx         # Main app container
│   │   ├── MapboxGlobe.tsx # 3D globe with markers and flight lines
│   │   ├── PhotoGallery.tsx # Full-screen photo viewer
│   │   ├── PhotoUpload.tsx  # Upload modal with location autocomplete
│   │   ├── SettingsModal.tsx # Home base configuration
│   │   └── Sidebar.tsx      # Stats and location list
│   ├── hooks/
│   │   ├── usePhotoStorage.ts # Photo CRUD with Supabase/localStorage
│   │   ├── useSettings.ts     # Settings persistence
│   │   └── useTrips.ts        # Trip/flight line generation
│   ├── types/
│   │   └── photo.ts         # TypeScript interfaces
│   ├── utils/
│   │   ├── exif.ts          # EXIF extraction and photo grouping
│   │   ├── geocoding.ts     # Mapbox geocoding utilities
│   │   └── supabase.ts      # Supabase client
│   ├── index.css            # Global styles with design tokens
│   └── main.tsx             # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Data Models

### 3.1 Photo

```typescript
interface PhotoLocation {
  lat: number;
  lng: number;
  name?: string;  // City name from reverse geocoding
}

interface Photo {
  id: string;
  url: string;           // Full image URL
  thumbnail: string;     // Thumbnail URL (200px max)
  location: PhotoLocation;
  date: Date;
  description?: string;
  tripId?: string;       // Reserved for future trip grouping
}
```

### 3.2 Home Base

```typescript
interface HomeBase {
  id: string;
  personId: string;      // 'sean' | 'angela'
  name: string;          // Person's display name
  city: string;          // City name
  lat: number;
  lng: number;
  color: string;         // Hex color for flight lines
  radius: number;        // km, for "at home" detection
  startDate?: Date;      // When home became active
  endDate?: Date;        // When home ended
  isPermanent?: boolean; // If true, fallback when no temp matches
}
```

### 3.3 Flight Line

```typescript
interface FlightLine {
  id: string;
  tripId: string;
  tripName: string;
  from: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
  color: string;
  travelerId: string;    // HomeBase ID
}
```

### 3.4 Settings

```typescript
interface AppSettings {
  homeBases: HomeBase[];
}

// Stored in localStorage with version for migration
interface StoredSettings {
  version: number;       // Currently 2
  homeBases: HomeBase[]; // With dates as ISO strings
}
```

---

## 4. Key Algorithms

### 4.1 Photo Grouping

Location: `src/utils/exif.ts` - `groupPhotosByLocation()`

```
Input: Photo[], distanceThreshold (default 50km)
Output: Map<string, Photo[]> where key is "lat,lng"

Algorithm:
1. For each photo:
   a. If photo has location.name:
      - Normalize name (lowercase, remove "city", handle aliases)
      - Search existing groups for matching normalized name
      - If found, add to that group
   b. If no name match:
      - Calculate distance to each existing group center
      - If within threshold, add to nearest group
   c. If no match found:
      - Create new group with key "{lat},{lng}"
```

**Normalization rules:**
- Lowercase and trim
- Remove prefixes: "city of "
- Remove suffixes: " city", " metro", " metropolitan area"
- Aliases: "nyc" → "new york", "dki jakarta" → "jakarta"

### 4.2 Active Home Base Selection

Location: `src/hooks/useTrips.ts` - `getActiveHomeBase()`

```
Input: personId, date, homeBases[]
Output: HomeBase | null

Algorithm:
1. Filter homes by personId
2. Check temporary homes (isPermanent !== true):
   - If startDate <= date <= endDate, return this home
3. If no temp match, return permanent home (isPermanent === true)
4. If no permanent, return first available home
```

### 4.3 Great Circle Arc Generation

Location: `src/components/MapboxGlobe.tsx` - `generateArcPoints()`

```
Input: startLng, startLat, endLng, endLat, numPoints (default 100)
Output: [lng, lat][] coordinates along arc

Algorithm:
1. Convert coordinates to radians
2. Calculate angular distance (d) using spherical law of cosines
3. For each point i from 0 to numPoints:
   a. Calculate fraction f = i / numPoints
   b. Interpolate along great circle using spherical interpolation
   c. Convert back to degrees
   d. Add [lng, lat] to result
```

### 4.4 Bearing Calculation

Location: `src/components/MapboxGlobe.tsx` - `getBearing()`

Used to rotate plane icons to point in direction of travel.

```
Input: startLng, startLat, endLng, endLat
Output: bearing in degrees (0-360, where 0 is north)

Uses forward azimuth formula from spherical trigonometry.
```

---

## 5. State Management

### 5.1 App State (App.tsx)

```typescript
// Core state
photos: Photo[]              // All photos
selectedPhotos: Photo[]      // Photos for gallery view
showGallery: boolean
showUpload: boolean
showSettings: boolean

// API keys
apiKey: string               // Mapbox token
showApiKeyInput: boolean

// Derived
flightLines: FlightLine[]    // From useTrips hook
homeBases: HomeBase[]        // From useSettings hook
```

### 5.2 Settings Persistence (useSettings.ts)

```typescript
const STORAGE_KEY = 'photo-map-settings';
const SETTINGS_VERSION = 2;

// Load flow:
1. Read from localStorage
2. Parse JSON
3. Validate version matches
4. Validate data structure (all homeBases have personId)
5. Deserialize dates (ISO strings → Date objects)
6. Return settings or defaults

// Save flow:
1. Serialize dates (Date objects → ISO strings)
2. Add version number
3. JSON.stringify
4. Write to localStorage
```

### 5.3 Photo Storage (usePhotoStorage.ts)

Supports two modes:

**Supabase Mode** (when configured):
- Photos stored in Supabase storage bucket
- Metadata stored in Supabase database
- Full URLs returned

**Local Mode** (fallback):
- Photos stored as Object URLs (blob:)
- Metadata stored in localStorage
- URLs are session-only (lost on refresh)

---

## 6. Component Details

### 6.1 MapboxGlobe

**Props:**
```typescript
{
  photos: Photo[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
  accessToken: string;
  flightLines?: FlightLine[];
  homeBases?: HomeBase[];
}
```

**Renders:**
- Map with globe projection
- Style toggle button (minimal/detailed)
- Home base markers (permanent only)
- Flight line arcs (GeoJSON LineString layers)
- Plane icons at arc midpoints
- Photo location markers with pulse animation
- Hover popups with thumbnails

**Map Styles:**
- Minimal: `mapbox://styles/mapbox/dark-v11`
- Detailed: `mapbox://styles/mapbox/satellite-streets-v12`

### 6.2 PhotoUpload

**Props:**
```typescript
{
  onUpload: (photos: Photo[]) => void;
  onClose: () => void;
  mapboxToken?: string;
}
```

**Features:**
- Drag/drop zone
- File input
- Clipboard paste listener
- HEIC conversion
- EXIF extraction
- Auto reverse geocoding
- Manual location entry (autocomplete)
- Manual date editing
- Upload progress bar

**Internal State:**
```typescript
pendingPhotos: PendingPhoto[]  // Photos being prepared
editingLocation: string | null // Photo ID being edited
editingDate: string | null     // Photo ID being edited
isProcessing: boolean
isUploading: boolean
uploadProgress: number
```

### 6.3 SettingsModal

**Props:**
```typescript
{
  homeBases: HomeBase[];
  onUpdate: (homeBases: HomeBase[]) => void;
  onClose: () => void;
  onResetToDefaults: () => void;
  mapboxToken?: string;
}
```

**Features:**
- People sections (Sean, Angela)
- Home base cards with type badges
- Inline editing with city autocomplete
- Add new home base form
- Delete (temporary only)
- Reset to defaults

### 6.4 Sidebar

**Props:**
```typescript
{
  photos: Photo[];
  onLocationSelect: (photos: Photo[]) => void;
}
```

**Computed:**
- Location groups (via groupPhotosByLocation)
- Stats (photo count, location count, date range)

### 6.5 PhotoGallery

**Props:**
```typescript
{
  photos: Photo[];
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  locationName?: string;
}
```

**Features:**
- Grid view grouped by date
- Full-screen view with navigation
- Keyboard navigation (arrows, escape)
- Delete with confirmation

---

## 7. API Integration

### 7.1 Mapbox Geocoding API

**Forward Geocoding (search):**
```
GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json
  ?access_token={token}
  &types=place,locality,neighborhood,address,poi
  &limit=6
```

**Reverse Geocoding (coords to name):**
```
GET https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json
  ?access_token={token}
  &types=place,locality,region
  &limit=1
```

### 7.2 Supabase (when configured)

**Storage:**
- Bucket: `photos`
- Files: `{id}.jpg` (full), `{id}_thumb.jpg` (thumbnail)
- Cache: 1 year

**Database:**
- Table: `photos`
- Columns: id, url, thumbnail, lat, lng, location_name, date, description

---

## 8. Styling System

### 8.1 Design Tokens (index.css)

```css
:root {
  /* Colors */
  --color-bg-primary: #0c0c14;
  --color-bg-secondary: #12121c;
  --color-bg-tertiary: #1a1a28;
  --color-accent-primary: #f472b6;    /* Pink */
  --color-accent-secondary: #ec4899;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Spacing */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */

  /* Border Radius */
  --radius-sm: 0.5rem;     /* 8px */
  --radius-md: 0.75rem;    /* 12px */
  --radius-lg: 1rem;       /* 16px */
  --radius-xl: 1.5rem;     /* 24px */
  --radius-2xl: 2rem;      /* 32px */
}
```

### 8.2 Typography

- Font: Inter (Google Fonts)
- Weights: 400, 500, 600, 700
- Base size: 16px
- Headings: text-xl (modal), text-2xl (page)

### 8.3 Component Patterns

**Buttons:**
```css
.btn-primary {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
}
```

**Cards:**
```css
.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-xl);
}
```

**Modals:**
```css
.modal-backdrop {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.modal-content {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-2xl);
  max-width: 36rem;  /* 576px for settings */
  max-width: 48rem;  /* 768px for upload */
}
```

---

## 9. Performance Considerations

### 9.1 Bundle Size

Current production build:
- `mapbox-gl.js`: 1,680 KB (463 KB gzipped)
- `index.js`: 1,894 KB (503 KB gzipped)
- `index.css`: 83 KB (13 KB gzipped)

**Optimization opportunities:**
- Code split Mapbox GL with dynamic import
- Lazy load photo gallery and settings modal
- Consider smaller icon library

### 9.2 Photo Processing

- HEIC conversion: Can be slow, ~1-2s per photo
- Thumbnail generation: Canvas resize to 200px max
- Batch processing: Sequential to avoid memory pressure

### 9.3 Map Rendering

- Flight lines: Single GeoJSON source with multiple layers
- Markers: Individual Marker components (React)
- Animations: CSS transforms for hover effects

---

## 10. Environment Variables

```bash
# Required for map display
VITE_MAPBOX_TOKEN=pk.eyJ...

# Optional - enables cloud storage
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

If Mapbox token not in env, app prompts user to enter it.

---

## 11. Default Data

### Default Home Bases

```typescript
const DEFAULT_HOME_BASES: HomeBase[] = [
  {
    id: 'sean-nyc',
    personId: 'sean',
    name: 'Sean',
    city: 'NYC',
    lat: 40.7128,
    lng: -74.0060,
    color: '#3B82F6',
    radius: 50,
    isPermanent: true,
  },
  {
    id: 'angela-jakarta',
    personId: 'angela',
    name: 'Angela',
    city: 'Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    color: '#EC4899',
    radius: 40,
    isPermanent: true,
  },
  {
    id: 'angela-dubai',
    personId: 'angela',
    name: 'Angela',
    city: 'Dubai',
    lat: 25.2048,
    lng: 55.2708,
    color: '#EC4899',
    radius: 30,
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-04-30'),
    isPermanent: false,
  },
];
```

### Fixed People List

```typescript
const PEOPLE = [
  { id: 'sean', name: 'Sean', color: '#3B82F6' },
  { id: 'angela', name: 'Angela', color: '#EC4899' },
];
```

---

## 12. Testing Checklist

### Photo Upload
- [ ] JPEG with GPS extracts location correctly
- [ ] HEIC converts and displays
- [ ] Photo without GPS shows add location prompt
- [ ] Pasting from clipboard works
- [ ] Location autocomplete returns results
- [ ] Date editing updates photo

### Home Bases
- [ ] Angela's temporary home (Dubai) selected for dates in range
- [ ] Angela's permanent home (Jakarta) selected outside range
- [ ] Sean's NYC always selected (no temporaries)
- [ ] Flight lines regenerate when home bases change

### Photo Grouping
- [ ] Two Dubai photos grouped together
- [ ] NYC variations grouped (NYC, New York, New York City)
- [ ] Photos 50km apart grouped
- [ ] Photos 100km apart separate

### UI/UX
- [ ] Modals have adequate padding
- [ ] Text is readable (16px+ base)
- [ ] Buttons are large enough to tap
- [ ] Map style toggle works
- [ ] Gallery navigation works with keyboard

---

## 13. Known Limitations

1. **No offline support:** Requires internet for Mapbox tiles and geocoding
2. **Session-only storage:** Without Supabase, photos lost on refresh
3. **Two-person limit:** Only Sean and Angela configured
4. **No photo editing:** Can't crop, rotate, or adjust photos
5. **No trip organization:** Photos grouped by location, not trips
6. **Bundle size:** Large due to Mapbox GL dependency

---

## 14. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02 | 1.0 | Initial release with all core features |
| 2026-02 | 1.1 | Added time-based home bases for Angela's Dubai period |
| 2026-02 | 1.2 | Added map style toggle (minimal/detailed) |
| 2026-02 | 1.3 | Fixed settings persistence and home base UI |
| 2026-02 | 1.4 | Major UI overhaul with modern design system |
| 2026-02 | 1.5 | Added city-based photo grouping with reverse geocoding |
