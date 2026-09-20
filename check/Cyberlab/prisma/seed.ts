import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appSetting.upsert({
    where: { key: 'platform_name' },
    update: { value: 'CyberLab' },
    create: { key: 'platform_name', value: 'CyberLab' },
  });

  const labs = [
    {
      slug: 'sql-injection-basics',
      title: 'SQL Injection Basics',
      description: 'A future introductory lab covering secure database query handling.',
      category: 'INJECTION' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 30,
      points: 100,
      isPublished: true,
      objective: 'Understand the core security concepts introduced by this lab.',
      instructions: 'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
      hints: JSON.stringify(['The interactive target will be added in a future phase.']),
    },
    {
      slug: 'xss-fundamentals',
      title: 'XSS Fundamentals',
      description: 'A future introductory lab covering safe client-side rendering practices.',
      category: 'CLIENT_SIDE_SECURITY' as const,
      difficulty: 'BEGINNER' as const,
      estimatedMinutes: 25,
      points: 100,
      isPublished: true,
      objective: 'Understand safe client-side rendering practices.',
      instructions: 'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
      hints: JSON.stringify(['The interactive target will be added in a future phase.']),
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
      instructions: 'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
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
      instructions: 'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
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
      instructions: 'This lab is reserved for a future isolated runtime. Review the metadata and learning objective for now.',
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
