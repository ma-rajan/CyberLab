import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const password = 'SecurePassphrase1!';

export async function createUser(username: string, email: string) {
  return prisma.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(password, 12) },
  });
}

export async function createPublishedLab(slug = 'secure-lab') {
  return prisma.lab.create({
    data: {
      slug,
      title: 'Secure Lab Metadata',
      description: 'Placeholder metadata only.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
    },
  });
}

export async function createSqlInjectionChallenge() {
  return prisma.lab.create({
    data: {
      slug: 'sql-injection-basics',
      title: 'SQL Injection Basics',
      description: 'Product search challenge.',
      category: 'INJECTION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      points: 100,
      isPublished: true,
      objective: 'Understand unsafe query construction.',
      instructions: 'Use Product Search.',
      hints: JSON.stringify(['Inspect the query preview.', 'Try a tautology.']),
      target: 'Product Search',
      challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('CYBERLAB{product_search_tautology}', 12),
    },
  });
}

export async function createXssChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'xss-fundamentals',
      title: 'Reflected XSS Basics',
      description: 'Feedback search challenge.',
      category: 'CLIENT_SIDE_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 20,
      points: 100,
      isPublished,
      objective: 'Understand reflected XSS.',
      instructions: 'Use Feedback Search.',
      hints: JSON.stringify(['Inspect the preview.', 'Try harmless HTML.']),
      target: 'Feedback Search',
      challengeType: 'XSS_FEEDBACK_SEARCH',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('XSS_PREVIEW_CONFIRMED', 12),
    },
  });
}

export async function createIdorChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'idor-fundamentals',
      title: 'Profile Access — IDOR Basics',
      description: 'Profile access challenge.',
      category: 'ACCESS_CONTROL',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 100,
      isPublished,
      objective: 'Understand object-level authorization.',
      instructions: 'Use Profile Access.',
      hints: JSON.stringify(['Inspect the profile ID.', 'Change the ID.']),
      target: 'Profile Access',
      challengeType: 'IDOR_PROFILE_ACCESS',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('IDOR_PROFILE_ACCESS_CONFIRMED', 12),
    },
  });
}

export async function createAuthenticationBypassChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'authentication-bypass-basics',
      title: 'Authentication Bypass Basics',
      description: 'Synthetic login challenge.',
      category: 'AUTHENTICATION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 20,
      points: 100,
      isPublished,
      objective: 'Understand flawed authentication logic.',
      instructions: 'Use Training Login.',
      hints: JSON.stringify(['Inspect the login decision.', 'Try unexpected values.']),
      target: 'Training Login',
      challengeType: 'AUTHENTICATION_BYPASS',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('AUTH_BYPASS_CONFIRMED', 12),
    },
  });
}

export async function createBrokenFunctionAccessChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'broken-access-control',
      title: 'Broken Function-Level Authorization',
      description: 'Training workspace challenge.',
      category: 'ACCESS_CONTROL',
      difficulty: 'BEGINNER',
      estimatedMinutes: 35,
      points: 150,
      isPublished,
      objective: 'Understand function-level authorization.',
      instructions: 'Use Training Workspace.',
      hints: JSON.stringify(['Open the learner workspace.', 'Request the administrator report.']),
      target: 'Training Workspace',
      challengeType: 'BROKEN_FUNCTION_ACCESS',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('BROKEN_FUNCTION_ACCESS_CONFIRMED', 12),
    },
  });
}

export async function createSsrfChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'ssrf',
      title: 'Server-Side Request Forgery',
      description: 'Mock fetch challenge.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 100,
      isPublished,
      objective: 'Understand controlled server-side fetching.',
      instructions: 'Use Mock Fetch Service.',
      hints: JSON.stringify(['Fetch the public mock path.', 'Consider the internal mock path.']),
      target: 'Mock Fetch Service',
      challengeType: 'SSRF_MOCK_FETCH',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('SSRF_INTERNAL_CONFIG_CONFIRMED', 12),
    },
  });
}

export async function createSqliChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'sqli',
      title: 'SQL Injection',
      description: 'Mock user directory challenge.',
      category: 'INJECTION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 100,
      isPublished,
      objective: 'Understand unsafe query construction.',
      instructions: 'Use Mock User Directory.',
      hints: JSON.stringify(['Search for alice.', 'Inspect the preview.']),
      target: 'Mock User Directory',
      challengeType: 'SQLI_USER_DIRECTORY',
      validatorType: 'FLAG',
      flagHash: await bcrypt.hash('SQLI_DIRECTORY_ACCESS_CONFIRMED', 12),
    },
  });
}

export async function createFileUploadChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'file-upload-validation',
      title: 'Unrestricted File Upload',
      description: 'Profile upload challenge.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      points: 125,
      isPublished,
      objective: 'Understand server-side upload validation.',
      instructions: 'Use Profile Image Upload.',
      hints: JSON.stringify(['Upload a normal image first.']),
      target: 'Profile Image Upload',
      challengeType: 'FILE_UPLOAD_VALIDATION',
      validatorType: 'FILE_UPLOAD',
      flagHash: await bcrypt.hash('FILE_UPLOAD_MISMATCH_CONFIRMED', 12),
    },
  });
}
export async function createCsrfChallenge() {
  return prisma.lab.create({
    data: {
      slug: 'csrf',
      title: 'CSRF',
      description: 'Training notification settings challenge.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
      objective: 'Understand missing CSRF validation.',
      instructions: 'Use Training Profile Settings.',
      hints: '[]',
      target: 'Training Profile Settings',
      challengeType: 'CSRF',
      validatorType: 'CSRF',
      flagHash: await bcrypt.hash('CSRF_NOTIFICATION_CHANGE_CONFIRMED', 12),
    },
  });
}

export async function createPathTraversalChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'path-traversal',
      title: 'Path Traversal',
      description: 'Mock file viewer challenge.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 100,
      isPublished,
      objective: 'Understand unsafe path resolution.',
      instructions: 'Use Training File Viewer.',
      hints: JSON.stringify(['Read readme.txt first.', 'Try a parent directory segment.']),
      target: 'Training File Viewer',
      challengeType: 'PATH_TRAVERSAL',
      validatorType: 'PATH_TRAVERSAL',
      flagHash: await bcrypt.hash('PATH_TRAVERSAL_CONFIRMED', 12),
    },
  });
}

export async function createSstiChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'ssti-basics',
      title: 'Server-Side Template Injection',
      description: 'Allowlisted template preview challenge.',
      category: 'INJECTION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      points: 125,
      isPublished,
      objective: 'Understand server-side template injection and safe data interpolation.',
      instructions: 'Compare the vulnerable and secure training previews.',
      hints: JSON.stringify(['Try {{7*7}}.', 'Compare literal rendering with expression evaluation.']),
      target: 'Training Template Preview',
      challengeType: 'SSTI_ALLOWLISTED',
      validatorType: 'SSTI',
      flagHash: await bcrypt.hash('SSTI_PREVIEW_CONFIRMED', 12),
    },
  });
}

export async function createCorsChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'cors-policy',
      title: 'CORS Policy Misconfiguration',
      description: 'Compare permissive and allowlisted simulated CORS policies.',
      category: 'WEB_SECURITY',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 125,
      isPublished,
      objective: 'Understand origin matching, preflight, credentials, and browser response readability.',
      instructions: 'Compare the local synthetic CORS policy simulations.',
      hints: JSON.stringify(['Try a simple request, then a preflighted request.']),
      target: 'CORS Policy Simulator',
      challengeType: 'CORS_POLICY_SIMULATOR',
      validatorType: 'CORS_POLICY',
      flagHash: await bcrypt.hash('CORS_POLICY_READ_CONFIRMED', 12),
    },
  });
}

export async function createCommandInjectionChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'command-injection',
      title: 'Command Injection',
      description: 'Bounded synthetic diagnostics challenge.',
      category: 'INJECTION',
      difficulty: 'BEGINNER',
      estimatedMinutes: 25,
      points: 125,
      isPublished,
      objective: 'Understand unsafe command interpretation and fixed-operation remediation.',
      instructions: 'Compare vulnerable and secure modes.',
      hints: JSON.stringify(['Try && audit in vulnerable mode.', 'Repeat it in secure mode.']),
      target: 'Synthetic Diagnostics',
      challengeType: 'COMMAND_INJECTION_SIMULATOR',
      validatorType: 'COMMAND_INJECTION',
      flagHash: null,
    },
  });
}

export async function createBusinessLogicRaceChallenge(isPublished = true) {
  return prisma.lab.create({
    data: {
      slug: 'business-logic-race',
      title: 'Business Logic Race Condition',
      description: 'Synthetic coupon redemption workflow challenge.',
      category: 'WEB_SECURITY',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 30,
      points: 150,
      isPublished,
      objective: 'Understand stale eligibility checks and atomic state transitions.',
      instructions: 'Prepare both attempts before recording either one, then compare atomic handling. This is not real database concurrency.',
      hints: JSON.stringify(['Both attempts can be valid while the sequence is unsafe.']),
      target: 'Synthetic Store',
      challengeType: 'BUSINESS_LOGIC_RACE_SIMULATOR',
      validatorType: 'BUSINESS_LOGIC_RACE',
      flagHash: null,
    },
  });
}

async function csrf(agent: ReturnType<typeof request.agent>) {
  return (await agent.get('/api/auth/csrf')).body.data.csrfToken as string;
}

export async function authenticatedAgent(username: string, email: string) {
  await createUser(username, email);
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ email, password })
    .expect(200);
  return { agent, token };
}

export async function loginAgent(email: string) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ email, password })
    .expect(200);
  return { agent, token };
}
