## 2024-05-22 - Weak Manual HTML Sanitization
**Vulnerability:** The custom `sanitizeHTML` method in `UIAPI.ts` relied on simple string matching (`startsWith`) to block dangerous protocols like `javascript:`. It failed to handle whitespace obfuscation (e.g., `java\nscript:`) and missed several dangerous tags (`base`, `form`).
**Learning:** Manual HTML sanitization is error-prone. Obfuscation techniques like inserting control characters can easily bypass simple string checks.
**Prevention:** When unable to use libraries like DOMPurify, ensure URL attributes are normalized (control characters removed) before protocol validation, and use a comprehensive blocklist of dangerous tags.
