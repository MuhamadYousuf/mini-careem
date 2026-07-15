// The ride lifecycle as an explicit state machine. Keeping the statuses, their
// display metadata and the happy-path order in one pure module means the UI and
// the tests agree on exactly what a ride can do.

export const STATUS = {
  IDLE: 'IDLE',
  REQUESTED: 'REQUESTED',
  ASSIGNED: 'ASSIGNED',
  ARRIVING: 'ARRIVING',
  STARTED: 'STARTED',
  STOPPED: 'STOPPED',
  PAYING: 'PAYING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
};

// Label + Bootstrap colour variant for each status badge.
export const STATUS_META = {
  IDLE: { label: 'Idle', variant: 'secondary' },
  REQUESTED: { label: 'Ride requested', variant: 'info' },
  ASSIGNED: { label: 'Driver assigned', variant: 'primary' },
  ARRIVING: { label: 'Driver arriving', variant: 'primary' },
  STARTED: { label: 'Started', variant: 'warning' },
  STOPPED: { label: 'Stopped', variant: 'warning' },
  PAYING: { label: 'Payment', variant: 'info' },
  COMPLETE: { label: 'Complete', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
};

// The normal, successful sequence. Used to render a progress tracker.
export const HAPPY_PATH = [
  STATUS.REQUESTED,
  STATUS.ASSIGNED,
  STATUS.ARRIVING,
  STATUS.STARTED,
  STATUS.STOPPED,
  STATUS.PAYING,
  STATUS.COMPLETE,
];

export function meta(status) {
  return STATUS_META[status] || STATUS_META.IDLE;
}

// A ride is over (for better or worse) when it is COMPLETE or FAILED.
export function isTerminal(status) {
  return status === STATUS.COMPLETE || status === STATUS.FAILED;
}

// Position of a status within the happy path (-1 if it is not on it, e.g. FAILED).
export function stepIndex(status) {
  return HAPPY_PATH.indexOf(status);
}
