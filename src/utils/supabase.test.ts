import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', '');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

describe('supabase utility', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export isSupabaseConfigured as false when env vars not set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { isSupabaseConfigured } = await import('./supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('should export supabase as null when not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { supabase } = await import('./supabase');
    expect(supabase).toBeNull();
  });

  it('should handle missing URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

    vi.resetModules();
    const { isSupabaseConfigured } = await import('./supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('should handle missing key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const { isSupabaseConfigured } = await import('./supabase');
    expect(isSupabaseConfigured).toBe(false);
  });
});
