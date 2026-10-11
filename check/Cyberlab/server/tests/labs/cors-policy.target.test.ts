import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetCorsExerciseState,
  simulateCorsPolicy,
} from '../../src/modules/labs/isolated-targets/cors-policy.target.js';

afterEach(() => {
  resetCorsExerciseState();
  vi.restoreAllMocks();
});

describe('isolated CORS policy simulator', () => {
  it('normalizes the full origin tuple and treats scheme, host, and port mismatches as untrusted', () => {
    const trusted = simulateCorsPolicy('learner', {
      origin: 'https://app.training.test/', method: 'GET', headers: [], credentials: true,
    });
    expect(trusted.origin).toMatchObject({ normalized: 'https://app.training.test', valid: true, trusted: true });
    expect(trusted.policies.allowlist.browserCanReadResponse).toBe(true);

    for (const origin of ['http://app.training.test', 'https://app.training.test:444', 'https://other.training.test']) {
      const result = simulateCorsPolicy(origin, { origin, method: 'GET', headers: [], credentials: true });
      expect(result.origin.trusted).toBe(false);
      expect(result.policies.allowlist.browserCanReadResponse).toBe(false);
    }
  });

  it('handles missing and malformed origins without authorizing cross-origin reads', () => {
    for (const origin of [undefined, '', 'not an origin', 'javascript:alert(1)', 'https://user:pass@app.training.test/path']) {
      const result = simulateCorsPolicy('learner', { origin, method: 'GET', headers: [], credentials: true });
      expect(result.origin.valid).toBe(false);
      expect(result.policies.permissive.responseHeaders['Access-Control-Allow-Origin']).toBeUndefined();
      expect(result.policies.permissive.browserCanReadResponse).toBe(false);
    }
  });

  it('distinguishes a server-handled simple request from browser response readability', () => {
    const result = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'GET', headers: [], credentials: true,
    });
    expect(result.request.preflightRequired).toBe(false);
    expect(result.policies.permissive.actualRequestProcessed).toBe(true);
    expect(result.policies.permissive.responseHeaders['Access-Control-Allow-Origin']).toBe('https://attacker.training.test');
    expect(result.policies.permissive.browserCanReadResponse).toBe(true);
    expect(result.policies.allowlist.actualRequestProcessed).toBe(true);
    expect(result.policies.allowlist.responseHeaders['Access-Control-Allow-Origin']).toBeUndefined();
    expect(result.policies.allowlist.browserCanReadResponse).toBe(false);
  });

  it('simulates OPTIONS preflight method and header checks before the actual request', () => {
    const headers = [{ name: 'X-Training-Client', value: 'demo' }];
    const permissive = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'PUT', headers, credentials: true,
    }).policies.permissive;
    expect(permissive.preflightRequired).toBe(true);
    expect(permissive.preflightResponseHeaders?.['Access-Control-Allow-Methods']).toContain('PUT');
    expect(permissive.preflightAllowed).toBe(true);
    expect(permissive.actualRequestProcessed).toBe(true);
    expect(permissive.browserCanReadResponse).toBe(true);

    const secure = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'PUT', headers, credentials: true,
    }).policies.allowlist;
    expect(secure.preflightAllowed).toBe(false);
    expect(secure.actualRequestProcessed).toBe(false);
    expect(secure.responseHeaders).toEqual({});

    const rejectedHeader = simulateCorsPolicy('learner', {
      origin: 'https://app.training.test', method: 'POST',
      headers: [{ name: 'X-Not-Allowed', value: 'no' }], credentials: true,
    }).policies.allowlist;
    expect(rejectedHeader.preflightAllowed).toBe(false);
  });

  it('shows that wildcard origin cannot make a credentialed response readable', () => {
    const credentialed = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'GET', headers: [], credentials: true,
    }).policies.wildcardWithCredentials;
    expect(credentialed.responseHeaders).toMatchObject({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    });
    expect(credentialed.browserCanReadResponse).toBe(false);

    const publicRequest = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'GET', headers: [], credentials: false,
    }).policies.wildcardWithCredentials;
    expect(publicRequest.browserCanReadResponse).toBe(true);
  });

  it('uses only local deterministic policy evaluation and synthetic response data', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = simulateCorsPolicy('learner', {
      origin: 'https://attacker.training.test', method: 'GET', headers: [], credentials: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.policies.permissive.syntheticResponse).toContain('Synthetic profile response');
    expect(result.policies.allowlist.syntheticResponse).toBeNull();
  });
});
