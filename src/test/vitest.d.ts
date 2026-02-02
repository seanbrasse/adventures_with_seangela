/// <reference types="vitest/globals" />

declare module 'vitest' {
  export interface Assertion<T = unknown> extends jest.Matchers<void, T> {}
}
