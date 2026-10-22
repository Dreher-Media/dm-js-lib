/**
 * When is a `<video>` error in the Instagram popup a reason to give up on the clip?
 *
 * Pure and import-free on purpose: the popup (`../popup.ts`)
 * imports it in the browser, `../instagramFeed.test.ts` tests it. Ported unchanged from
 * `astro-client-template`
 *
 * A clip from the connector can fail for reasons the page cannot know in advance: Meta
 * gave no file (the route answers 404), the signed URL expired, the stream limit answers
 * 503 with `Retry-After`, the network dropped. The browser reports all of them as a
 * `MediaError` on the element. Pausing and buffering are not errors and never reach here.
 */

/** `MediaError.code` values (the DOM constants, spelled out so this runs outside a browser). */
export const MEDIA_ERR_ABORTED = 1;
export const MEDIA_ERR_NETWORK = 2;
export const MEDIA_ERR_DECODE = 3;
export const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

/**
 * `true` when the clip cannot be played and the popup should show the cover with a link to
 * Instagram instead. `ABORTED` is the visitor (or the page) stopping the load — not a failure —
 * and a missing code means there is no error to react to.
 */
export function isPlaybackFailure(code: number | null | undefined): boolean {
  return (
    code === MEDIA_ERR_NETWORK || code === MEDIA_ERR_DECODE || code === MEDIA_ERR_SRC_NOT_SUPPORTED
  );
}

/** What a clip's slide shows. */
export type ClipView = 'player' | 'cover' | 'notice';

/**
 * Which of the three views a clip's slide is in.
 *
 * - `player`: a clip with a file, not (yet) failed — the cover with the play disc and the controls.
 * - `cover`:  a clip the connector gave NO file for, as it opens — the same cover and the same
 *             play disc, but no message yet. The disc is a button; pressing it is what shows the notice.
 * - `notice`: the cover, the message and the link to the post on Instagram. Reached by a clip that
 *             failed to play (after the visitor pressed play) or by a file-less clip whose disc was pressed.
 *
 * `revealed` is the visitor's press on a file-less clip's disc; it does not outlive the slide
 * (leaving the slide or reopening the popup starts again at `cover`), a failure does.
 */
export function clipView(state: {
  hasFile: boolean;
  failed: boolean;
  revealed: boolean;
}): ClipView {
  if (state.failed) return 'notice';
  if (!state.hasFile) return state.revealed ? 'notice' : 'cover';
  return 'player';
}
