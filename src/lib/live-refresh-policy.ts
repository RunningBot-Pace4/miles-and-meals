export const SAVED_PAGE_REFRESH_DELAY_MS = 150;

export function canRefreshPage({ online, visible, busy, editing }: { online: boolean; visible: boolean; busy: boolean; editing: boolean }) {
  return online && visible && !busy && !editing;
}
