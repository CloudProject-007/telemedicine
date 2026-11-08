import { Role, type DoctorProfile, type Prisma, type User } from '@prisma/client';
import { isPrismaError, prisma } from '../../infrastructure/prisma';
import { hashPassword } from '../../shared/auth/password';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { buildPaginationMeta, toSkipTake, type Paginated } from '../../shared/http/pagination';
import type {
  CreateDoctorInput,
  ListDoctorsQuery,
  UpdateDoctorProfileInput,
} from './doctors.schemas';

export interface DoctorDto {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  qualification: string | null;
  bio: string | null;
  languages: string[];
}

type DoctorWithUser = DoctorProfile & { user: Pick<User, 'name'> };

const doctorInclude = { user: { select: { name: true } } } satisfies Prisma.DoctorProfileInclude;

function toDoctorDto(doctor: DoctorWithUser): DoctorDto {
  return {
    id: doctor.userId,
    name: doctor.user.name,
    specialty: doctor.specialty,
    experienceYears: doctor.experienceYears,
    consultationFee: doctor.consultationFee,
    qualification: doctor.qualification,
    bio: doctor.bio,
    languages: doctor.languages,
  };
}

export async function listDoctors(query: ListDoctorsQuery): Promise<Paginated<DoctorDto>> {
  const where: Prisma.DoctorProfileWhereInput = {
    user: { isActive: true },
    ...(query.specialty ? { specialty: { equals: query.specialty, mode: 'insensitive' } } : {}),
    ...(query.q
      ? {
          OR: [
            { user: { name: { contains: query.q, mode: 'insensitive' } } },
            { specialty: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, doctors] = await prisma.$transaction([
    prisma.doctorProfile.count({ where }),
    prisma.doctorProfile.findMany({
      where,
      include: doctorInclude,
      orderBy: [{ user: { name: 'asc' } }, { userId: 'asc' }],
      ...toSkipTake(query),
    }),
  ]);

  return { items: doctors.map(toDoctorDto), meta: buildPaginationMeta(query, total) };
}

export async function listSpecialties(): Promise<{ specialty: string; doctors: number }[]> {
  const groups = await prisma.doctorProfile.groupBy({
    by: ['specialty'],
    where: { user: { isActive: true } },
    _count: { _all: true },
    orderBy: { specialty: 'asc' },
  });
  return groups.map((group) => ({ specialty: group.specialty, doctors: group._count._all }));
}

export async function getDoctor(id: string): Promise<DoctorDto> {
  const doctor = await prisma.doctorProfile.findFirst({
    where: { userId: id, user: { isActive: true } },
    include: doctorInclude,
  });
  if (!doctor) {
    throw new NotFoundError('Doctor');
  }
  return toDoctorDto(doctor);
}

/** Admin-only: creates the login account and the doctor profile atomically. */
export async function createDoctor(input: CreateDoctorInput): Promise<DoctorDto> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialty: input.specialty,
            experienceYears: input.experienceYears,
            consultationFee: input.consultationFee,
            qualification: input.qualification ?? null,
            bio: input.bio ?? null,
            languages: input.languages,
          },
        },
      },
      include: { doctorProfile: true },
    });
    if (!user.doctorProfile) {
      throw new Error('Doctor profile was not created');
    }
    return toDoctorDto({ ...user.doctorProfile, user: { name: user.name } });
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictError('An account with this email already exists');
    }
    throw error;
  }
}

export async function updateOwnProfile(
  doctorId: string,
  input: UpdateDoctorProfileInput,
): Promise<DoctorDto> {
  const data: Prisma.DoctorProfileUpdateInput = {
    ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
    ...(input.experienceYears !== undefined ? { experienceYears: input.experienceYears } : {}),
    ...(input.consultationFee !== undefined ? { consultationFee: input.consultationFee } : {}),
    ...(input.qualification !== undefined ? { qualification: input.qualification } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.languages !== undefined ? { languages: input.languages } : {}),
  };

  try {
    const updated = await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data,
      include: doctorInclude,
    });
    return toDoctorDto(updated);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      throw new NotFoundError('Doctor profile');
    }
    throw error;
  }
}
