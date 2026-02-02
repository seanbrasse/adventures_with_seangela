# Photo Map Globe - Product Requirements Document

## Overview

**Product Name:** Photo Map Globe
**Purpose:** A Valentine's Day gift application that visualizes shared travel memories on an interactive 3D globe
**Target Users:** Sean (NYC) and Angela (Jakarta/Dubai)
**Last Updated:** February 2026

---

## 1. Product Vision

A beautiful, interactive web application that maps photos to locations on a 3D globe, showing flight paths from home bases to destinations. The app celebrates the relationship between two people who live in different parts of the world, visualizing their travels and memories together.

---

## 2. Core Features

### 2.1 Interactive 3D Globe
- **Globe Projection:** Uses Mapbox GL JS with globe projection for a 3D Earth view
- **Map Styles:**
  - Minimal (dark) - Default, optimized for viewing flight lines and markers
  - Detailed (satellite) - Toggle for geographic context
- **Navigation:** Zoom, pan, rotate with smooth animations
- **Auto-focus:** Fits bounds to show all photo locations on load

### 2.2 Photo Management

#### Upload Methods
- Drag and drop files
- File picker dialog
- Paste from clipboard (for macOS Photos app compatibility)
- Supports: JPG, JPEG, PNG, GIF, WebP, HEIC/HEIF

#### EXIF Extraction
- Automatically extracts GPS coordinates from photo metadata
- Handles GPS coordinate sign correction (GPSLatitudeRef S = negative, GPSLongitudeRef W = negative)
- Includes sanity checks for known Western hemisphere cities (NYC, LA, SF) to correct sign errors
- Extracts date from DateTimeOriginal, CreateDate, or ModifyDate
- HEIC files are converted to JPEG for display

#### Location Handling
- **With GPS:** Auto-reverse geocodes to city name (e.g., "Dubai, United Arab Emirates")
- **Without GPS:** Shows prominent "Add location" button with yellow/amber styling
- Auto-opens location search for the first photo needing a location
- Uses Mapbox Geocoding API for both forward and reverse geocoding

#### Date Handling
- Extracts from EXIF if available
- Allows manual date entry/editing for photos without metadata

### 2.3 Photo Grouping

Photos are grouped by location using a two-tier system:

1. **Name-based grouping (primary):** Photos with the same normalized city name are grouped together
   - Handles variations: "NYC" = "New York City" = "New York"
   - Handles regional names: "DKI Jakarta" = "Jakarta"

2. **Distance-based grouping (fallback):** Photos within 50km are grouped together
   - Used when city names aren't available
   - Much more generous than typical "exact location" matching

### 2.4 Home Bases & Flight Lines

#### People
- **Sean:** Home base in NYC (blue, #3B82F6)
- **Angela:** Home base in Jakarta (pink, #EC4899)
- People are fixed - cannot add or remove

#### Home Base Types
1. **Permanent:** Default home that applies when no temporary home is active
2. **Temporary:** Time-bound home with start/end dates that overrides permanent home

#### Flight Line Logic
For each photo location (trip destination):
1. Determine photo date
2. For each person, find their active home at that date:
   - Check temporary homes: if date falls within startDate-endDate, use that home
   - Otherwise, use permanent home
3. Draw curved flight line (great circle arc) from home to destination
4. Color-code by person

#### Visual Elements
- Dashed curved lines following great circle paths
- Single line per route (home → destination) regardless of number of visits
- Plane icon at midpoint of each line, rotated to heading
- Plane popup shows: route (e.g., "NYC → Dubai") and list of visit dates (e.g., "Nov 2024", "Mar 2025")
- Home base markers (small colored circles) for permanent homes only

### 2.5 Photo Gallery

#### Grid View
- Photos organized by date (newest first)
- Sticky date headers
- Thumbnail grid with hover effects
- Delete button with confirmation (click twice)

#### Full-screen View
- Large photo display
- Arrow navigation (keyboard supported)
- Photo counter (e.g., "3 / 12")
- Date and description display

### 2.6 Sidebar

Compact 320px width with Apple-like minimal, monochromatic design.

#### Stats Section
- Total photo count
- Total locations count
- Trips counter (locations visited together since Sep 2024)
- Date range (first to last photo)
- Monochromatic stat cards (no contrasting colors)

#### Locations List
- Sorted by most recent photo
- Shows thumbnail, city name, photo count, latest date
- Click to open photo gallery for that location

### 2.7 Settings Modal

#### Home Base Management
- Grouped by person (Sean, Angela)
- Each home base shows:
  - City name
  - Type badge (Permanent/Temporary)
  - Date range for temporary homes
- Edit mode with city autocomplete
- Add new home bases (temporary or permanent)
- Delete non-essential home bases
- Reset to defaults option

---

## 3. User Flows

### 3.1 First-Time Setup
1. User lands on app
2. If no Mapbox token in env, modal prompts for API key
3. Enter Mapbox token → Continue
4. Empty state shows with prompt to add photos

### 3.2 Adding Photos
1. Click "Add Photos" or drag files onto drop zone
2. Photos are processed:
   - HEIC converted to JPEG
   - EXIF extracted for location/date
   - Coordinates reverse-geocoded to city names
3. Photos missing location show orange warning
4. User can add location via autocomplete search
5. User can edit dates if needed
6. Click "Add X Photos" to upload

### 3.3 Viewing Photos
1. Click marker on globe OR location in sidebar
2. Photo gallery opens for that location
3. Browse grid or click to view full-screen
4. Navigate with arrows or keyboard
5. Delete photos with double-click confirmation

### 3.4 Managing Home Bases
1. Click settings gear icon
2. View home bases grouped by person
3. Click home base to edit:
   - Change city (with autocomplete)
   - Change type (permanent/temporary)
   - Set date range for temporary
   - Adjust radius
4. Add new home bases for either person
5. Delete temporary home bases (permanent ones are protected)

---

## 4. Business Rules

### 4.1 Location Grouping Rules
- Same normalized city name → same group
- Within 50km of existing group center → same group
- Otherwise → new group

### 4.2 Home Base Rules
- Each person must have exactly one permanent home base
- Temporary homes override permanent during their active dates
- Date comparison is inclusive (startDate ≤ photoDate ≤ endDate)
- If no home matches, fall back to first available home for person

### 4.3 Flight Line Rules
- One flight line per person per trip destination
- Lines only drawn if home base exists for that person
- Lines use person's color
- Trips regenerate when photos change or home bases change

### 4.4 Photo Validation Rules
- Photos must have location (either from EXIF or manually added)
- Photos with (0, 0) coordinates are treated as missing location
- Photos without location cannot be uploaded

---

## 5. Edge Cases & Quirks

### 5.1 Known Edge Cases

| Scenario | Behavior |
|----------|----------|
| Photo exactly at (0, 0) | Treated as missing location |
| HEIC without EXIF | Still converts, prompts for location |
| Photo during home transition | Uses home active on exact date |
| Same city, different countries | Grouped if normalized names match |
| Very long flight (>180° longitude) | Great circle may cross date line |

### 5.2 Browser Compatibility
- Clipboard paste works best in Chrome/Edge
- HEIC conversion requires JavaScript (no native support)
- WebGL required for globe rendering

### 5.3 Performance Considerations
- Large photo batches: Process sequentially to avoid memory issues
- Many flight lines: GeoJSON source with multiple layers
- Thumbnails: 200px max dimension, JPEG quality 0.7

---

## 6. Future Considerations

### Potential Enhancements
- [ ] Trip naming and organization
- [ ] Photo descriptions/captions
- [ ] Multiple travelers beyond Sean/Angela
- [ ] Offline support with service worker
- [ ] Photo sharing/export
- [ ] Timeline view of travels
- [ ] Statistics dashboard (miles traveled, countries visited)
- [ ] Animation of flight paths

### Technical Debt
- [ ] Consider code-splitting for large bundles (Mapbox GL is 1.6MB)
- [ ] Add proper error boundaries
- [ ] Implement proper loading states for geocoding
- [ ] Add retry logic for failed API calls

---

## 7. Success Metrics

This is a personal gift, but success looks like:
- All shared photos successfully mapped
- Flight lines accurately reflect travel from correct home bases
- UI is intuitive enough to use without instructions
- App loads and performs well on target devices
- Angela loves it

---

## Appendix A: Angela's Timeline

| Period | Home Base | Notes |
|--------|-----------|-------|
| Before Sep 2024 | Jakarta | Permanent home |
| Sep 2024 - Apr 2025 | Dubai | Temporary assignment |
| After Apr 2025 | Jakarta | Back to permanent home |

This affects flight line calculations for photos during the Dubai period.
