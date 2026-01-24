# Sentinel's Journal

## 2025-02-18 - Manual HTML Sanitization Vulnerability
**Vulnerability:** The `UIAPI.sanitizeHTML` method attempted to filter malicious URLs by checking `attr.value.toLowerCase().startsWith('javascript:')`. This was bypassable using leading whitespace (e.g., `<a href=" javascript:...">`) or control characters (`j\na\tv\rascript:`), as browsers ignore these when executing the protocol.
**Learning:** Manual sanitization using simple string matching is error-prone. Browsers normalize URLs in complex ways (ignoring whitespace, control chars) that simple string checks miss.
**Prevention:**
1. Always normalize input before checking (e.g., remove all whitespace/control characters).
2. Use established libraries like DOMPurify when possible instead of rolling your own sanitizer.
3. Block dangerous tags (`base`, `form`) in addition to `script` to prevent phishing/hijacking.
