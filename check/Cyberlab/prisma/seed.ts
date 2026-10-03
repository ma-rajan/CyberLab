import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const productSearchFlagHash = await bcrypt.hash('CYBERLAB{product_search_tautology}', 12);
  const feedbackSearchFlagHash = await bcrypt.hash('XSS_PREVIEW_CONFIRMED', 12);
  const profileAccessFlagHash = await bcrypt.hash('IDOR_PROFILE_ACCESS_CONFIRMED', 12);
  const authenticationBypassFlagHash = await bcrypt.hash('AUTH_BYPASS_CONFIRMED', 12);
  const brokenFunctionAccessFlagHash = await bcrypt.hash('BROKEN_FUNCTION_ACCESS_CONFIRMED', 12);
  const ssrfFlagHash = await bcrypt.hash('SSRF_INTERNAL_CONFIG_CONFIRMED', 12);
  const sqliFlagHash = await bcrypt.hash('SQLI_DIRECTORY_ACCESS_CONFIRMED', 12);
  const fileUploadFlagHash = await bcrypt.hash('FILE_UPLOAD_MISMATCH_CONFIRMED', 12);
  await prisma.appSetting.upsert({
    where: { key: 'platform_name' },
    update: { value: 'CyberLab' },
    create: { key: 'platform_name', value: 'CyberLab' },
  });

  const labs = [
    {
      slug: 'file-upload-validation', title: 'Unrestricted File Upload',
      description: 'Investigate a profile-image target that trusts weak client-controlled upload metadata.',
      category: 'WEB_SECURITY' as const, difficulty: 'BEGINNER' as const, estimatedMinutes: 30, points: 125,
      isPublished: true,
      objective: 'Recognize why client restrictions, filename extensions, and supplied MIME types cannot replace server-side file validation.',
      instructions: 'Start the lab and upload a normal image first. Then inspect the request and test whether the isolated target accepts harmless plain text when it is presented with an image filename and client-declared image MIME type. Downloaded target files are always attachments and are never executed. Submit the completion value returned after the intended training interaction.',
      target: 'Profile Image Upload — POST /api/labs/file-upload-validation/target/upload (application/octet-stream with X-Upload-Filename and X-Upload-Mime-Type headers)',
      challengeType: 'FILE_UPLOAD_VALIDATION', validatorType: 'FILE_UPLOAD', flagHash: fileUploadFlagHash,
      hints: JSON.stringify([
        'Use the browser control to observe a normal upload first.',
        'The server checks only values the client can claim: filename extension and MIME type.',
        'Try harmless plain text bytes while retaining an accepted image filename and declared MIME type.',
      ]),
    },
    {
      slug: 'sqli', title: 'SQL Injection',
      description: 'Investigate a synthetic user directory that builds its lookup condition unsafely.',
      category: 'INJECTION' as const, difficulty: 'BEGINNER' as const, estimatedMinutes: 25, points: 100,
      isPublished: true,
      objective: 'Recognize how unsafe string-based query construction can let input change intended query logic.',
      instructions: 'Start the lab and search for a public synthetic user first. Then observe how a controlled boolean-style input changes the mock query result. This target is an in-memory evaluator only; it never executes SQL. Submit the completion value from the protected synthetic record.',
      target: 'Mock User Directory — GET /api/labs/sqli/search?q=<query>',
      challengeType: 'SQLI_USER_DIRECTORY', validatorType: 'FLAG', flagHash: sqliFlagHash,
      hints: JSON.stringify([
        'Begin with a public username such as alice.',
        'Inspect how the supplied value appears in the query preview.',
        'Consider whether a quoted boolean condition can make the simulated comparison always true.',
      ]),
    },
    {
      slug: 'ssrf',
      title: 'Server-Side Request Forgery',
      description: 'Investigate a training fetch service that can reach a protected internal mock resource.',
      category: 'WEB_SECURITY' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 25,
      points: 100,
      isPublished: true,
      objective: 'Recognize how server-side fetching can expose internal-only resources without allowlisted destinations.',
      instructions: 'Start the lab and fetch the public status resource first. Then investigate whether the controlled training fetch service can retrieve the internal administrator configuration path. This target is an in-memory mock environment only and never makes network requests. Submit the completion value returned by the intended training interaction.',
      target: 'Mock Fetch Service — GET /api/labs/ssrf/fetch?url=<mock-path>',
      challengeType: 'SSRF_MOCK_FETCH',
      validatorType: 'FLAG',
      flagHash: ssrfFlagHash,
      hints: JSON.stringify([
        'Begin with the documented public mock path.',
        'The fetch service resolves only a small, fixed in-memory path map.',
        'Consider whether an internal configuration path is protected when the server performs the lookup.',
      ]),
    },
    {
      slug: 'sql-injection-basics',
      title: 'SQL Injection Basics',
      description: 'Investigate a product search page that handles its search input unsafely.',
      category: 'INJECTION' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 30,
      points: 100,
      isPublished: true,
      objective:
        'Identify how unsafe SQL query construction can expose data that should remain hidden.',
      instructions:
        'Start the lab, then use the Product Search target. Search normally first and observe the request preview. Find a way to change the query condition so the internal product note is returned. Submit the flag from that note to complete the lab.',
      target: 'Product Search — GET /api/labs/sql-injection-basics/target/products?search=<term>',
      challengeType: 'SQL_INJECTION_PRODUCT_SEARCH',
      validatorType: 'FLAG',
      flagHash: productSearchFlagHash,
      hints: JSON.stringify([
        'Look closely at how the search input affects the query preview.',
        'Think about what happens when user-controlled text closes a quoted SQL value.',
        'Test whether a quoted OR condition can make the search condition always true.',
      ]),
    },
    {
      slug: 'xss-fundamentals',
      title: 'Reflected XSS Basics',
      description: 'Investigate a feedback search preview that reflects supplied markup without escaping it.',
      category: 'CLIENT_SIDE_SECURITY' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
      objective: 'Recognize how unescaped reflected input can be interpreted as active browser markup.',
      instructions: 'Start the lab, try ordinary feedback first, then test harmless markup in the Feedback Search target. The preview is sandboxed and local. When the target supplies a completion value, submit it through the platform form.',
      target: 'Feedback Search — GET /api/labs/xss-fundamentals/target/feedback?feedback=<text>',
      challengeType: 'XSS_FEEDBACK_SEARCH',
      validatorType: 'FLAG',
      flagHash: feedbackSearchFlagHash,
      hints: JSON.stringify([
        'Check whether your input is displayed directly in the target response.',
        'Try entering harmless HTML rather than ordinary text.',
        'Think about what a browser does with an event handler or script element received from unescaped input.',
      ]),
    },
    {
      slug: 'broken-access-control',
      title: 'Broken Function-Level Authorization',
      description: 'Investigate a training workspace that exposes an administrator-only report to any learner.',
      category: 'ACCESS_CONTROL' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 35,
      points: 150,
      isPublished: true,
      objective: 'Recognize that sensitive functions require a server-side role check on every request.',
      instructions:
        'Start the lab and open the synthetic learner workspace. Then change the requested section to the administrator audit report and observe whether the target verifies your role. The target contains only fixed training data. Submit the completion value returned after the intended training interaction.',
      target: 'Training Workspace — GET /api/labs/broken-access-control/target/report?section=<section>',
      challengeType: 'BROKEN_FUNCTION_ACCESS',
      validatorType: 'FLAG',
      flagHash: brokenFunctionAccessFlagHash,
      hints: JSON.stringify([
        'Begin with the normal learner workspace section.',
        'Notice that the requested function is controlled by a section value.',
        'Ask whether the target verifies an administrator role before returning the audit report.',
      ]),
    },
    {
      slug: 'authentication-basics',
      title: 'Authentication Basics',
      description: 'A future lab about secure account and session management concepts.',
      category: 'AUTHENTICATION' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
      objective: 'Review secure account and session management concepts.',
      instructions:
        'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
      hints: JSON.stringify(['The interactive target will be added in a future phase.']),
    },
    {
      slug: 'authentication-bypass-basics',
      title: 'Authentication Bypass Basics',
      description: 'Investigate a simple training login mechanism with an authentication weakness.',
      category: 'AUTHENTICATION' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 20,
      points: 100,
      isPublished: true,
      objective: 'Recognize how flawed authentication logic can accept an attempt without both expected values.',
      instructions: 'Start the lab and use the synthetic training login. Compare ordinary rejected attempts with attempts that use the known training username and an unexpected password. This target never affects your CyberLab account or session. Submit the completion value only after demonstrating the training weakness.',
      target: 'Training Login — POST /api/labs/authentication-bypass-basics/target/login',
      challengeType: 'AUTHENTICATION_BYPASS',
      validatorType: 'FLAG',
      flagHash: authenticationBypassFlagHash,
      hints: JSON.stringify([
        'Look carefully at what the application considers a successful login.',
        'Test how the target behaves when expected authentication values are missing or unexpected.',
        'The authentication decision contains a logic flaw. Think about what condition actually needs to evaluate as true.',
      ]),
    },
    {
      slug: 'idor-fundamentals',
      title: 'Profile Access — IDOR Basics',
      description: 'Investigate a profile lookup target that trusts a user-controlled identifier.',
      category: 'ACCESS_CONTROL' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 25,
      points: 100,
      isPublished: true,
      objective: 'Recognize that object identifiers require server-side ownership checks.',
      instructions: 'Start the lab and request the training profile assigned to you. Then change the profile ID and observe whether the target verifies ownership. The target uses fixed synthetic data only. Submit the completion value returned after the intended training interaction.',
      target: 'Profile Access — GET /api/labs/idor-fundamentals/target/profile?id=<profileId>',
      challengeType: 'IDOR_PROFILE_ACCESS',
      validatorType: 'FLAG',
      flagHash: profileAccessFlagHash,
      hints: JSON.stringify([
        'Look at the identifier used when requesting a profile.',
        'Does changing the object ID change which resource is returned?',
        'Ask whether the target checks that the requested resource belongs to you.',
      ]),
    },
  ];

  await Promise.all(
    labs.map((lab) =>
      prisma.lab.upsert({
        where: { slug: lab.slug },
        update: lab,
        create: lab,
      }),
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
