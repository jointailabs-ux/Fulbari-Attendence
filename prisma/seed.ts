// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all existing tables...');

  // Clear in reverse dependency order to avoid FK constraint violations
  await prisma.auditLog.deleteMany({});
  await prisma.payrollRecord.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  await prisma.leaveRecord.deleteMany({});
  await prisma.advance.deleteMany({});
  await prisma.breakLog.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.fingerprintTemplate.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.staffSlot.deleteMany({});
  await prisma.outlet.deleteMany({});

  console.log('✅ All tables cleared.');
  console.log('🏢 Seeding 3 real outlets...');

  // ─── 1. Create the 3 real outlets ─────────────────────────────────────────
  // All outlets share the same shift: 12:00 PM to 12:00 AM (midnight)

  const restaurant = await prisma.outlet.create({
    data: {
      name: 'Restaurant',
      shiftStartTime: '12:00',
      shiftEndTime: '00:00',
      expectedWorkHours: 12.0,
      timezone: 'Asia/Kolkata',
    },
  });
  console.log(`  ✔ Created outlet: ${restaurant.name}`);

  const cafeHub = await prisma.outlet.create({
    data: {
      name: 'Cafe Hub',
      shiftStartTime: '12:00',
      shiftEndTime: '00:00',
      expectedWorkHours: 12.0,
      timezone: 'Asia/Kolkata',
    },
  });
  console.log(`  ✔ Created outlet: ${cafeHub.name}`);

  const chaiHub = await prisma.outlet.create({
    data: {
      name: 'Chai Hub',
      shiftStartTime: '12:00',
      shiftEndTime: '00:00',
      expectedWorkHours: 12.0,
      timezone: 'Asia/Kolkata',
    },
  });
  console.log(`  ✔ Created outlet: ${chaiHub.name}`);

  // ─── 2. Create starter slots for each outlet ──────────────────────────────
  // Admin can add/remove/rename slots via the Admin Panel (/admin/qr)

  console.log('\n🪑 Seeding starter slots...');

  const restaurantSlots = ['Head Cook 1', 'Waiter 1', 'Cashier 1'];
  for (const name of restaurantSlots) {
    await prisma.staffSlot.create({ data: { name, outletId: restaurant.id } });
    console.log(`  ✔ Restaurant → ${name}`);
  }

  const cafeHubSlots = ['Head Cook 1', 'Barista 1', 'Cashier 1'];
  for (const name of cafeHubSlots) {
    await prisma.staffSlot.create({ data: { name, outletId: cafeHub.id } });
    console.log(`  ✔ Cafe Hub → ${name}`);
  }

  const chaiHubSlots = ['Head Cook 1', 'Server 1', 'Cashier 1'];
  for (const name of chaiHubSlots) {
    await prisma.staffSlot.create({ data: { name, outletId: chaiHub.id } });
    console.log(`  ✔ Chai Hub → ${name}`);
  }

  console.log('\n🎉 Seed complete! Database is clean and ready.');
  console.log('   → 3 outlets created: Restaurant, Cafe Hub, Chai Hub');
  console.log('   → 9 starter slots created (3 per outlet)');
  console.log('   → No staff profiles — add real staff via the Admin Panel.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
