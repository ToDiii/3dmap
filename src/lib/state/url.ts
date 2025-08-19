const PREFIX = '#s=';

export function writeToUrl(stateStr: string, replace = true): void {
  const hash = PREFIX + stateStr;
  if (replace) {
    history.replaceState(null, '', hash);
  } else {
    location.hash = hash;
  }
}

export function readFromUrl(): string | null {
  const h = location.hash;
  if (h.startsWith(PREFIX)) return h.slice(PREFIX.length);
  return null;
}

export function clearFromUrl(): void {
  history.replaceState(null, '', ' ');
}
