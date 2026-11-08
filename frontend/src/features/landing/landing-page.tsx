import { CalendarCheck, FileText, Lock, Search, Video } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button-styles';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/text-field';
import { EMERGENCY_NUMBER, FEATURED_SPECIALTIES } from '@/config/constants';

const STEPS = [
  {
    icon: Search,
    title: 'Find a doctor',
    text: 'Search by name or specialty and compare fees and languages.',
  },
  {
    icon: CalendarCheck,
    title: 'Pick a time',
    text: 'Choose an open slot that fits your day. Booking takes under a minute.',
  },
  {
    icon: Video,
    title: 'Meet by video or chat',
    text: 'Join from your phone or laptop. No app to install.',
  },
  {
    icon: FileText,
    title: 'Get your prescription',
    text: 'Your prescription and notes stay in your account.',
  },
] as const;

const FAQ = [
  {
    q: 'Is TeleCare for emergencies?',
    a: `No. If someone is in danger or having a medical emergency, call ${EMERGENCY_NUMBER} or go to the nearest hospital.`,
  },
  {
    q: 'What do I need for a video visit?',
    a: 'A phone or laptop with a camera, a microphone and an internet connection.',
  },
  {
    q: 'Can I cancel an appointment?',
    a: 'Yes. Open My appointments and choose Cancel before the start time. The time opens up for other patients.',
  },
  {
    q: 'Who can see my health information?',
    a: 'You and the doctor you book. Data is encrypted in transit, and you can sign out of all devices at any time.',
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // /doctors needs a signed-in person; the route guard sends visitors to sign in and then back here.
    navigate(specialty ? `/doctors?specialty=${encodeURIComponent(specialty)}` : '/doctors');
  };

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
        <div className="rise-in space-y-6">
          <h1 className="text-4xl leading-tight sm:text-5xl">
            See a doctor today, from wherever you are
          </h1>
          <p className="max-w-prose text-lg text-ink-soft">
            Book a video or chat consultation with a verified doctor, get your prescription online
            and keep your reports in one private place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className={buttonStyles({ size: 'lg' })}>
              Create a free account
            </Link>
            <Link to="/login" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
              Sign in
            </Link>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          aria-labelledby="finder-title"
          className="rise-in space-y-4 self-start rounded-panel border border-line bg-surface p-6"
          style={{ animationDelay: '120ms' }}
        >
          <h2 id="finder-title" className="text-2xl">
            Find a doctor
          </h2>
          <SelectField
            label="What do you need help with?"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="">Any specialty</option>
            {FEATURED_SPECIALTIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
          <Button type="submit" size="lg" className="w-full">
            Show doctors
          </Button>
        </form>
      </section>

      <section id="how-it-works" className="scroll-mt-4 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="space-y-2">
                <Icon aria-hidden="true" className="size-6 text-action" />
                <h3 className="font-sans text-base font-semibold">
                  {index + 1}. {title}
                </h3>
                <p className="text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16 sm:px-6">
        <h2 className="text-3xl">Specialties</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {FEATURED_SPECIALTIES.map((item) => (
            <li key={item}>
              <Link
                to={`/doctors?specialty=${encodeURIComponent(item)}`}
                className="inline-flex h-10 items-center rounded-full border border-ink/25 bg-surface px-4 text-sm hover:border-action hover:text-action-strong"
              >
                {item}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 py-12 sm:px-6">
          <Lock aria-hidden="true" className="mt-1 size-6 shrink-0 text-action" />
          <div className="space-y-1">
            <h2 className="text-2xl">Your health information stays private</h2>
            <p className="max-w-prose text-ink-soft">
              Only you and your doctor can see your appointments and notes. Connections are
              encrypted and your session ends when you sign out.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-4 px-4 py-16 sm:px-6">
        <h2 className="text-3xl">Questions and answers</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
