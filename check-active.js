const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.fingerprintTemplate.findMany({ include: { staff: true } });
  console.log(templates.map(t => ({ templateId: t.id, staffId: t.staffId, staffName: t.staff.name, isActive: t.staff.isActive })));
}

main().then(() => prisma.$disconnect());
