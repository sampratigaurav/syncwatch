## 2024-10-02 - [Add missing input validation for Firebase Admin SDK payload in Express endpoints]
**Vulnerability:** Missing explicit type and length validations for strings mapped directly into Firestore via Express routes (`userRouter` and `friendRouter`). Since Firebase Admin SDK doesn't natively enforce strict validation, injecting objects or large strings is possible.
**Learning:** In projects using Firebase Admin SDK with Express, one must enforce type (e.g. `typeof req.body.field === 'string'`) and limits on all `req.body` payload inputs because the SDK allows schema-less additions directly into Firestore, leading to DoS or type-confusion bugs.
**Prevention:** Ensure explicit string type and length validations are handled before any Firestore writes in all Express API endpoints.
