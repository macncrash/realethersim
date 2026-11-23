import { atom } from 'nanostores';

// Favourites: the systems a visitor has hearted. Each heart is one localStorage key
// (`ethersim:heart:<id>` = '1'), so hearts survive reloads in that browser and nothing leaves it
// (apart from the optional first-heart beacon the Learn panel sends). This store keeps the heart
// button, the Browse grid's Favourites chip and the search palette's Favourites filter in step,
// across tabs too.

const PREFIX = 'ethersim:heart:';

function load(): ReadonlySet<string> {
  const ids = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && localStorage.getItem(k) === '1') ids.add(k.slice(PREFIX.length));
    }
  } catch {
    /* storage blocked (private mode): no favourites to show */
  }
  return ids;
}

export const $hearts = atom<ReadonlySet<string>>(load());

export function isHearted(id: string): boolean {
  return $hearts.get().has(id);
}

/** Heart or un-heart a system; returns true if it is now hearted. */
export function toggleHeart(id: string): boolean {
  const next = new Set($hearts.get());
  const on = !next.has(id);
  if (on) next.add(id);
  else next.delete(id);
  try {
    if (on) localStorage.setItem(PREFIX + id, '1');
    else localStorage.removeItem(PREFIX + id);
  } catch {
    /* private mode: the heart still shows for this visit, it just won't persist */
  }
  $hearts.set(next);
  return on;
}

// Another tab hearted something: pick it up.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith(PREFIX)) $hearts.set(load());
  });
}
