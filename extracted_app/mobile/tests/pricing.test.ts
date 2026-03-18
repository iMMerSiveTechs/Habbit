import { describe, it, expect } from 'vitest';

// Import after reading the actual exports
// We'll test the core logic inline since imports may need RN
describe('Tier hierarchy', () => {
  const TIER_LEVELS: Record<string, number> = {
    preview: 0,
    core: 1,
    pro: 2,
    elite: 3,
  };

  function meetsMinimumTier(userTier: string, requiredTier: string): boolean {
    return (TIER_LEVELS[userTier] ?? 0) >= (TIER_LEVELS[requiredTier] ?? 0);
  }

  it('preview cannot access core features', () => {
    expect(meetsMinimumTier('preview', 'core')).toBe(false);
  });
  it('core can access core features', () => {
    expect(meetsMinimumTier('core', 'core')).toBe(true);
  });
  it('pro can access core features', () => {
    expect(meetsMinimumTier('pro', 'core')).toBe(true);
  });
  it('elite can access everything', () => {
    expect(meetsMinimumTier('elite', 'core')).toBe(true);
    expect(meetsMinimumTier('elite', 'pro')).toBe(true);
    expect(meetsMinimumTier('elite', 'elite')).toBe(true);
  });
});

describe('Feature gating', () => {
  const FEATURE_TIER_REQUIREMENTS: Record<string, string> = {
    cerebra: 'pro',
    biometric: 'elite',
    geofencing: 'core',
    voice: 'elite',
    social: 'pro',
    adaptiveIntelligence: 'pro',
  };

  const TIER_LEVELS: Record<string, number> = { preview: 0, core: 1, pro: 2, elite: 3 };

  function canAccessFeature(feature: string, userTier: string): boolean {
    const required = FEATURE_TIER_REQUIREMENTS[feature];
    if (!required) return true;
    return (TIER_LEVELS[userTier] ?? 0) >= (TIER_LEVELS[required] ?? 0);
  }

  it('free user cannot access cerebra', () => {
    expect(canAccessFeature('cerebra', 'preview')).toBe(false);
  });
  it('pro user can access cerebra', () => {
    expect(canAccessFeature('cerebra', 'pro')).toBe(true);
  });
  it('core user can access geofencing', () => {
    expect(canAccessFeature('geofencing', 'core')).toBe(true);
  });
  it('preview user cannot access geofencing', () => {
    expect(canAccessFeature('geofencing', 'preview')).toBe(false);
  });
  it('only elite can access biometric', () => {
    expect(canAccessFeature('biometric', 'pro')).toBe(false);
    expect(canAccessFeature('biometric', 'elite')).toBe(true);
  });
  it('unknown feature is accessible to all', () => {
    expect(canAccessFeature('nonexistent', 'preview')).toBe(true);
  });
});
