import { beforeAll, describe, expect, it, vi } from 'vitest';

// Favourites are hearts kept in localStorage (`ethersim:heart:<id>`); the store must pick up hearts saved
// on an earlier visit, and keep localStorage in step when a heart is toggled.
describe('favourites', () => {
  const mem = new Map<string, string>();
  const ls = {
    get length() { return mem.size; },
    key: (i: number) => [...mem.keys()][i] ?? null,
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  };
  let fav: typeof import('../src/ui/favourites');
  beforeAll(async () => {
    mem.set('ethersim:heart:lorenz', '1'); // hearted on an earlier visit
    mem.set('ethersim:heart:axon', '0'); // not a heart
    mem.set('ethersim:lastSeenVersion', '0.2.31'); // unrelated key
    vi.stubGlobal('localStorage', ls);
    fav = await import('../src/ui/favourites');
  });

  it('loads hearts saved on an earlier visit, and only those', () => {
    expect([...fav.$hearts.get()]).toEqual(['lorenz']);
    expect(fav.isHearted('lorenz')).toBe(true);
    expect(fav.isHearted('axon')).toBe(false);
  });

  it('toggling writes through to localStorage and notifies subscribers', () => {
    const seen: number[] = [];
    const off = fav.$hearts.listen((s) => seen.push(s.size));
    expect(fav.toggleHeart('metronomes')).toBe(true);
    expect(mem.get('ethersim:heart:metronomes')).toBe('1');
    expect(fav.toggleHeart('lorenz')).toBe(false);
    expect(mem.has('ethersim:heart:lorenz')).toBe(false);
    expect([...fav.$hearts.get()]).toEqual(['metronomes']);
    expect(seen).toEqual([2, 1]);
    off();
  });
});
