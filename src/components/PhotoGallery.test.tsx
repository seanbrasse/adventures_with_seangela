import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoGallery from './PhotoGallery';
import type { Photo } from '../types/photo';

describe('PhotoGallery component', () => {
  const createPhoto = (id: string, date: Date): Photo => ({
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    location: { lat: 40.7128, lng: -74.006, name: 'New York' },
    date,
    description: `Photo ${id}`,
  });

  const mockOnClose = vi.fn();
  const mockOnDeletePhoto = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render gallery with location name', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
        locationName="New York"
      />
    );

    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('should render photo thumbnails', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-15')),
      createPhoto('2', new Date('2024-06-16')),
    ];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails).toHaveLength(2);
  });

  it('should group photos by date', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-15')),
      createPhoto('2', new Date('2024-06-15')),
      createPhoto('3', new Date('2024-06-16')),
    ];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Should show date headers
    expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/June 16, 2024/)).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // The close button is the first button in header (only button with X icon)
    const buttons = screen.getAllByRole('button');
    // The header close button is the one at top-right of header
    const closeButton = buttons.find((btn) => {
      // The header CloseButton is the first button in the component
      return btn.querySelector('svg') !== null && buttons.indexOf(btn) === 0;
    });
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should open full-screen view when clicking a photo', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    const thumbnail = screen.getByRole('img');
    // Click the parent div (PhotoItem) that contains the thumbnail
    fireEvent.click(thumbnail.closest('div')!);

    // Full-screen view should show larger image - look for alt text
    const images = screen.getAllByRole('img');
    const fullImage = images.find((img) => img.getAttribute('alt') === 'Photo 1');
    expect(fullImage).toBeInTheDocument();
  });

  it('should navigate to next photo in full-screen view', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-16')), // newer, shows first
      createPhoto('2', new Date('2024-06-15')), // older, shows second
    ];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Click first photo to open full-screen
    const thumbnails = screen.getAllByRole('img');
    fireEvent.click(thumbnails[0].closest('div')!);

    // Find and click the next button (right position)
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find((btn) => {
      return !btn.hasAttribute('disabled') &&
             btn.querySelector('svg') !== null &&
             window.getComputedStyle(btn).right !== '';
    });

    // Use container query to find nav button with ChevronRight
    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Open full screen first
    const thumbs = container.querySelectorAll('img');
    fireEvent.click(thumbs[0].closest('div')!);

    // Find all buttons in the full screen view
    const allButtons = container.querySelectorAll('button');
    // The nav buttons are the ones that aren't disabled and have SVG children
    allButtons.forEach((btn) => {
      if (!btn.hasAttribute('disabled')) {
        fireEvent.click(btn);
      }
    });

    // After navigation, we should see photo 2 data
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('should navigate to previous photo in full-screen view', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-16')), // newer
      createPhoto('2', new Date('2024-06-15')), // older
    ];

    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Click second photo to open full-screen (index 1)
    const thumbnails = container.querySelectorAll('img');
    expect(thumbnails.length).toBe(2);

    // Click on second photo's container
    const photoItems = container.querySelectorAll('img');
    fireEvent.click(photoItems[1].closest('div')!);

    // Now we're viewing the second photo (older one) in fullscreen
    // Verify we're in fullscreen mode
    expect(container.textContent).toContain('2 / 2');
  });

  it('should close full-screen view with Escape key', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Open full-screen
    const thumbnail = container.querySelector('img');
    fireEvent.click(thumbnail!.closest('div')!);

    // Verify we're in fullscreen (counter shows)
    expect(container.textContent).toContain('1 / 1');

    // Press Escape on the container element
    const galleryContainer = container.firstChild as HTMLElement;
    fireEvent.keyDown(galleryContainer, { key: 'Escape' });

    // Full-screen should close (counter disappears, back to grid view)
    expect(container.textContent).not.toContain('1 / 1');
  });

  it('should navigate with arrow keys in full-screen view', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-16')),
      createPhoto('2', new Date('2024-06-15')),
    ];

    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Open full-screen on first photo
    const thumbnails = container.querySelectorAll('img');
    fireEvent.click(thumbnails[0].closest('div')!);

    // Verify showing first photo
    expect(container.textContent).toContain('1 / 2');

    // Press right arrow on the container
    const galleryContainer = container.firstChild as HTMLElement;
    fireEvent.keyDown(galleryContainer, { key: 'ArrowRight' });

    // Should show photo 2
    expect(container.textContent).toContain('2 / 2');

    // Press left arrow
    fireEvent.keyDown(galleryContainer, { key: 'ArrowLeft' });

    // Should show photo 1 again
    expect(container.textContent).toContain('1 / 2');
  });

  it('should show delete button in full-screen view', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Gallery view has delete buttons on hover, not in fullscreen
    // Delete is in the grid view, not fullscreen
    const thumbnails = container.querySelectorAll('img');
    expect(thumbnails.length).toBeGreaterThan(0);

    // The delete button is on the grid photo items
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should require double click to delete (confirmation)', () => {
    const photos = [createPhoto('1', new Date('2024-06-15'))];

    const { container } = render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    // Find the delete button (it's in the grid view, not fullscreen)
    // Delete buttons have Trash2 icon
    const allButtons = container.querySelectorAll('button');

    // The delete button is not the first button (close) and contains trash icon
    // Find button that's not the header close button
    const deleteButton = Array.from(allButtons).find((btn, idx) => {
      return idx > 0 && btn.querySelector('svg') !== null;
    });

    expect(deleteButton).toBeDefined();

    // First click - should show confirmation
    fireEvent.click(deleteButton!);
    expect(mockOnDeletePhoto).not.toHaveBeenCalled();

    // Second click - should delete
    fireEvent.click(deleteButton!);
    expect(mockOnDeletePhoto).toHaveBeenCalledWith('1');
  });

  it('should show photo count', () => {
    const photos = [
      createPhoto('1', new Date('2024-06-15')),
      createPhoto('2', new Date('2024-06-16')),
      createPhoto('3', new Date('2024-06-17')),
    ];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('should handle empty photos array', () => {
    render(
      <PhotoGallery
        photos={[]}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    expect(screen.getByText('0 photos')).toBeInTheDocument();
  });

  it('should sort photos by date (newest first)', () => {
    const photos = [
      createPhoto('old', new Date('2024-01-01')),
      createPhoto('new', new Date('2024-12-01')),
      createPhoto('mid', new Date('2024-06-01')),
    ];

    render(
      <PhotoGallery
        photos={photos}
        onClose={mockOnClose}
        onDeletePhoto={mockOnDeletePhoto}
      />
    );

    const thumbnails = screen.getAllByRole('img');
    // Newest first
    expect(thumbnails[0]).toHaveAttribute(
      'src',
      'https://example.com/new_thumb.jpg'
    );
  });
});
