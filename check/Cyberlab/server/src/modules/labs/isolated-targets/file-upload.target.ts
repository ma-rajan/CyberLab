import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const storageRoot = path.resolve(process.cwd(), '.lab-storage', 'file-upload');
const completionToken = 'FILE_UPLOAD_MISMATCH_CONFIRMED';
const acceptedExtensions = new Set(['png', 'jpg', 'jpeg', 'gif']);
const acceptedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);

interface UploadMetadata { id: string; originalFilename: string; declaredMimeType: string; size: number; isMismatched: boolean; }

function userDirectory(userId: string) {
  // A hash avoids exposing platform identifiers in the target's storage layout.
  return path.join(storageRoot, createHash('sha256').update(userId).digest('hex'));
}
function extensionOf(filename: string) { return path.extname(filename).slice(1).toLowerCase(); }
function hasImageSignature(content: Buffer) {
  return (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (content.length >= 3 && content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (content.length >= 6 && ['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString('ascii')));
}
function isSafeUploadId(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }

/** Deliberately trusts client filename/MIME, but never executes or type-serves uploads. */
export async function uploadTrainingProfileImage(userId: string, filename: string, declaredMimeType: string, content: Buffer) {
  const normalizedFilename = path.basename(filename);
  if (!normalizedFilename || normalizedFilename !== filename || !acceptedExtensions.has(extensionOf(normalizedFilename)) || !acceptedMimeTypes.has(declaredMimeType) || content.length === 0 || content.length > 32 * 1024) {
    return { accepted: false, message: 'Profile images must use an accepted image filename and declared MIME type.', completionToken: null };
  }
  const id = randomUUID();
  const metadata: UploadMetadata = { id, originalFilename: normalizedFilename, declaredMimeType, size: content.length, isMismatched: !hasImageSignature(content) };
  const directory = userDirectory(userId);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${id}.bin`), content, { flag: 'wx' });
  await fs.writeFile(path.join(directory, `${id}.json`), JSON.stringify(metadata), { encoding: 'utf8', flag: 'wx' });
  return { accepted: true, id, filename: normalizedFilename, declaredMimeType, downloadPath: id, message: 'Profile image stored by the isolated training target.', completionToken: metadata.isMismatched ? completionToken : null };
}

export async function readTrainingUpload(userId: string, uploadId: string) {
  if (!isSafeUploadId(uploadId)) return null;
  try { return await fs.readFile(path.join(userDirectory(userId), `${uploadId}.bin`)); } catch { return null; }
}

export async function hasMismatchedTrainingUpload(userId: string) {
  try {
    const directory = userDirectory(userId);
    for (const entry of await fs.readdir(directory)) {
      if (!entry.endsWith('.json') || !isSafeUploadId(entry.slice(0, -5))) continue;
      const metadata = JSON.parse(await fs.readFile(path.join(directory, entry), 'utf8')) as UploadMetadata;
      if (metadata.isMismatched === true) return true;
    }
  } catch { /* No storage directory means no completed target interaction. */ }
  return false;
}
