## 2024-10-24 - [Insecure Custom HTML Sanitizer]
**Vulnerability:** The `UIAPI` class used a naive blacklist-based HTML sanitizer that could be bypassed using `form`, `svg`, `base` tags or obfuscated `javascript:` protocols (e.g., control characters).
**Learning:** Custom sanitizers are prone to bypasses. In this codebase, the modding API relied on one, creating a significant XSS risk for any user-generated content displayed via mods.
**Prevention:** Avoid custom sanitizers. If external libraries (like DOMPurify) cannot be used, ensure protocol checks strip all whitespace/control characters and block dangerous tags like `svg` and `form` explicitly.
