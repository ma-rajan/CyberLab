import { describe, expect, it } from 'vitest';
import '../helpers/lab-test-setup.js';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createFileUploadChallenge, authenticatedAgent } from '../helpers/lab-test-fixtures.js';

describe('lab API: file-upload', () => {
  it('keeps profile uploads isolated, serves normal images only as downloads, and accepts the intended weak-validation mismatch', async () => {
    await createFileUploadChallenge();
    await request(app).post('/api/labs/file-upload-validation/target/upload').expect(401);
    const { agent, token } = await authenticatedAgent('platform_learner', 'learner@example.test');
    await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'portrait.png')
      .set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('fixture'))
      .expect(404);
    await agent
      .post('/api/labs/file-upload-validation/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);

    const rejected = await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'notes.txt')
      .set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('harmless plain text'))
      .expect(200);
    expect(rejected.body.data).toMatchObject({ accepted: false, completionToken: null });

    const normal = await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'portrait.png')
      .set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      .expect(200);
    expect(normal.body.data).toMatchObject({
      accepted: true,
      filename: 'portrait.png',
      completionToken: null,
    });
    const normalDownload = await agent
      .get(`/api/labs/file-upload-validation/target/files/${normal.body.data.id}`)
      .expect(200);
    expect(normalDownload.headers['content-type']).toContain('application/octet-stream');
    expect(normalDownload.headers['content-disposition']).toContain('attachment');
    expect(normalDownload.headers['x-content-type-options']).toBe('nosniff');
    expect(normalDownload.body).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const mismatch = await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'notes.png')
      .set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.from('harmless plain text, never executed'))
      .expect(200);
    expect(mismatch.body.data).toMatchObject({
      accepted: true,
      filename: 'notes.png',
      completionToken: 'FILE_UPLOAD_MISMATCH_CONFIRMED',
    });
    expect(JSON.stringify(mismatch.body)).not.toContain('platform_learner');

    const learner = await prisma.user.findUniqueOrThrow({
      where: { username: 'platform_learner' },
    });
    const storageRoot = path.resolve(process.cwd(), '.lab-storage', 'file-upload');
    const learnerDirectory = path.resolve(
      storageRoot,
      createHash('sha256').update(learner.id).digest('hex'),
    );
    const storedPath = path.resolve(learnerDirectory, `${mismatch.body.data.id}.bin`);
    expect(storedPath.startsWith(`${learnerDirectory}${path.sep}`)).toBe(true);
    expect(await fs.readFile(storedPath)).toEqual(
      Buffer.from('harmless plain text, never executed'),
    );
    expect(await fs.readdir(storageRoot)).toEqual([path.basename(learnerDirectory)]);
    await agent.get('/api/labs/file-upload-validation/target/files/../../package.json').expect(404);

    const otherLearner = await authenticatedAgent('other_learner', 'other@example.test');
    await otherLearner.agent
      .post('/api/labs/file-upload-validation/start')
      .set('X-CSRF-Token', otherLearner.token)
      .send({})
      .expect(200);
    await otherLearner.agent
      .get(`/api/labs/file-upload-validation/target/files/${mismatch.body.data.id}`)
      .expect(404);
  });

  it('rejects malformed upload requests without writing files outside the training directory', async () => {
    await createFileUploadChallenge();
    const { agent, token } = await authenticatedAgent(
      'malformed_uploader',
      'malformed@example.test',
    );
    await agent
      .post('/api/labs/file-upload-validation/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);

    await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('missing metadata'))
      .expect(400);
    const empty = await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'empty.png')
      .set('X-Upload-Mime-Type', 'image/png')
      .send(Buffer.alloc(0))
      .expect(200);
    expect(empty.body.data).toMatchObject({ accepted: false, completionToken: null });

    const projectFile = path.resolve(process.cwd(), 'package.json');
    expect(await fs.readFile(projectFile, 'utf8')).toContain('"name": "@cyberlab/server"');
    const storageRoot = path.resolve(process.cwd(), '.lab-storage', 'file-upload');
    const learner = await prisma.user.findUniqueOrThrow({
      where: { username: 'malformed_uploader' },
    });
    const learnerDirectory = path.resolve(
      storageRoot,
      createHash('sha256').update(learner.id).digest('hex'),
    );
    await expect(fs.access(learnerDirectory)).rejects.toThrow();
    await expect(fs.access(path.resolve(process.cwd(), 'notes.txt'))).rejects.toThrow();
  });

  it('validates File Upload only after the intended mismatched target interaction', async () => {
    const lab = await createFileUploadChallenge();
    const { agent, token } = await authenticatedAgent('learner', 'learner@example.test');
    await agent
      .post('/api/labs/file-upload-validation/start')
      .set('X-CSRF-Token', token)
      .send({})
      .expect(200);
    const premature = await agent
      .post('/api/labs/file-upload-validation/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'FILE_UPLOAD_MISMATCH_CONFIRMED' } })
      .expect(200);
    expect(premature.body.data.completed).toBe(false);
    await agent
      .post('/api/labs/file-upload-validation/target/upload')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Upload-Filename', 'proof.gif')
      .set('X-Upload-Mime-Type', 'image/gif')
      .send(Buffer.from('safe text fixture'))
      .expect(200);
    const completed = await agent
      .post('/api/labs/file-upload-validation/submit')
      .set('X-CSRF-Token', token)
      .send({ submission: { flag: 'FILE_UPLOAD_MISMATCH_CONFIRMED' } })
      .expect(200);
    expect(completed.body.data).toMatchObject({
      completed: true,
      progress: { status: 'COMPLETED' },
      session: { status: 'COMPLETED' },
    });
    expect(await prisma.labProgress.count({ where: { labId: lab.id, status: 'COMPLETED' } })).toBe(
      1,
    );
  });
});
