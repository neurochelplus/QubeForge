
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Security', () => {
  const api = new UIAPI('test-mod');

  // Helper to access the private sanitizeHTML method or test via addHUDElement
  const sanitize = (html: string) => {
    // We can't access private method directly, but we can inspect the result of addHUDElement
    // However, addHUDElement appends to document.body.
    const id = api.addHUDElement('test', { html, position: 'top-left' });
    const el = document.getElementById(id);
    return el ? el.innerHTML : '';
  };

  it('should remove script tags', () => {
    const html = '<div><script>alert(1)</script>Safe</div>';
    expect(sanitize(html)).not.toContain('<script>');
    expect(sanitize(html)).toContain('Safe');
  });

  it('should remove inline event handlers', () => {
    const html = '<div onclick="alert(1)">Click me</div>';
    const result = sanitize(html);
    expect(result).not.toContain('onclick');
  });

  it('should remove javascript: href', () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitize(html);
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('href'); // It removes the attribute
  });

  // 🚨 VULNERABILITY REPRODUCTION 🚨
  it('should remove javascript: in form action', () => {
    const html = '<form action="javascript:alert(1)"><input type="submit"></form>';
    const result = sanitize(html);
    // Currently this fails (it retains the action)
    expect(result).not.toContain('javascript:');
  });

  it('should remove javascript: in formaction', () => {
    const html = '<form><button formaction="javascript:alert(1)">Submit</button></form>';
    const result = sanitize(html);
    // Currently this fails
    expect(result).not.toContain('javascript:');
  });
});
