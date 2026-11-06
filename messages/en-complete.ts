import { messages as existing } from './en';
/** Previously inline English copy; the existing English catalogue stays byte-identical. */
export const additions = {
  'dialog.close': 'Close',
  'title.privacy': 'Privacy · Rehearse',
  'title.how': 'How it works · Rehearse',
  'title.sample': 'Sample report · Rehearse',
  'title.job': 'Job-post interview · Rehearse',
  'title.home': 'Rehearse: practise interviews out loud',
  'title.setup': 'Set up a session · Rehearse',
  'title.report': 'Session report · Rehearse',
  'title.progress': 'Progress · Rehearse',
} as const;
export const messages = { ...existing, ...additions };
