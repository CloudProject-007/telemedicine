/** Shapes returned by the backend (see backend/README.md). Dates arrive as ISO strings. */

export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  qualification: string | null;
  bio: string | null;
  languages: string[];
}

export interface Specialty {
  specialty: string;
  doctors: number;
}

export interface Slot {
  id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string | null;
  cancelledReason: string | null;
  createdAt: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: string | null };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
