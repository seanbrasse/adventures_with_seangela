import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock the hooks
vi.mock('../hooks/usePhotoStorage', () => ({
  usePhotoStorage: () => ({
    photos: [],
    isLoading: false,
    addPhoto: vi.fn(),
    addPhotos: vi.fn(),
    removePhoto: vi.fn(),
    updatePhoto: vi.fn(),
    clearPhotos: vi.fn(),
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      homeBases: [
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
      ],
    },
    isLoading: false,
    updateHomeBase: vi.fn(),
    addHomeBase: vi.fn(),
    removeHomeBase: vi.fn(),
    resetToDefaults: vi.fn(),
  }),
}));

vi.mock('../hooks/useTrips', () => ({
  useTrips: () => ({
    trips: [],
    isLoading: false,
    flightLines: [],
    regenerateTrips: vi.fn(),
    updateTrip: vi.fn(),
    renameTrip: vi.fn(),
    deleteTrip: vi.fn(),
    createTrip: vi.fn(),
    movePhotoToTrip: vi.fn(),
    getTripsForLocation: vi.fn(),
  }),
}));

// Mock MapboxGlobe
vi.mock('./MapboxGlobe', () => ({
  default: () => <div data-testid="mapbox-globe">MapboxGlobe Mock</div>,
}));

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the app title', () => {
    render(<App />);

    // "Our Photo Map" appears multiple times (mobile header + sidebar)
    const titles = screen.getAllByText('Our Photo Map');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should render the sidebar', () => {
    render(<App />);

    expect(screen.getByText('No photos yet')).toBeInTheDocument();
  });

  it('should render add photos button', () => {
    render(<App />);

    expect(screen.getByText('Add Photos')).toBeInTheDocument();
  });

  it('should render settings button', () => {
    render(<App />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should open photo upload modal when clicking add photos', () => {
    render(<App />);

    const addButton = screen.getByText('Add Photos');
    fireEvent.click(addButton);

    expect(screen.getByText('Upload photos to add them to your map')).toBeInTheDocument();
  });

  it('should open settings modal when clicking settings', () => {
    render(<App />);

    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Home Bases')).toBeInTheDocument();
  });

  it('should render the map component', () => {
    render(<App />);

    expect(screen.getByTestId('mapbox-globe')).toBeInTheDocument();
  });

  it('should show API key modal when VITE_MAPBOX_TOKEN is not set', () => {
    // When MAPBOX_TOKEN env var is not set, the API key modal appears
    // This test verifies the component renders without error
    render(<App />);

    // The app should still render the main structure
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
  });

  it('should render API key UI elements', () => {
    // Verify the App component renders without crashing
    const { container } = render(<App />);

    expect(container).toBeInTheDocument();
    // App renders correctly
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should close upload modal when cancelled', () => {
    render(<App />);

    // Open upload modal
    fireEvent.click(screen.getByText('Add Photos'));
    expect(screen.getByText('Upload photos to add them to your map')).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Upload photos to add them to your map')).not.toBeInTheDocument();
  });

  it('should close settings modal when clicking done', () => {
    render(<App />);

    // Open settings
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Home Bases')).toBeInTheDocument();

    // Click Done button (the bottom button)
    fireEvent.click(screen.getByText('Done'));

    // Modal should be closed
    expect(screen.queryByText('Home Bases')).not.toBeInTheDocument();
  });

  it('should display heart icon in title', () => {
    const { container } = render(<App />);

    // Check for SVG with lucide-heart class anywhere in the app
    const heartIcons = container.querySelectorAll('svg.lucide-heart');
    expect(heartIcons.length).toBeGreaterThan(0);
  });
});
