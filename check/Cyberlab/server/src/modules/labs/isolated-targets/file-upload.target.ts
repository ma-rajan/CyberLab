import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError } from '../../auth/auth.errors.js';
import { env } from '../../../config/env.js';

const completionToken = 'FILE_UPLOAD_MISMATCH_CONFIRMED';
const acceptedExtensions = new Set(['png', 'jpg', 'jpeg', 'gif']);
const acceptedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);
const uploadIdPattern = /^[0-9a-f-]{36}$/i;
const learnerDirectoryPattern = /^[0-9a-f]{64}$/;
const cleanupIntervalMs = 60 * 60 * 1000;

interface UploadMetadata {
  id: string;
  originalFilename: string;
  declaredMimeType: string;
  size: number;
  isMismatched: boolean;
  createdAt?: number;
}

export interface TrainingUploadStoreOptions {
  storageRoot: string | (() => string);
  maxFilesPerLearner: number;
  maxBytesPerLearner: number;
  maxBytesGlobal: number;
  ttlMs: number;
  now?: () => number;
  createId?: () => string;
}

interface StoreUsage {
  fileCount: number;
  bytes: number;
}

function extensionOf(filename: string) {
  return path.extname(filename).slice(1).toLowerCase();
}

function hasImageSignature(content: Buffer) {
  return (
    (content.length >= 8 &&
      content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (content.length >= 3 && content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (content.length >= 6 && ['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString('ascii')))
  );
}

function userDirectory(root: string, userId: string) {
  return path.join(root, createHash('sha256').update(userId).digest('hex'));
}

function isWithinRoot(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function ensureStorageRoot(root: string) {
  await fs.mkdir(root, { recursive: true });
  const details = await fs.lstat(root);
  const realRoot = await fs.realpath(root);
  if (!details.isDirectory() || details.isSymbolicLink() || path.resolve(realRoot) !== root) {
    throw new Error('Training upload storage root must be a real directory.');
  }
}

async function isSafeLearnerDirectory(root: string, directory: string) {
  if (!isWithinRoot(root, directory)) return false;
  try {
    const details = await fs.lstat(directory);
    return details.isDirectory() && !details.isSymbolicLink();
  } catch {
    return false;
  }
}

async function safeUnlink(root: string, filePath: string) {
  if (!isWithinRoot(root, filePath)) throw new Error('Refusing to remove a path outside training upload storage.');
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function parseMetadata(value: string): UploadMetadata | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const metadata = parsed as Partial<UploadMetadata>;
    if (
      typeof metadata.id !== 'string' ||
      !uploadIdPattern.test(metadata.id) ||
      typeof metadata.size !== 'number' ||
      !Number.isSafeInteger(metadata.size) ||
      metadata.size < 0 ||
      (metadata.createdAt !== undefined && (typeof metadata.createdAt !== 'number' || !Number.isFinite(metadata.createdAt))) ||
      typeof metadata.isMismatched !== 'boolean'
    ) return null;
    return metadata as UploadMetadata;
  } catch {
    return null;
  }
}

/**
 * Creates a quota-limited local upload store. Operations are serialized within
 * this store instance so concurrent requests in this Node process share atomic
 * quota decisions. Deploy only one server process unless the store is moved to
 * a cross-process lock or transactional reservation mechanism.
 */
export function createTrainingUploadStore(options: TrainingUploadStoreOptions) {
  const now = options.now ?? Date.now;
  const createId = options.createId ?? randomUUID;
  let operationQueue: Promise<void> = Promise.resolve();

  function withLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  function getRoot() {
    return path.resolve(typeof options.storageRoot === 'function' ? options.storageRoot() : options.storageRoot);
  }

  async function cleanExpiredUnlocked(root: string, currentTime: number) {
    await ensureStorageRoot(root);
    const learners = await fs.readdir(root, { withFileTypes: true });
    let removed = 0;

    for (const learner of learners) {
      if (!learner.isDirectory() || learner.isSymbolicLink() || !learnerDirectoryPattern.test(learner.name)) continue;
      const directory = path.join(root, learner.name);
      if (!isWithinRoot(root, directory)) continue;
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const fileIds = new Set<string>();
      for (const entry of entries) {
        const match = entry.name.match(/^([0-9a-f-]{36})\.(bin|json)$/i);
        if (match?.[1] && entry.isFile()) fileIds.add(match[1]);
        const partial = entry.name.match(/^([0-9a-f-]{36})\.(bin|json)\.tmp$/i);
        if (partial && entry.isFile()) {
          await safeUnlink(root, path.join(directory, entry.name));
          removed += 1;
        }
      }

      for (const id of fileIds) {
        const binaryPath = path.join(directory, `${id}.bin`);
        const metadataPath = path.join(directory, `${id}.json`);
        let binaryStat;
        let metadataStat;
        try {
          [binaryStat, metadataStat] = await Promise.all([fs.lstat(binaryPath), fs.lstat(metadataPath)]);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        const binaryIsSafe = Boolean(binaryStat?.isFile() && !binaryStat.isSymbolicLink());
        const metadataIsSafe = Boolean(metadataStat?.isFile() && !metadataStat.isSymbolicLink());
        if (!binaryIsSafe || !metadataIsSafe) {
          if (binaryStat && binaryIsSafe) await safeUnlink(root, binaryPath);
          if (metadataStat && metadataIsSafe) await safeUnlink(root, metadataPath);
          removed += 1;
          continue;
        }

        let metadata: UploadMetadata | null = null;
        try {
          metadata = parseMetadata(await fs.readFile(metadataPath, 'utf8'));
        } catch {
          // A malformed record is removed after its original upload TTL.
        }
        const timestamp = metadata?.createdAt ?? metadataStat!.mtimeMs;
        if (currentTime - timestamp >= options.ttlMs) {
          await safeUnlink(root, binaryPath);
          await safeUnlink(root, metadataPath);
          removed += 1;
        }
      }

      try {
        await fs.rmdir(directory);
      } catch (error) {
        if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      }
    }

    return removed;
  }

  async function scanUsageUnlocked(root: string, onlyUserDirectory?: string): Promise<StoreUsage> {
    const learners = await fs.readdir(root, { withFileTypes: true });
    const usage: StoreUsage = { fileCount: 0, bytes: 0 };
    for (const learner of learners) {
      if (!learner.isDirectory() || learner.isSymbolicLink() || !learnerDirectoryPattern.test(learner.name)) continue;
      const directory = path.join(root, learner.name);
      if (!isWithinRoot(root, directory) || (onlyUserDirectory && directory !== onlyUserDirectory)) continue;
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/^([0-9a-f-]{36})\.(bin|json)$/i.test(entry.name)) continue;
        const filePath = path.join(directory, entry.name);
        if (!isWithinRoot(root, filePath)) continue;
        const details = await fs.lstat(filePath);
        if (!details.isFile() || details.isSymbolicLink()) continue;
        if (entry.name.endsWith('.bin')) usage.fileCount += 1;
        usage.bytes += details.size;
      }
    }
    return usage;
  }

  async function cleanupExpiredUploads(currentTime = now()) {
    return withLock(async () => cleanExpiredUnlocked(getRoot(), currentTime));
  }

  async function upload(userId: string, filename: string, declaredMimeType: string, content: Buffer) {
    const normalizedFilename = path.basename(filename);
    if (
      !normalizedFilename || normalizedFilename !== filename ||
      !acceptedExtensions.has(extensionOf(normalizedFilename)) ||
      !acceptedMimeTypes.has(declaredMimeType) ||
      content.length === 0 || content.length > 32 * 1024
    ) {
      return { accepted: false as const, message: 'Profile images must use an accepted image filename and declared MIME type.', completionToken: null };
    }

    return withLock(async () => {
      const root = getRoot();
      const currentTime = now();
      await cleanExpiredUnlocked(root, currentTime);
      const directory = userDirectory(root, userId);
      if (!isWithinRoot(root, directory)) throw new Error('Invalid training upload directory.');

      const [userUsage, globalUsage] = await Promise.all([
        scanUsageUnlocked(root, directory),
        scanUsageUnlocked(root),
      ]);
      const id = createId();
      if (!uploadIdPattern.test(id)) throw new Error('Upload identifier generator returned an invalid identifier.');
      const metadata: UploadMetadata = {
        id,
        originalFilename: normalizedFilename,
        declaredMimeType,
        size: content.length,
        isMismatched: !hasImageSignature(content),
        createdAt: currentTime,
      };
      const metadataContent = JSON.stringify(metadata);
      const storedBytes = content.length + Buffer.byteLength(metadataContent);
      if (
        userUsage.fileCount >= options.maxFilesPerLearner ||
        userUsage.bytes + storedBytes > options.maxBytesPerLearner ||
        globalUsage.bytes + storedBytes > options.maxBytesGlobal
      ) {
        throw new AppError(429, 'UPLOAD_QUOTA_EXCEEDED', 'Training upload storage quota exceeded. Remove or wait for older training uploads to expire before trying again.');
      }

      await fs.mkdir(directory, { recursive: true });
      const directoryStat = await fs.lstat(directory);
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('Training upload directory must be a real directory.');

      const binaryPath = path.join(directory, `${id}.bin`);
      const metadataPath = path.join(directory, `${id}.json`);
      const temporaryBinaryPath = `${binaryPath}.tmp`;
      const temporaryMetadataPath = `${metadataPath}.tmp`;
      let binaryPromoted = false;
      let metadataPromoted = false;
      try {
        await fs.writeFile(temporaryBinaryPath, content, { flag: 'wx' });
        await fs.writeFile(temporaryMetadataPath, metadataContent, { encoding: 'utf8', flag: 'wx' });
        await fs.link(temporaryBinaryPath, binaryPath);
        binaryPromoted = true;
        await fs.unlink(temporaryBinaryPath);
        await fs.link(temporaryMetadataPath, metadataPath);
        metadataPromoted = true;
        await fs.unlink(temporaryMetadataPath);
      } catch (error) {
        const cleanupPaths = [
          temporaryBinaryPath,
          temporaryMetadataPath,
          binaryPromoted ? binaryPath : null,
          metadataPromoted ? metadataPath : null,
        ].filter((filePath): filePath is string => filePath !== null);
        await Promise.all(cleanupPaths.map((filePath) => safeUnlink(root, filePath)));
        await fs.rmdir(directory).catch(() => undefined);
        throw error;
      }

      return {
        accepted: true as const,
        id,
        filename: normalizedFilename,
        declaredMimeType,
        downloadPath: id,
        message: 'Profile image stored by the isolated training target.',
        completionToken: metadata.isMismatched ? completionToken : null,
      };
    });
  }

  async function read(userId: string, uploadId: string) {
    if (!uploadIdPattern.test(uploadId)) return null;
    return withLock(async () => {
      const root = getRoot();
      await cleanExpiredUnlocked(root, now());
      const directory = userDirectory(root, userId);
      if (!(await isSafeLearnerDirectory(root, directory))) return null;
      const filePath = path.join(directory, `${uploadId}.bin`);
      if (!isWithinRoot(root, filePath)) return null;
      try {
        const details = await fs.lstat(filePath);
        if (!details.isFile() || details.isSymbolicLink()) return null;
        return await fs.readFile(filePath);
      } catch {
        return null;
      }
    });
  }

  async function hasMismatchedUpload(userId: string) {
    return withLock(async () => {
      const root = getRoot();
      await cleanExpiredUnlocked(root, now());
      const directory = userDirectory(root, userId);
      if (!(await isSafeLearnerDirectory(root, directory))) return false;
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const match = entry.name.match(/^([0-9a-f-]{36})\.json$/i);
          if (!match?.[1] || !entry.isFile()) continue;
          const metadataPath = path.join(directory, entry.name);
          const binaryPath = path.join(directory, `${match[1]}.bin`);
          if (!isWithinRoot(root, metadataPath) || !isWithinRoot(root, binaryPath)) continue;
          const metadataStat = await fs.lstat(metadataPath);
          const binaryStat = await fs.lstat(binaryPath).catch(() => null);
          if (!metadataStat.isFile() || metadataStat.isSymbolicLink() || !binaryStat?.isFile() || binaryStat.isSymbolicLink()) continue;
          const metadata = parseMetadata(await fs.readFile(metadataPath, 'utf8'));
          if (metadata?.isMismatched) return true;
        }
      } catch {
        return false;
      }
      return false;
    });
  }

  return { upload, read, hasMismatchedUpload, cleanupExpiredUploads };
}

const defaultStore = createTrainingUploadStore({
  storageRoot: () => {
    const testRoot = process.env.NODE_ENV === 'test' ? process.env.CYBERLAB_TEST_FILE_UPLOAD_ROOT : undefined;
    return testRoot || path.resolve(process.cwd(), '.lab-storage', 'file-upload');
  },
  maxFilesPerLearner: env.LAB_UPLOAD_MAX_FILES_PER_LEARNER,
  maxBytesPerLearner: env.LAB_UPLOAD_MAX_BYTES_PER_LEARNER,
  maxBytesGlobal: env.LAB_UPLOAD_MAX_BYTES_GLOBAL,
  ttlMs: env.LAB_UPLOAD_TTL_HOURS * 60 * 60 * 1000,
});

export const uploadTrainingProfileImage = defaultStore.upload;
export const readTrainingUpload = defaultStore.read;
export const hasMismatchedTrainingUpload = defaultStore.hasMismatchedUpload;
export const cleanupExpiredTrainingUploads = defaultStore.cleanupExpiredUploads;

/** Runs startup cleanup and an unref'ed hourly sweep for abandoned uploads. */
export function startTrainingUploadCleanup() {
  const runCleanup = () => {
    void cleanupExpiredTrainingUploads().catch((error: unknown) => {
      console.error('Training upload cleanup failed.', error);
    });
  };
  runCleanup();
  const timer = setInterval(runCleanup, cleanupIntervalMs);
  timer.unref();
  return timer;
}
