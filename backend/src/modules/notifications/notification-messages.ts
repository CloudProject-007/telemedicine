import { formatDateTime } from '../../shared/format/date-time';

/** A message in the shapes each channel needs. SMS is kept short. */
export interface UserMessage {
  subject: string;
  body: string;
  sms: string;
}

export type ReminderKind = '24h' | '1h';

interface Context {
  appUrl: string;
  timeZone: string;
}

/**
 * Notifications carry names, times and a link, and nothing clinical: email and SMS are not
 * private channels, so diagnoses and medicines stay inside the app.
 */
const visitLink = (appUrl: string, appointmentId: string): string =>
  `${appUrl.replace(/\/$/, '')}/consultations/${appointmentId}`;

const FOOTER = 'This is an automated message from TeleCare.';

export function buildReminderMessage(
  params: {
    kind: ReminderKind;
    appointmentId: string;
    otherName: string;
    start: Date;
  } & Context,
): UserMessage {
  const when = formatDateTime(params.start, params.timeZone);
  const link = visitLink(params.appUrl, params.appointmentId);
  const lead = params.kind === '24h' ? 'in 24 hours' : 'in 1 hour';

  return {
    subject: `Reminder: your appointment is ${lead}`,
    body: `Your appointment with ${params.otherName} is ${lead}.\n\nWhen: ${when}\n\nOpen your visit: ${link}\n\n${FOOTER}`,
    sms: `TeleCare: your appointment with ${params.otherName} is ${lead} (${when}). ${link}`,
  };
}

export function buildConfirmedMessage(
  params: { appointmentId: string; otherName: string; start: Date } & Context,
): UserMessage {
  const when = formatDateTime(params.start, params.timeZone);
  const link = visitLink(params.appUrl, params.appointmentId);

  return {
    subject: 'Your appointment is confirmed',
    body: `${params.otherName} confirmed your appointment.\n\nWhen: ${when}\n\nOpen your visit: ${link}\n\n${FOOTER}`,
    sms: `TeleCare: ${params.otherName} confirmed your appointment on ${when}. ${link}`,
  };
}

export function buildCancelledMessage(
  params: { appointmentId: string; otherName: string; start: Date } & Context,
): UserMessage {
  const when = formatDateTime(params.start, params.timeZone);

  return {
    subject: 'An appointment was cancelled',
    body: `Your appointment with ${params.otherName} on ${when} was cancelled.\n\nYou can book another time in TeleCare: ${params.appUrl.replace(/\/$/, '')}\n\n${FOOTER}`,
    sms: `TeleCare: your appointment with ${params.otherName} on ${when} was cancelled.`,
  };
}

export function buildPrescriptionMessage(
  params: {
    appointmentId: string;
    doctorName: string;
    /** True when the doctor changed a prescription the patient may already have seen. */
    updated: boolean;
  } & Context,
): UserMessage {
  const link = visitLink(params.appUrl, params.appointmentId);
  const what = params.updated ? 'updated your prescription' : 'added your prescription';

  return {
    subject: params.updated ? 'Your prescription was updated' : 'Your prescription is ready',
    body: `${params.doctorName} ${what}. You can read it and download the PDF in TeleCare.\n\nOpen it here: ${link}\n\n${FOOTER}`,
    sms: `TeleCare: ${params.doctorName} ${what}. ${link}`,
  };
}
