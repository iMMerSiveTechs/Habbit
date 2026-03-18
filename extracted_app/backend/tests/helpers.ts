/**
 * Test helper utilities for Habbit backend tests.
 * These helpers test pure business logic without requiring
 * a database connection or HTTP server.
 */

// Re-export tier functions for testing
export { getTierLevel, meetsMinimumTier, getLimits, FREE_LIMITS, CORE_LIMITS, PRO_LIMITS } from '../src/tierGuard';
