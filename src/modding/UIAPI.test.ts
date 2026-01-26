// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Sanitization', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test-mod');
  });

  it('should remove dangerous tags like script', () => {
    const html = '<div><script>alert(1)</script>Hello</div>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Hello');
  });

  it('should remove base tags', () => {
    const html = '<base href="http://evil.com">';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('<base');
  });

  it('should remove form tags', () => {
    const html = '<form action="http://evil.com"><input></form>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('<form');
    // We might not block input if it's not inside a form, but generally preventing inputs prevents phishing
    // Current memory says "blocking scripts... base tags... action/formaction... javascript/vbscript/data".
    // My goal is to make it stricter.
    // If the current code doesn't block form, this test will fail.
  });

  it('should remove on* attributes', () => {
    const html = '<div onclick="alert(1)">Click me</div>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).toContain('Click me');
  });

  it('should remove javascript: links', () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    // Attribute should be removed
    expect(sanitized).not.toContain('href');
  });

  it('should remove obfuscated javascript: links', () => {
    // This bypasses simple string checks
    const html = '<a href="java\nscript:alert(1)">Link</a>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('href');
  });

  it('should remove data: links', () => {
    const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link</a>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('href');
  });

  it('should remove vbscript: links', () => {
    const html = '<a href="vbscript:msgbox(1)">Link</a>';
    const sanitized = (uiApi as any).sanitizeHTML(html);
    expect(sanitized).not.toContain('href');
  });
});
