import React from 'react';

export const Map = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-map' }, children);
};

export const Marker = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-marker' }, children);
};

export const Popup = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-popup' }, children);
};

export const NavigationControl = () => null;

export const Source = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'mock-source' }, children);
};

export const Layer = () => null;

export default Map;
