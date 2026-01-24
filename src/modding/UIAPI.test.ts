import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Security', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test-mod');
  });

  afterEach(() => {
      uiApi._cleanup();
  });

  it('should remove javascript: links', () => {
    const maliciousHtml = '<a href="javascript:alert(1)">Click me</a>';
    const elementId = uiApi.addHUDElement('test1', {
        position: 'top-left',
        html: maliciousHtml
    });

    const element = document.getElementById(elementId);
    expect(element).not.toBeNull();
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should remove javascript: links with leading whitespace', () => {
    const maliciousHtml = '<a href=" javascript:alert(1)">Click me</a>';
    const elementId = uiApi.addHUDElement('test2', {
        position: 'top-left',
        html: maliciousHtml
    });

    const element = document.getElementById(elementId);
    expect(element).not.toBeNull();
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should remove javascript: links with obfuscated whitespace', () => {
    const maliciousHtml = '<a href="j\na\tv\rascript:alert(1)">Click me</a>';
    const elementId = uiApi.addHUDElement('test_obfuscated', {
        position: 'top-left',
        html: maliciousHtml
    });

    const element = document.getElementById(elementId);
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should remove on* attributes', () => {
      const maliciousHtml = '<img src="x" onerror="alert(1)">';
      const elementId = uiApi.addHUDElement('test3', {
          position: 'top-left',
          html: maliciousHtml
      });
      const element = document.getElementById(elementId);
      const img = element?.querySelector('img');
      expect(img?.hasAttribute('onerror')).toBe(false);
  });

  it('should remove base tags', () => {
      const maliciousHtml = '<base href="http://malicious.com/">';
      const elementId = uiApi.addHUDElement('test_base', {
          position: 'top-left',
          html: maliciousHtml
      });
      const element = document.getElementById(elementId);
      const base = element?.querySelector('base');
      expect(base).toBeNull();
  });

  it('should remove form tags', () => {
      const maliciousHtml = '<form action="http://malicious.com"><input type="submit"></form>';
      const elementId = uiApi.addHUDElement('test_form', {
          position: 'top-left',
          html: maliciousHtml
      });
      const element = document.getElementById(elementId);
      const form = element?.querySelector('form');
      expect(form).toBeNull();
  });

  it('should block data: URI in href', () => {
      const maliciousHtml = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>';
      const elementId = uiApi.addHUDElement('test_data_href', {
          position: 'top-left',
          html: maliciousHtml
      });
      const element = document.getElementById(elementId);
      const link = element?.querySelector('a');
      expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should allow data:image URI in src', () => {
      const safeHtml = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const elementId = uiApi.addHUDElement('test_data_img', {
          position: 'top-left',
          html: safeHtml
      });
      const element = document.getElementById(elementId);
      const img = element?.querySelector('img');
      expect(img?.hasAttribute('src')).toBe(true);
  });

  it('should block vbscript:', () => {
      const maliciousHtml = '<a href="vbscript:alert(1)">Click</a>';
      const elementId = uiApi.addHUDElement('test_vbscript', {
          position: 'top-left',
          html: maliciousHtml
      });
      const element = document.getElementById(elementId);
      const link = element?.querySelector('a');
      expect(link?.hasAttribute('href')).toBe(false);
  });
});
