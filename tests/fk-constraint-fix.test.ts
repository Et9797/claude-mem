/**
 * Tests for ensureMemorySessionIdRegistered FK constraint fix
 *
 * Mock Justification: NONE (0% mock code)
 * - Uses real SQLite with ':memory:' - tests actual SQL and schema
 * - All FK constraint scenarios are tested against real database behavior
 *
 * Value: Validates FK constraint handling for memory_session_id registration
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../src/services/sqlite/SessionStore.js';

describe('ensureMemorySessionIdRegistered', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should register new memory_session_id and return true', () => {
    const claudeId = 'claude-session-1';
    const memoryId = 'memory-session-1';
    const sessionDbId = store.createSDKSession(claudeId, 'test-project', 'initial prompt');

    const result = store.ensureMemorySessionIdRegistered(sessionDbId, memoryId);

    expect(result).toBe(true);

    // Verify the memory_session_id was actually set
    const session = store.getSessionById(sessionDbId);
    expect(session?.memory_session_id).toBe(memoryId);
  });

  it('should return false when called twice with same ID (idempotent)', () => {
    const claudeId = 'claude-session-2';
    const memoryId = 'memory-session-2';
    const sessionDbId = store.createSDKSession(claudeId, 'test-project', 'initial prompt');

    const firstResult = store.ensureMemorySessionIdRegistered(sessionDbId, memoryId);
    const secondResult = store.ensureMemorySessionIdRegistered(sessionDbId, memoryId);

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false);

    // Verify the memory_session_id is still correctly set
    const session = store.getSessionById(sessionDbId);
    expect(session?.memory_session_id).toBe(memoryId);
  });

  it('should throw error when session does not exist', () => {
    const nonExistentSessionId = 99999;
    const memoryId = 'memory-session-nonexistent';

    expect(() => {
      store.ensureMemorySessionIdRegistered(nonExistentSessionId, memoryId);
    }).toThrow('does not exist');
  });

  it('should throw error when different ID already registered', () => {
    const claudeId = 'claude-session-3';
    const memoryId1 = 'memory-session-3a';
    const memoryId2 = 'memory-session-3b';
    const sessionDbId = store.createSDKSession(claudeId, 'test-project', 'initial prompt');

    // Register the first memory_session_id
    store.ensureMemorySessionIdRegistered(sessionDbId, memoryId1);

    // Try to register a different memory_session_id
    expect(() => {
      store.ensureMemorySessionIdRegistered(sessionDbId, memoryId2);
    }).toThrow('already has different');
  });
});
