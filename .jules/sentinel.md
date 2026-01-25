## 2024-05-22 - [Modding UI XSS in attributes]
**Vulnerability:** The HTML sanitizer missed `action` and `formaction` attributes, and `base` tags, allowing potential XSS via forms or base hijacking.
**Learning:** Blacklisting attributes is fragile. Always consider all attributes that can execute code or change context (like `base`). Control characters can bypass string matching.
**Prevention:** Use a robust sanitizer library (like DOMPurify) instead of custom regex/logic when possible. If custom, ensure all event handlers and execution contexts are covered.
