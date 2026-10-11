import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTrainingUploadStore } from '../../src/modules/labs/isolated-targets/file-upload.target.js';

const roots: string[] = [];
const fixedId = '00000000-0000-4000-8000-000000000001';

async function makeRoot() {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'cyberlab-upload-quota-'));
  roots.push(root);
  return root;
}

function makeStore(storageRoot: string, overrides: Partial<Parameters<typeof createTrainingUploadStore>[0]> = {}) {
  let nextId = 0;
  return createTrainingUploadStore({
    storageRoot,
    maxFilesPerLearner: 10,
    maxBytesPerLearner: 1024 * 1024,
    maxBytesGlobal: 1024 * 1024,
    ttlMs: 60 * 60 * 1000,
    now: () => 1_000,
    createId: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`,
    ...overrides,
  });
}

function storedBytesFor(content: Buffer, createdAt = 1_000) {
  const metadata = {
    id: fixedId,
    originalFilename: 'proof.png',
    declaredMimeType: 'image/png',
    size: content.length,
    isMismatched: true,
    createdAt,
  };
  return content.length + Buffer.byteLength(JSON.stringify(metadata));
}

async function upload(store: ReturnType<typeof makeStore>, userId: string, content = Buffer.from('x'), filename = 'proof.png') {
  return store.upload(userId, filename, 'image/png', content);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('bounded file-upload storage', () => {
  it('accepts an upload exactly at the per-learner byte quota and rejects the next byte without writing', async () => {
    const root = await makeRoot();
    const exactContent = Buffer.from('x');
    const maxBytes = storedBytesFor(exactContent);
    const store = makeStore(root, { maxBytesPerLearner: maxBytes, maxBytesGlobal: maxBytes * 4 });

    const exact = await upload(store, 'learner-a', exactContent);
    expect(exact.accepted).toBe(true);
    await expect(upload(store, 'learner-a', Buffer.from('y'))).rejects.toMatchObject({
      status: 429,
      code: 'UPLOAD_QUOTA_EXCEEDED',
    });
    expect(await fs.readdir(path.join(root, '64c72cbd49c712030dc5394b9fc3838a28b862f9ae822d2f47243a4250da0214')))
      .toHaveLength(2);
  });

  it('enforces the per-learner file count and global byte quota while isolating learners', async () => {
    const root = await makeRoot();
    const recordBytes = storedBytesFor(Buffer.from('x'));
    const store = makeStore(root, {
      maxFilesPerLearner: 1,
      maxBytesPerLearner: recordBytes * 4,
      maxBytesGlobal: recordBytes * 2,
    });

    const learnerAUpload = await upload(store, 'learner-a');
    expect(learnerAUpload.accepted).toBe(true);
    if (!learnerAUpload.accepted) throw new Error('Learner A upload should be accepted.');
    await expect(upload(store, 'learner-a', Buffer.from('z'), 'second.png'))
      .rejects.toMatchObject({ code: 'UPLOAD_QUOTA_EXCEEDED' });
    const learnerBUpload = await upload(store, 'learner-b');
    expect(learnerBUpload.accepted).toBe(true);
    if (!learnerBUpload.accepted) throw new Error('Learner B upload should be accepted.');
    await expect(upload(store, 'learner-c')).rejects.toMatchObject({
      status: 429,
      code: 'UPLOAD_QUOTA_EXCEEDED',
    });
    expect(await store.read('learner-a', learnerAUpload.id)).toEqual(Buffer.from('x'));
    expect(await store.read('learner-b', learnerBUpload.id)).toEqual(Buffer.from('x'));
    expect(await store.read('learner-c', fixedId)).toBeNull();
  });

  it('serializes concurrent uploads so only requests within all quotas succeed', async () => {
    const root = await makeRoot();
    const recordBytes = storedBytesFor(Buffer.from('x'));
    const store = makeStore(root, {
      maxFilesPerLearner: 2,
      maxBytesPerLearner: recordBytes * 2,
      maxBytesGlobal: recordBytes * 2,
    });

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => upload(store, 'same-learner', Buffer.from('x'))),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(6);
    const learners = await fs.readdir(root);
    expect(learners).toHaveLength(1);
    expect(await fs.readdir(path.join(root, learners[0]!))).toHaveLength(4);
  });

  it('removes expired uploads and preserves unexpired uploads and files outside its root', async () => {
    const root = await makeRoot();
    const outside = `${root}-sibling`;
    roots.push(outside);
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'keep.txt'), 'untouched');
    let currentTime = 0;
    let nextId = 0;
    const store = makeStore(root, {
      now: () => currentTime,
      ttlMs: 1_000,
      createId: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`,
    });

    const expired = await upload(store, 'learner-a', Buffer.from('old'));
    currentTime = 500;
    const active = await upload(store, 'learner-a', Buffer.from('fresh'), 'fresh.png');
    currentTime = 1_200;
    await expect(store.read('learner-a', expired.id!)).resolves.toBeNull();
    await expect(store.read('learner-a', active.id!)).resolves.toEqual(Buffer.from('fresh'));
    const learnerDirectory = path.join(root, '64c72cbd49c712030dc5394b9fc3838a28b862f9ae822d2f47243a4250da0214');
    expect((await fs.readdir(learnerDirectory)).sort()).toEqual([`${active.id}.bin`, `${active.id}.json`].sort());
    expect(await fs.readFile(path.join(outside, 'keep.txt'), 'utf8')).toBe('untouched');
  });

  it('does not follow symlinked upload records outside the lab storage root', async () => {
    const root = await makeRoot();
    const outside = `${root}-outside`;
    roots.push(outside);
    await fs.mkdir(outside);
    const outsideFile = path.join(outside, 'keep.bin');
    await fs.writeFile(outsideFile, 'outside data');
    const learnerDirectory = path.join(root, createHash('sha256').update('learner-a').digest('hex'));
    await fs.mkdir(learnerDirectory);
    await fs.symlink(outsideFile, path.join(learnerDirectory, `${fixedId}.bin`));
    await fs.writeFile(path.join(learnerDirectory, `${fixedId}.json`), JSON.stringify({
      id: fixedId,
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      size: 12,
      isMismatched: true,
      createdAt: 1_000,
    }));
    const store = makeStore(root);

    await expect(store.read('learner-a', fixedId)).resolves.toBeNull();
    await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('outside data');
  });

  it('expires malformed records and removes missing-file orphans safely', async () => {
    const root = await makeRoot();
    let currentTime = Date.now();
    const store = makeStore(root, { now: () => currentTime, ttlMs: 60 * 60 * 1000 });
    const saved = await upload(store, 'learner-a');
    if (!saved.accepted) throw new Error('Initial upload should be accepted.');
    const learnerDirectory = path.join(root, createHash('sha256').update('learner-a').digest('hex'));
    const metadataPath = path.join(learnerDirectory, `${saved.id}.json`);
    await fs.writeFile(metadataPath, '{ malformed metadata');

    await expect(store.hasMismatchedUpload('learner-a')).resolves.toBe(false);
    await expect(fs.readFile(path.join(learnerDirectory, `${saved.id}.bin`))).resolves.toEqual(Buffer.from('x'));

    currentTime += 60 * 60 * 1000 + 1_000;
    await expect(store.cleanupExpiredUploads()).resolves.toBe(1);
    await expect(fs.access(metadataPath)).rejects.toThrow();

    const orphaned = await upload(store, 'learner-a', Buffer.from('orphan'));
    if (!orphaned.accepted) throw new Error('Upload after expiry should be accepted.');
    const orphanMetadataPath = path.join(learnerDirectory, `${orphaned.id}.json`);
    await fs.unlink(path.join(learnerDirectory, `${orphaned.id}.bin`));
    await expect(store.cleanupExpiredUploads()).resolves.toBeGreaterThanOrEqual(1);
    await expect(fs.access(orphanMetadataPath)).rejects.toThrow();

    expect((await upload(store, 'learner-a')).accepted).toBe(true);
  });

  it('fails closed on cleanup I/O errors and allows a later upload after cleanup succeeds', async () => {
    const root = await makeRoot();
    let currentTime = 0;
    const store = makeStore(root, { now: () => currentTime, ttlMs: 1_000, maxFilesPerLearner: 1 });
    const oldUpload = await upload(store, 'learner-a');
    if (!oldUpload.accepted) throw new Error('Initial upload should be accepted.');
    currentTime = 1_000;
    const binaryPath = path.join(
      root,
      createHash('sha256').update('learner-a').digest('hex'),
      `${oldUpload.id}.bin`,
    );
    const originalUnlink = fs.unlink.bind(fs);
    vi.spyOn(fs, 'unlink').mockImplementation(async (filePath) => {
      if (filePath === binaryPath) throw Object.assign(new Error('simulated cleanup permission error'), { code: 'EACCES' });
      return originalUnlink(filePath);
    });

    await expect(upload(store, 'learner-a', Buffer.from('new'))).rejects.toMatchObject({ code: 'EACCES' });
    vi.restoreAllMocks();
    expect((await upload(store, 'learner-a', Buffer.from('new'))).accepted).toBe(true);
  });

  it('cleans temporary and final files after a failed atomic write without reserving quota', async () => {
    const root = await makeRoot();
    const store = makeStore(root, { maxFilesPerLearner: 1 });
    const originalLink = fs.link.bind(fs);
    let linkCount = 0;
    vi.spyOn(fs, 'link').mockImplementation(async (source, destination) => {
      linkCount += 1;
      if (linkCount === 2) throw new Error('simulated metadata promotion failure');
      return originalLink(source, destination);
    });

    await expect(upload(store, 'learner-a')).rejects.toThrow('simulated metadata promotion failure');
    vi.restoreAllMocks();
    const learnerDirectory = path.join(root, '64c72cbd49c712030dc5394b9fc3838a28b862f9ae822d2f47243a4250da0214');
    await expect(fs.access(learnerDirectory)).rejects.toThrow();
    expect((await upload(store, 'learner-a')).accepted).toBe(true);
  });

  it('removes a partially written temporary file when the write itself fails', async () => {
    const root = await makeRoot();
    const store = makeStore(root, { maxFilesPerLearner: 1 });
    const originalWrite = fs.writeFile.bind(fs);
    vi.spyOn(fs, 'writeFile').mockImplementation(async (...args) => {
      await originalWrite(...args);
      throw new Error('simulated disk write failure');
    });

    await expect(upload(store, 'learner-a')).rejects.toThrow('simulated disk write failure');
    vi.restoreAllMocks();
    const learnerDirectory = path.join(root, '64c72cbd49c712030dc5394b9fc3838a28b862f9ae822d2f47243a4250da0214');
    await expect(fs.access(learnerDirectory)).rejects.toThrow();
    expect((await upload(store, 'learner-a')).accepted).toBe(true);
  });

  it('keeps generated identifiers and cleanup scoped to the configured lab directory', async () => {
    const root = await makeRoot();
    const store = makeStore(root, { createId: () => fixedId });
    const accepted = await upload(store, 'learner-a');
    expect(accepted).toMatchObject({ accepted: true, id: fixedId });
    expect(await store.read('learner-a', '../../package.json')).toBeNull();
    expect(await store.cleanupExpiredUploads()).toBe(0);
  });
});
