import '@testing-library/jest-dom';
import { vi } from 'vitest';

// mapbox-gl and react-map-gl are mocked via vitest aliases in vitest.config.ts

// Mock exifr
vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(() => Promise.resolve(null)),
  },
  parse: vi.fn(() => Promise.resolve(null)),
}));

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn((options) => Promise.resolve(options.blob)),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock localStorage with actual storage behavior
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4).fill(0) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4).fill(0) })),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
}));

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(new Blob(['mock'], { type: 'image/jpeg' })));

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 100;
  height = 100;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.Image = MockImage as unknown as typeof Image;

// Mock FileReader
class MockFileReader {
  onload: ((event: { target: { result: string } }) => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock';
      if (this.onload) this.onload({ target: { result: this.result as string } });
    }, 0);
  }

  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload({ target: { result: this.result as string } });
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;
