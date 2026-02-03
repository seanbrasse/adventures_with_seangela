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

### Styling
| Technology | Purpose |
|------------|---------|
| styled-components | CSS-in-JS component styling |

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
│   │   ├── App.tsx              # Main app container
│   │   ├── Globe.tsx            # Alternative 3D globe (react-globe.gl)
│   │   ├── MapboxGlobe.tsx      # Primary 3D globe with Mapbox GL
│   │   ├── PhotoGallery.tsx     # Full-screen photo viewer
│   │   ├── PhotoUpload.tsx      # Upload modal with location autocomplete
│   │   ├── PlacesView.tsx       # Places/trips overview modal
│   │   ├── PlannedTripModal.tsx # Plan future trips modal
│   │   ├── SettingsModal.tsx    # Home base configuration
│   │   ├── Sidebar.tsx          # Stats and location list
│   │   └── TripSettingsModal.tsx # Edit trip details modal
│   ├── hooks/
│   │   ├── usePhotoStorage.ts   # Photo CRUD with Supabase/localStorage
│   │   ├── usePlannedTrips.ts   # Planned trips CRUD (localStorage)
│   │   ├── useSettings.ts       # Settings persistence
│   │   └── useTrips.ts          # Trip/flight line generation
│   ├── types/
│   │   └── photo.ts             # TypeScript interfaces
│   ├── utils/
│   │   ├── exif.ts              # EXIF extraction and photo grouping
│   │   ├── geocoding.ts         # Mapbox geocoding utilities
│   │   └── supabase.ts          # Supabase client
│   ├── test/
│   │   ├── setup.ts             # Global test setup and mocks
│   │   └── mocks/               # Mock implementations
│   ├── index.css                # Global styles with design tokens
│   └── main.tsx                 # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vitest.config.ts             # Test framework configuration
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
interface FlightLineVisit {
  date: Date;
  tripId: string;
  tripName: string;
}

interface FlightLine {
  id: string;
  from: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
  color: string;
  travelerId: string;    // Person ID (e.g., 'sean', 'angela')
  visits: FlightLineVisit[];  // All visits on this route, sorted newest first
}
```

**Note:** Flight lines are consolidated per route - multiple trips from the same home to the same destination result in a single line with multiple visits listed.

### 3.4 Trip

```typescript
interface Trip {
  id: string;
  name: string;          // Custom name or auto-generated
  description?: string;  // User-provided trip description
  locationName: string;  // Destination city/place
  startDate: Date;
  endDate: Date;
  photoIds: string[];    // Photos associated with this trip
  travelers: string[];   // HomeBase IDs of who traveled
  customStartPoints?: {  // For trips not starting from home
    homeBaseId: string;
    lat: number;
    lng: number;
    name: string;
  }[];
}
```

### 3.5 Planned Trip

```typescript
interface PlannedTrip {
  id: string;
  destinationName: string;
  lat: number;
  lng: number;
  description?: string;
  thingsToDo: string[];           // Checklist of activities
  potentialStartDate?: Date;
  potentialEndDate?: Date;
  bookingStatus: 'idea' | 'researching' | 'booked';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.6 Settings

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

### 4.1 GPS Coordinate Extraction

Location: `src/utils/exif.ts` - `extractPhotoData()`

```
Input: File (image)
Output: ExtractedPhotoData with lat/lng coordinates

Algorithm:
1. Extract EXIF using exifr library
2. Try pre-computed latitude/longitude (exifr handles sign)
3. Fallback: manually compute from raw GPS data:
   a. Get GPSLatitude and GPSLongitude values
   b. Apply sign based on reference:
      - GPSLatitudeRef 'S' → negative latitude
      - GPSLongitudeRef 'W' → negative longitude
4. Sanity check for known Western cities:
   - NYC area (lat 40-42, lng 73-75) → ensure negative longitude
   - LA area (lat 33-35, lng 117-119) → ensure negative longitude
   - SF area (lat 37-39, lng 121-123) → ensure negative longitude
```

This handles EXIF parsers that incorrectly drop the sign for Western hemisphere coordinates.

### 4.2 Location Generalization

Location: `src/utils/geocoding.ts` - `reverseGeocode()`

When a photo is reverse geocoded, the coordinates are snapped to the city center:

```
Input: Photo with exact GPS coordinates (e.g., 40.6943, -73.9249 - Bushwick apartment)
Output: Photo with city center coordinates (e.g., 40.6501, -73.9496 - Brooklyn center)

Process:
1. Call Mapbox reverse geocoding API with exact coordinates
2. Extract city name from response
3. Extract city center coordinates from response's `center` field
4. Store city center coordinates instead of exact GPS

Benefits:
- Privacy: Doesn't reveal exact addresses/apartments
- Cleaner map: All photos in same city appear at one point
- Flight lines: Connect to single point per city (no overlapping lines)
```

### 4.4 Photo Grouping

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

### 4.5 Active Home Base Selection

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

### 4.6 Great Circle Arc Generation

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

### 4.7 Bearing Calculation

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

### 5.4 Planned Trips (usePlannedTrips.ts)

```typescript
const PLANNED_TRIPS_KEY = 'photo-map-planned-trips';
const PLANNED_TRIPS_VERSION = 1;

// Hook returns:
{
  plannedTrips: PlannedTrip[];
  isLoading: boolean;
  addPlannedTrip: (trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => PlannedTrip;
  updatePlannedTrip: (id: string, updates: Partial<Omit<PlannedTrip, 'id' | 'createdAt'>>) => void;
  deletePlannedTrip: (id: string) => void;
  getPlannedTripById: (id: string) => PlannedTrip | undefined;
}
```

**Persistence:**
- Stored in localStorage
- Version-controlled for migrations
- Dates serialized as ISO strings

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
- EXIF extraction with GPS sign correction
- Auto reverse geocoding
- Manual location entry (autocomplete) - auto-opens for first photo needing location
- Prominent yellow "Add location" button for photos without GPS
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
  trip?: Trip;
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  onRenameLocation?: (photoIds: string[], newName: string) => void;
  onUpdatePhoto?: (id: string, updates: Partial<Photo>) => void;
  onUpdateTrip?: (id: string, updates: Partial<Trip>) => void;
  onDeleteTrip?: (tripId: string, deletePhotos: boolean) => void;
  onAddPhoto?: (location: LocationContext) => void;
  locationName?: string;
  mapboxToken?: string;
}
```

**Features:**
- Grid view grouped by date
- Full-screen view with navigation
- Keyboard navigation (arrows, escape)
- Delete with confirmation
- Trip settings integration
- Location renaming

### 6.6 PlannedTripModal

**Props:**
```typescript
{
  trip?: PlannedTrip;      // If provided, editing mode
  onSave: (trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onConvertToTrip?: () => void;
  onClose: () => void;
  mapboxToken?: string;
}
```

**Features:**
- City search with autocomplete
- Booking status selection (idea, researching, booked)
- Date range picker
- Things-to-do checklist
- Notes field
- Convert planned trip to actual trip (opens upload modal)

### 6.7 PlacesView

**Props:**
```typescript
{
  photos: Photo[];
  trips: Trip[];
  onClose: () => void;
  onLocationSelect: (photos: Photo[]) => void;
}
```

**Features:**
- Full-screen places overview
- Location cards with photo thumbnails
- Trip history per location
- Photo and trip counts
- Sorted by most recent visit

### 6.8 TripSettingsModal

**Props:**
```typescript
{
  trip: Trip;
  photoCount: number;
  onClose: () => void;
  onUpdateTrip: (id: string, updates: Partial<Trip>) => void;
  onDeleteTrip: (tripId: string, deletePhotos: boolean) => void;
}
```

**Features:**
- Edit trip name and description
- Modify trip dates
- Delete trip with option to keep or remove photos
- Danger zone with confirmation

### 6.9 Globe (Alternative)

**Props:**
```typescript
{
  photos: Photo[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
}
```

**Features:**
- Alternative globe implementation using react-globe.gl
- Photo location markers
- Point labels with photo count
- Auto-rotation when no selection

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

### 8.1 styled-components (CSS-in-JS)

All components use styled-components for a clean, Apple-like minimal aesthetic.

**Design Principles:**
- Monochromatic color scheme (no contrasting pink/blue stat cards)
- Subtle transparency effects: `rgba(255, 255, 255, 0.04-0.08)`
- Minimal borders: `1px solid rgba(255, 255, 255, 0.06)`
- Consistent border-radius: `0.75rem - 1rem`

**Color Palette:**
```typescript
// Background colors
const bgPrimary = '#0d0d12';      // Main app background
const bgCard = 'rgba(255, 255, 255, 0.04)';  // Card backgrounds

// Text colors
const textPrimary = '#ffffff';
const textSecondary = 'rgba(255, 255, 255, 0.5)';
const textMuted = 'rgba(255, 255, 255, 0.4)';

// Accent (for actions requiring attention)
const accentYellow = '#fbbf24';   // Location input prompts
const accentPink = '#EC4899';     // Angela's flight lines
const accentBlue = '#3B82F6';     // Sean's flight lines
```

### 8.2 Typography

- Font: System font stack (no external fonts)
- Weights: 400, 500, 600
- Base size: 14-16px
- Compact labels: 11-13px with letter-spacing

### 8.3 Layout

- Sidebar width: 320px (compact)
- Modal max-width: 36rem (settings), 48rem (upload)
- Card padding: 1-1.5rem
- Section gaps: 0.25-0.5rem

### 8.4 Component Patterns

**Stat Cards (monochromatic):**
```typescript
const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;
```

**Location Button (attention-grabbing):**
```typescript
const LocationButton = styled.button`
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border: 1px dashed rgba(251, 191, 36, 0.4);
  border-radius: 0.5rem;
`;
```

**Modal Backdrop:**
```typescript
const Backdrop = styled.div`
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
`;
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
    id: 'sean-brooklyn',
    personId: 'sean',
    name: 'Sean',
    city: 'Brooklyn',
    lat: 40.6501,
    lng: -73.9496,
    color: '#3B82F6',
    radius: 30,
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

## 14. Testing Requirements

### Test Framework

| Technology | Purpose |
|------------|---------|
| Vitest | Test runner (Vite-native) |
| React Testing Library | Component testing |
| @testing-library/jest-dom | DOM assertions |
| jsdom | Browser environment simulation |

### Coverage Thresholds

**Target: 85% coverage across all metrics.**

Current thresholds:
```typescript
// vitest.config.ts
thresholds: {
  statements: 74,  // Target: 85
  branches: 60,    // Target: 85
  functions: 66,   // Target: 85
  lines: 75,       // Target: 85
}
```

**Current coverage (338 tests):**
- Statements: 74%
- Branches: 61%
- Functions: 67%
- Lines: 75%

**Well-covered areas (>90%):**
- Types (`src/types/photo.ts`): 100%
- TripSettingsModal: 100%
- PlacesView: 96%
- usePlannedTrips hook: 97%
- useSettings hook: 97%

**Remaining gaps to reach 85%:**
- App.tsx (56%) - complex state management
- PhotoGallery.tsx (60%) - full-screen view interactions
- MapboxGlobe.tsx (64%) - map rendering and interactions
- SettingsModal.tsx (63%) - form interactions

### Test File Structure

```
src/
├── components/
│   ├── App.tsx
│   ├── App.test.tsx          # Component tests alongside source
│   └── ...
├── hooks/
│   ├── usePhotoStorage.ts
│   ├── usePhotoStorage.test.ts
│   └── ...
├── utils/
│   ├── geocoding.ts
│   ├── geocoding.test.ts
│   └── ...
└── test/
    ├── setup.ts              # Global test setup and mocks
    └── mocks/                # Mock implementations
        ├── mapbox-gl.ts
        ├── mapbox-gl.css.ts
        └── react-map-gl.ts
```

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage report
npm run test:coverage
```

### Test Requirements by File Type

**Components:**
- Render without errors
- User interactions (click, type, submit)
- Conditional rendering
- Props handling
- Modal open/close behavior

**Hooks:**
- Initial state
- State updates
- Side effects (localStorage, API calls)
- Edge cases (empty data, errors)

**Utilities:**
- All exported functions
- Happy path and error cases
- Edge cases and boundary values

---

## 15. Development Workflow

### Before Starting Work

1. **Read PRD.md** - Understand product goals, features, and business rules
2. **Read TECH_SPEC.md** - Review technical architecture, algorithms, and recent changes in changelog
3. **Check the changelog** - See what's been done recently to understand current state
4. **Run tests** - Ensure all tests pass before making changes:
   ```bash
   npm run test:run
   ```

### During Development

1. **Write tests first** (TDD) or alongside code
2. **Run tests frequently** to catch regressions early
3. **Check coverage** for new code:
   ```bash
   npm run test:coverage
   ```

### Before Committing

**MANDATORY: All commits must pass these checks:**

1. **Run full test suite:**
   ```bash
   npm run test:run
   ```
   - ❌ DO NOT commit if any tests fail
   - ✅ All tests must pass

2. **Check coverage thresholds:**
   ```bash
   npm run test:coverage
   ```
   - ❌ DO NOT commit if coverage drops below 85%
   - ✅ Coverage must meet or exceed thresholds

3. **Fix broken tests:**
   - If your changes break existing tests, fix them
   - If tests are incorrectly written, update them with correct assertions
   - Never skip or delete tests to make CI pass

### After Completing Work

1. **Update PRD.md** if:
   - New features were added
   - User-facing behavior changed
   - Business rules were modified

2. **Update TECH_SPEC.md** if:
   - New algorithms were implemented
   - Architecture changed
   - New dependencies were added
   - Component behavior changed

3. **Add changelog entry** with:
   - Version number (increment minor version)
   - Brief description of changes

### Quick Reference

```bash
# Before work: read docs and run tests
cat docs/PRD.md
cat docs/TECH_SPEC.md
npm run test:run

# During work: test frequently
npm test  # watch mode

# Before commit: verify everything passes
npm run test:run && npm run test:coverage

# After work: update docs, then commit
git add .
git commit -m "Add [feature] with tests"
```

### Commit Checklist

- [ ] All tests pass (`npm run test:run`)
- [ ] Coverage ≥ 85% (`npm run test:coverage`)
- [ ] New code has tests
- [ ] Documentation updated if needed
- [ ] Changelog entry added for features

---

## 16. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02 | 1.0 | Initial release with all core features |
| 2026-02 | 1.1 | Added time-based home bases for Angela's Dubai period |
| 2026-02 | 1.2 | Added map style toggle (minimal/detailed) |
| 2026-02 | 1.3 | Fixed settings persistence and home base UI |
| 2026-02 | 1.4 | Major UI overhaul with modern design system |
| 2026-02 | 1.5 | Added city-based photo grouping with reverse geocoding |
| 2026-02 | 1.6 | Consolidated flight lines per route with visit date list |
| 2026-02 | 1.7 | Migrated to styled-components (CSS-in-JS), Apple-like minimal design |
| 2026-02 | 1.8 | Fixed GPS coordinate sign handling for Western hemisphere photos |
| 2026-02 | 1.9 | Improved location input UX: auto-open search, prominent "Add location" button |
| 2026-02 | 1.10 | Added npm refresh script for quick dev workflow |
| 2026-02 | 1.11 | Added trips counter (locations visited since Sep 2024) |
| 2026-02 | 1.12 | Location generalization: photos use city center coordinates instead of exact GPS |
| 2026-02 | 1.13 | Updated Sean's home base from NYC to Brooklyn |
| 2026-02 | 1.14 | Added planned trips feature for planning future adventures |
| 2026-02 | 1.15 | Added PlacesView for browsing locations and trips |
| 2026-02 | 1.16 | Added TripSettingsModal for editing trip details |
| 2026-02 | 1.17 | Comprehensive test coverage update (338 tests passing) |
