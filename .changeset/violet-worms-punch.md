---
"@aziontech/opennextjs-azion": patch
---

fix: restore original request URL for Next.js render() on the edge runtime
fix: redirect bare node-fetch imports to the native fetch shim
refactor: apply middleware rewrite-router patch via patchCodeWithValidations
