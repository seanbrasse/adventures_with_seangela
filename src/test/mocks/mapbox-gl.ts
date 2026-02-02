const mockMap = {
  on: () => mockMap,
  off: () => mockMap,
  remove: () => {},
  addControl: () => mockMap,
  addSource: () => {},
  addLayer: () => {},
  getSource: () => null,
  getLayer: () => null,
  removeLayer: () => {},
  removeSource: () => {},
  flyTo: () => {},
  fitBounds: () => {},
  getCanvas: () => ({ style: {} }),
  resize: () => {},
  setStyle: () => {},
  getStyle: () => ({}),
  loaded: () => true,
};

export class Map {
  constructor() {
    return mockMap;
  }
}

export class Marker {
  private element = document.createElement('div');

  setLngLat() {
    return this;
  }

  addTo() {
    return this;
  }

  remove() {}

  getElement() {
    return this.element;
  }

  setPopup() {
    return this;
  }
}

export class Popup {
  setHTML() {
    return this;
  }

  setLngLat() {
    return this;
  }

  addTo() {
    return this;
  }

  remove() {}

  setDOMContent() {
    return this;
  }
}

export class NavigationControl {}

export class LngLatBounds {
  extend() {
    return this;
  }

  isEmpty() {
    return false;
  }

  toArray() {
    return [
      [0, 0],
      [0, 0],
    ];
  }
}

export default {
  Map,
  Marker,
  Popup,
  NavigationControl,
  LngLatBounds,
};
