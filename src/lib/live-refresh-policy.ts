export const HOME_REFRESH_INTERVAL_MS = 15_000;

export function canRefreshPage({ online, visible, busy, editing }: { online: boolean; visible: boolean; busy: boolean; editing: boolean }) {
  return online && visible && !busy && !editing;
}
