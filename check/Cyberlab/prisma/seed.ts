import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appSetting.upsert({
    where: { key: 'platform_name' },
    update: { value: 'CyberLab' },
    create: { key: 'platform_name', value: 'CyberLab' },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
