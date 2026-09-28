import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const productSearchFlagHash = await bcrypt.hash('CYBERLAB{product_search_tautology}', 12);
  const feedbackSearchFlagHash = await bcrypt.hash('XSS_PREVIEW_CONFIRMED', 12);
  await prisma.appSetting.upsert({
    where: { key: 'platform_name' },
    update: { value: 'CyberLab' },
    create: { key: 'platform_name', value: 'CyberLab' },
  });

  const labs = [
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
      title: 'Broken Access Control',
      description: 'A future lab about authorization boundaries and secure access checks.',
      category: 'ACCESS_CONTROL' as const,
      difficulty: 'INTERMEDIATE' as const,
      estimatedMinutes: 35,
      points: 150,
      isPublished: true,
      objective: 'Recognize authorization boundaries and secure access checks.',
      instructions:
        'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
      hints: JSON.stringify(['The interactive target will be added in a future phase.']),
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
      slug: 'idor-fundamentals',
      title: 'IDOR Fundamentals',
      description: 'A future lab about protecting user-owned resources with authorization.',
      category: 'ACCESS_CONTROL' as const,
      difficulty: 'INTERMEDIATE' as const,
      estimatedMinutes: 30,
      points: 150,
      isPublished: true,
      objective: 'Understand how to protect user-owned resources with authorization.',
      instructions:
        'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
      hints: JSON.stringify(['The interactive target will be added in a future phase.']),
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
