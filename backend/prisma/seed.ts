import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROUNDS = Number(process.env['BCRYPT_ROUNDS'] ?? 12);
const isProduction = process.env['NODE_ENV'] === 'production';

async function upsertUser(params: {
  email: string;
  name: string;
  password: string;
  role: Role;
}): Promise<string> {
  const passwordHash = await bcrypt.hash(params.password, ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      email: params.email,
      name: params.name,
      passwordHash,
      role: params.role,
    },
  });
  return user.id;
}

async function seedDemoDoctor(params: {
  email: string;
  name: string;
  specialty: string;
  experienceYears: number;
  consultationFee: number;
}): Promise<void> {
  const id = await upsertUser({
    email: params.email,
    name: params.name,
    password: 'Doctor@12345',
    role: Role.DOCTOR,
  });
  await prisma.doctorProfile.upsert({
    where: { userId: id },
    update: {},
    create: {
      userId: id,
      specialty: params.specialty,
      experienceYears: params.experienceYears,
      consultationFee: params.consultationFee,
      qualification: 'MBBS, MD',
      languages: ['English', 'Hindi'],
    },
  });

  // 30-minute slots from 10:00 to 12:00 UTC for the next three days.
  const slots: { doctorId: string; startTime: Date; endTime: Date }[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let index = 0; index < 4; index += 1) {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() + day);
      start.setUTCHours(10, index * 30, 0, 0);
      slots.push({
        doctorId: id,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
      });
    }
  }
  await prisma.availabilitySlot.createMany({ data: slots, skipDuplicates: true });
}

async function main(): Promise<void> {
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@telemed.local';
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';
  await upsertUser({
    email: adminEmail,
    name: 'Administrator',
    password: adminPassword,
    role: Role.ADMIN,
  });
  console.log(`Admin ready: ${adminEmail}`);

  if (isProduction) {
    console.log('Production: skipping demo data.');
    return;
  }

  await upsertUser({
    email: 'patient@telemed.local',
    name: 'Demo Patient',
    password: 'Patient@12345',
    role: Role.PATIENT,
  });
  await seedDemoDoctor({
    email: 'dr.sharma@telemed.local',
    name: 'Dr. Anita Sharma',
    specialty: 'General Medicine',
    experienceYears: 12,
    consultationFee: 400,
  });
  await seedDemoDoctor({
    email: 'dr.rao@telemed.local',
    name: 'Dr. Vikram Rao',
    specialty: 'Cardiology',
    experienceYears: 18,
    consultationFee: 900,
  });
  console.log('Demo patient, doctors and slots ready (passwords: Patient@12345 / Doctor@12345).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
