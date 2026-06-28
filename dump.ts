import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.staffProfile.findMany({ include: { fingerprints: true }});
  for (const s of staffList) {
    console.log(`Staff: ${s.name} (${s.id})`);
    console.log(`Fingerprints enrolled: ${s.fingerprints.length}`);
    for(const fp of s.fingerprints) {
      console.log(`  - FP: ${fp.fingerIndex}, Length: ${fp.templateData.length}`);
      console.log(`  - Start: ${fp.templateData.substring(0,20)}`);
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
