const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.fingerprintTemplate.findMany();
  console.log(templates.map(t => t.templateData));
}

main().then(() => prisma.$disconnect());
