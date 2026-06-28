const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outlets = await prisma.outlet.findMany();
  console.log('Outlets:', outlets.map(o => o.id));

  const slots = await prisma.staffSlot.findMany();
  console.log('Slots outlet ids:', [...new Set(slots.map(s => s.outletId))]);
}

main().then(() => prisma.$disconnect());
