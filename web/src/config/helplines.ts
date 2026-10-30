/**
 * Helplines shown on a CRISIS answer.
 *
 * !!! EVERY NUMBER HERE IS A PLACEHOLDER. VERIFY EACH ONE YOURSELF !!!
 * Check the official website or call the number before setting
 * `verified: true`. A wrong number is worse than no number (day-15 plan).
 * Unverified entries show a small "verify" note in the UI as a reminder.
 */
export interface Helpline {
  name: string;
  number: string;
  /** What they help with, in plain words. */
  purpose: string;
  /** Tel link used for the "Call" button. Digits only. */
  tel: string;
  verified: boolean;
}

export const HELPLINES: Helpline[] = [
  {
    name: 'Rescue 1122',
    number: '1122',
    purpose: 'Emergency: ambulance, fire, immediate danger',
    tel: '1122',
    verified: false,
  },
  {
    name: 'Police Emergency',
    number: '15',
    purpose: 'Report a crime in progress',
    tel: '15',
    verified: false,
  },
  {
    name: 'Madadgaar National Helpline',
    number: '1098',
    purpose: 'Women and children facing violence or abuse',
    tel: '1098',
    verified: false,
  },
  {
    name: 'Punjab Women Helpline',
    number: '1043',
    purpose: 'Women facing domestic violence or harassment',
    tel: '1043',
    verified: false,
  },
  {
    name: 'Ministry of Human Rights Helpline',
    number: '1099',
    purpose: 'Human rights violations, legal aid referral',
    tel: '1099',
    verified: false,
  },
  {
    name: 'Umang Mental Health Helpline',
    number: '0311 7786264',
    purpose: 'Emotional support if you are thinking of harming yourself',
    tel: '03117786264',
    verified: false,
  },
];
