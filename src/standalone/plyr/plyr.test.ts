// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { installPlyr, minifyCss } from './index';

const sprite =
  '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg"><symbol id="plyr-play" viewBox="0 0 18 18"></symbol></svg>';
const css =
  '/* header */\n.plyr {\n  color: red;\n}\n\n.plyr--audio .plyr__controls {\n  padding: 0;\n}\n';

function makePlyr() {
  return {
    setup: () => [],
    defaults: { loadSprite: true, blankVideo: 'https://cdn.plyr.io/static/blank.mp4' },
  };
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '<p>page</p>';
  delete (window as unknown as { Plyr?: unknown }).Plyr;
});

describe('installPlyr', () => {
  it('exposes Plyr and stops it from downloading its sprite or blank video', () => {
    const Plyr = makePlyr();
    installPlyr(Plyr, css, sprite);

    expect((window as unknown as { Plyr: unknown }).Plyr).toBe(Plyr);
    expect(Plyr.defaults.loadSprite).toBe(false);
    expect(String(Plyr.defaults.blankVideo)).toMatch(/^data:/);
  });

  it('injects the stylesheet and the sprite once, without the XML prolog', () => {
    installPlyr(makePlyr(), css, sprite);
    installPlyr(makePlyr(), css, sprite);

    expect(document.querySelectorAll('style[data-dm-plyr-style]')).toHaveLength(1);
    expect(document.querySelector('style[data-dm-plyr-style]')!.textContent).toBe(
      '.plyr {color: red;}.plyr--audio .plyr__controls {padding: 0;}',
    );
    const holders = document.querySelectorAll('[data-dm-plyr-sprite]');
    expect(holders).toHaveLength(1);
    expect(holders[0].querySelector('symbol#plyr-play')).not.toBeNull();
    expect(holders[0].innerHTML).not.toContain('<?xml');
    expect(document.body.firstElementChild).toBe(holders[0]);
  });

  it('keeps a Plyr the page provides itself', () => {
    const own = makePlyr();
    (window as unknown as { Plyr: unknown }).Plyr = own;
    installPlyr(makePlyr(), css, sprite);
    expect((window as unknown as { Plyr: unknown }).Plyr).toBe(own);
  });

  it('adds nothing that points at a third party', () => {
    installPlyr(makePlyr(), css, sprite);
    expect(document.querySelectorAll('script[src], link[href]')).toHaveLength(0);
  });
});

describe('minifyCss', () => {
  it('drops comments and indentation and leaves values alone', () => {
    expect(minifyCss('/* a */\n.a {\n  content: " ";\n}\n')).toBe('.a {content: " ";}');
  });
});
