---
"@aziontech/opennextjs-azion": patch
---

fix: preserve query params in x-original-url render patch

Query string was stripped when rebuilding req.url from
x-original-url, so params like ?version=... never
reached API routes. Preserve url.search in the header and merge
the reparsed search params into the query object passed to
super.render.
