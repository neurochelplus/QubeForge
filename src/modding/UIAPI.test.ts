
import { describe, it, expect, beforeEach } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Security', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test_mod');
    document.body.innerHTML = '';
  });

  it('should remove script tags', () => {
    const html = '<div><script>alert(1)</script>Content</div>';
    // Access private method via any cast or testing public interface
    // addHUDElement calls sanitizeHTML internally
    uiApi.addHUDElement('test1', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test1');
    expect(element?.innerHTML).not.toContain('<script>');
    expect(element?.textContent).toBe('Content');
  });

  it('should remove inline event handlers', () => {
    const html = '<img src="x" onerror="alert(1)">';
    uiApi.addHUDElement('test2', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test2');
    const img = element?.querySelector('img');
    expect(img?.hasAttribute('onerror')).toBe(false);
  });

  it('should remove form tags', () => {
    const html = '<form action="javascript:alert(1)"><input type="submit"></form>';
    uiApi.addHUDElement('test3', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test3');
    const form = element?.querySelector('form');
    expect(form).toBeNull();
  });

  it('should remove formaction attribute', () => {
    const html = '<button formaction="javascript:alert(1)">Click</button>';
    uiApi.addHUDElement('test4', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test4');
    const btn = element?.querySelector('button');

    const formaction = btn?.getAttribute('formaction');
    expect(formaction).toBeNull();
  });

  it('should remove svg tags', () => {
    const html = '<svg><script>alert(1)</script></svg>';
    uiApi.addHUDElement('test5', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test5');
    expect(element?.innerHTML).not.toContain('<svg>');
  });

  it('should remove data: URI in href', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    uiApi.addHUDElement('test6', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test6');
    const link = element?.querySelector('a');
    expect(link?.getAttribute('href')).toBeNull();
  });

  it('should remove href with whitespace before javascript protocol', () => {
    const html = '<a href="   javascript:alert(1)">Click</a>';
    uiApi.addHUDElement('test7', { html, position: 'top-left' });

    const element = document.getElementById('mod_test_mod_test7');
    const link = element?.querySelector('a');
    expect(link?.getAttribute('href')).toBeNull();
  });
});
