import { describe, expect, it } from 'vitest';
import {
  clampRatio,
  dotScales,
  feedEnd,
  formatCount,
  formatPostDate,
  formatWhole,
  settleIndex,
  snapRatio,
  splitCaption,
} from './format';
import {
  anchorShift,
  currentPost,
  estimateHeight,
  keyStep,
  mountWindow,
  stepTarget,
} from './feedView';
import { clipView, isPlaybackFailure } from './playback';
import { HOVER_DELAY_MS, MIN_START_GAP_MS, previewAllowed, startDelay, step } from './previewState';
import { blocksContextMenu, isKeyboardContext } from './protect';

describe('counts', () => {
  it('writes every digit up to 9,999 and abbreviates from 10,000, rounding down', () => {
    expect(formatCount(1284, 'en')).toBe('1,284');
    expect(formatCount(1284, 'de')).toBe('1.284');
    expect(formatCount(12_399, 'en')).toBe('12.3K');
    expect(formatCount(12_399, 'de')).toBe('12,3\u00a0Tsd.');
    expect(formatCount(1_250_000, 'en')).toBe('1.2M');
    expect(formatCount(0, 'en')).toBe('0');
    expect(formatWhole(12_345, 'en')).toBe('12,345');
  });

  it('survives a broken locale and a broken number', () => {
    expect(formatCount(1500, 'not a locale!!')).toBe('1,500');
    expect(formatWhole(Number.NaN, 'en')).toBe('0');
  });
});

describe('formatPostDate', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  it('reads relative for a week, then as a date', () => {
    expect(formatPostDate('2026-10-19T12:00:00Z', { locale: 'en', now })).toBe('3 days ago');
    expect(formatPostDate('2026-10-22T11:59:30Z', { locale: 'en', now })).toBe('now');
    expect(
      formatPostDate('2026-04-14T10:00:00Z', { locale: 'en', now, timeZone: 'Europe/Berlin' }),
    ).toBe('April 14');
    expect(
      formatPostDate('2025-05-18T10:00:00Z', { locale: 'en', now, timeZone: 'Europe/Berlin' }),
    ).toBe('May 18, 2025');
  });
  it('is empty for a timestamp that is none, and never negative', () => {
    expect(formatPostDate('', { locale: 'en', now })).toBe('');
    expect(formatPostDate('nonsense', { locale: 'en', now })).toBe('');
    expect(formatPostDate('2026-10-22T12:05:00Z', { locale: 'en', now })).toBe('now');
  });
});

describe('splitCaption', () => {
  it('turns hashtags and mentions into links and nothing else', () => {
    const parts = splitCaption('Hello #Berlin and @some.one, mail me@host.de #2024 <b>x</b>');
    expect(parts.filter((p) => p.type === 'tag').map((p) => p.href)).toEqual([
      'https://www.instagram.com/explore/tags/berlin/',
    ]);
    expect(parts.filter((p) => p.type === 'mention').map((p) => p.text)).toEqual(['@some.one']);
    expect(parts.map((p) => p.text).join('')).toBe(
      'Hello #Berlin and @some.one, mail me@host.de #2024 <b>x</b>',
    );
  });
});

describe('album arithmetic', () => {
  it('keeps five dots at most and halves the outer ones of a longer album', () => {
    expect(dotScales(0, 3)).toEqual([1, 1, 1]);
    expect(dotScales(0, 8)).toEqual([1, 1, 1, 1, 0.5, 0, 0, 0]);
    expect(dotScales(4, 8)).toEqual([0, 0, 0.5, 1, 1, 1, 0.5, 0]);
  });
  it('turns on a short drag, not only past the middle', () => {
    expect(settleIndex(0.05, 0, 3)).toBe(0);
    expect(settleIndex(0.2, 0, 3)).toBe(1);
    expect(settleIndex(-0.2, 1, 3)).toBe(0);
    expect(settleIndex(1.7, 0, 3)).toBe(2);
  });
  it('snaps a measured proportion to the one a camera makes', () => {
    expect(snapRatio(129 / 162)).toBe(4 / 5);
    expect(snapRatio(0.9)).toBe(0.9);
    expect(clampRatio(0, 10, 0.25, 5)).toBe(0.25);
    expect(clampRatio(1000, 10, 0.25, 5)).toBe(5);
  });
});

describe('feedEnd', () => {
  it('says what the account has beyond the list, and nothing it does not know', () => {
    expect(feedEnd({ shown: 12, delivered: 12, mediaCount: 56 })).toEqual({
      kind: 'count',
      remaining: 44,
    });
    expect(feedEnd({ shown: 12, delivered: 12, mediaCount: 12 })).toEqual({ kind: 'all' });
    expect(feedEnd({ shown: 12, delivered: 12, more: true })).toEqual({ kind: 'more' });
    expect(feedEnd({ shown: 8, delivered: 12 })).toEqual({ kind: 'more' });
    expect(feedEnd({ shown: 12, delivered: 12, more: false })).toEqual({ kind: 'all' });
    expect(feedEnd({ shown: 12, delivered: 12 })).toEqual({ kind: 'unknown' });
  });
});

describe('the post list', () => {
  it('finds the post with the most of itself in view', () => {
    const spans = [
      { top: 0, bottom: 300 },
      { top: 300, bottom: 700 },
      { top: 700, bottom: 1000 },
    ];
    expect(currentPost(spans, 250, 650)).toBe(1);
    expect(currentPost([], 0, 100)).toBe(-1);
    expect(currentPost(spans, 2000, 2100)).toBe(2);
  });
  it('mounts the current post and two on each side', () => {
    expect(mountWindow(0, 12)).toEqual([0, 2]);
    expect(mountWindow(5, 12)).toEqual([3, 7]);
    expect(mountWindow(11, 12)).toEqual([9, 11]);
    expect(mountWindow(0, 0)).toEqual([0, -1]);
  });
  it('steps only where there is somewhere to go, and only on Page Up / Page Down', () => {
    expect(stepTarget(0, -1, 5)).toBeNull();
    expect(stepTarget(4, 1, 5)).toBeNull();
    expect(stepTarget(2, 1, 5)).toBe(3);
    expect(keyStep('PageDown')).toBe(1);
    expect(keyStep('PageUp')).toBe(-1);
    expect(keyStep('ArrowDown')).toBeNull();
    expect(keyStep('PageDown', { ctrl: true })).toBeNull();
  });
  it('estimates a card by its picture box and its caption', () => {
    const base = {
      width: 390,
      ratio: 0.8,
      maxMedia: 700,
      minMedia: 128,
      captionChars: 0,
      charsPerLine: 50,
      hasComments: false,
      hasDate: false,
    };
    const bare = estimateHeight(base);
    expect(
      estimateHeight({ ...base, captionChars: 80, hasComments: true, hasDate: true }),
    ).toBeGreaterThan(bare);
    expect(estimateHeight({ ...base, ratio: 0.1 })).toBeLessThan(
      estimateHeight({ ...base, maxMedia: 5000, ratio: 0.1 }),
    );
  });
  it('corrects the scroller by what the cards above changed, and ignores a hair', () => {
    expect(anchorShift(100, 140)).toBe(40);
    expect(anchorShift(100, 100.2)).toBe(0);
  });
});

describe('clips', () => {
  it('gives up on a clip only for a real playback failure', () => {
    expect(isPlaybackFailure(1)).toBe(false);
    expect(isPlaybackFailure(2)).toBe(true);
    expect(isPlaybackFailure(3)).toBe(true);
    expect(isPlaybackFailure(4)).toBe(true);
    expect(isPlaybackFailure(undefined)).toBe(false);
  });
  it('names the view of a clip', () => {
    expect(clipView({ hasFile: true, failed: false, revealed: false })).toBe('player');
    expect(clipView({ hasFile: true, failed: true, revealed: false })).toBe('notice');
    expect(clipView({ hasFile: false, failed: false, revealed: false })).toBe('cover');
    expect(clipView({ hasFile: false, failed: false, revealed: true })).toBe('notice');
  });
});

describe('hover preview machine', () => {
  const env = { finePointer: true, reducedMotion: false, saveData: false, suspended: false };
  it('allows a preview only with a hovering pointer, a clip and no wish for less', () => {
    const none = new Set<string>();
    expect(previewAllowed(env, 'https://x/v', none)).toBe(true);
    expect(previewAllowed({ ...env, finePointer: false }, 'https://x/v', none)).toBe(false);
    expect(previewAllowed({ ...env, reducedMotion: true }, 'https://x/v', none)).toBe(false);
    expect(previewAllowed({ ...env, saveData: true }, 'https://x/v', none)).toBe(false);
    expect(previewAllowed({ ...env, suspended: true }, 'https://x/v', none)).toBe(false);
    expect(previewAllowed(env, undefined, none)).toBe(false);
    expect(previewAllowed(env, 'https://x/v', new Set(['https://x/v']))).toBe(false);
  });
  it('waits for the pointer to rest, and keeps two starts a second apart', () => {
    expect(startDelay(0, null)).toBe(HOVER_DELAY_MS);
    expect(startDelay(500, 0)).toBe(MIN_START_GAP_MS - 500);
    expect(startDelay(5000, 0)).toBe(HOVER_DELAY_MS);
  });
  it('runs idle → waiting → running → idle, one tile at a time', () => {
    let state = step({ phase: 'idle' }, { type: 'enter', tile: 'a', allowed: true });
    expect(state.state).toEqual({ phase: 'waiting', tile: 'a' });
    state = step(state.state, { type: 'elapsed', tile: 'a' });
    expect(state.state).toEqual({ phase: 'running', tile: 'a' });
    expect(state.actions).toEqual([{ type: 'start' }]);
    state = step(state.state, { type: 'enter', tile: 'b', allowed: true });
    expect(state.actions).toEqual([{ type: 'stop' }, { type: 'wait' }]);
    state = step(state.state, { type: 'failed', tile: 'b' });
    expect(state.state).toEqual({ phase: 'idle' });
    expect(state.actions).toContainEqual({ type: 'remember' });
  });
  it('requests nothing for a pointer that only passes', () => {
    const entered = step({ phase: 'idle' }, { type: 'enter', tile: 'a', allowed: true });
    const left = step(entered.state, { type: 'leave', tile: 'a' });
    expect(left.actions).toEqual([{ type: 'cancelWait' }]);
    expect(step(left.state, { type: 'elapsed', tile: 'a' }).actions).toEqual([]);
  });
});

describe('media protection', () => {
  it('swallows the context menu on the media only', () => {
    expect(blocksContextMenu({ inMedia: true, onControl: false, fromKeyboard: false })).toBe(true);
    expect(blocksContextMenu({ inMedia: false, onControl: false, fromKeyboard: false })).toBe(
      false,
    );
    expect(blocksContextMenu({ inMedia: true, onControl: true, fromKeyboard: false })).toBe(false);
    expect(blocksContextMenu({ inMedia: true, onControl: false, fromKeyboard: true })).toBe(false);
  });
  it('tells the menu key from a pointer', () => {
    expect(isKeyboardContext({ button: -1 })).toBe(true);
    expect(isKeyboardContext({ button: 0, mozInputSource: 6 })).toBe(true);
    expect(isKeyboardContext({ button: 2 })).toBe(false);
  });
});
