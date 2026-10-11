import { afterEach, describe, expect, it, vi } from 'vitest';
import fsPromises from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { hasCompletedSstiExercise, renderSstiPreview, resetSstiExerciseState } from '../../src/modules/labs/isolated-targets/ssti-preview.target.js';

afterEach(() => {
  vi.restoreAllMocks();
  resetSstiExerciseState();
});

describe('isolated SSTI evaluator', () => {
  it('evaluates only bounded arithmetic, fixed training keys, and quoted string concatenation', () => {
    expect(renderSstiPreview('learner-a', 'Total: {{7*7}}')).toMatchObject({
      vulnerableOutput: 'Preview: Total: 49',
      secureOutput: 'Preview: Total: {{7*7}}',
      completionToken: null,
    });
    expect(renderSstiPreview('learner-a', '{{"Hello " + learner.name}}')?.vulnerableOutput)
      .toBe('Preview: Hello Avery');
    expect(renderSstiPreview('learner-a', '{{account.plan}}')?.vulnerableOutput)
      .toBe('Preview: Training');
  });

  it('rejects code-like expressions, unknown names, malformed templates, and unsafe arithmetic', () => {
    const marker = globalThis as typeof globalThis & { __cyberlabSstiMarker?: boolean };
    marker.__cyberlabSstiMarker = false;
    for (const input of [
      '{{process.env}}',
      '{{globalThis.process}}',
      '{{constructor.constructor("return process")()}}',
      '{{fetch("https://example.test")}}',
      '{{require("node:fs").readFileSync("/etc/passwd")}}',
      '{{globalThis.__cyberlabSstiMarker = true}}',
      '{{7/0}}',
      '{{1000000*1000000}}',
      '{{7*7',
    ]) {
      expect(renderSstiPreview('learner-a', input), input).toBeNull();
    }
    expect(marker.__cyberlabSstiMarker).toBe(false);
    delete marker.__cyberlabSstiMarker;
  });

  it('performs no filesystem or network operation while rendering', () => {
    const readFile = vi.spyOn(fsPromises, 'readFile');
    const httpRequest = vi.spyOn(http, 'request');
    const httpsRequest = vi.spyOn(https, 'request');
    const fetch = vi.spyOn(globalThis, 'fetch');

    expect(renderSstiPreview('learner-a', '{{7*7}}')?.vulnerableOutput).toBe('Preview: 49');
    expect(readFile).not.toHaveBeenCalled();
    expect(httpRequest).not.toHaveBeenCalled();
    expect(httpsRequest).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records completion evidence per learner only after arithmetic and training-context access', () => {
    expect(hasCompletedSstiExercise('learner-a')).toBe(false);
    renderSstiPreview('learner-a', '{{7*7}}');
    expect(hasCompletedSstiExercise('learner-a')).toBe(false);
    renderSstiPreview('learner-a', '{{training.completion}}');
    expect(hasCompletedSstiExercise('learner-a')).toBe(true);
    expect(hasCompletedSstiExercise('learner-b')).toBe(false);
  });
});
