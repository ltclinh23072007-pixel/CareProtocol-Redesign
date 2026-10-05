# CareProtocol-Redesign project guidance

- This checkout is the private, independent copy. Work only in this repository; do not change or deploy the live CareProtocol website or push to another repository.
- Stack: Next.js 14.2, React 18, TypeScript, Tailwind CSS 3. Preserve these versions unless a required security fix or user request justifies a change.
- Before changing Next.js behavior, read the version-matched guide in `node_modules/next/dist/docs/` if it exists. This package may omit bundled docs; if so, use the official Next.js v14 documentation.
- Preserve the real browser-side MediaPipe camera flow and the real, user-signed Solana Devnet memo flow. Clearly label estimates and never represent a simulated or failed transaction as verified.
- The current source does not implement doctor/hospital workflows, FHIR, or a clinical AI service. Do not add fake controls or claim these features exist.
- Keep camera permission user-initiated, stop all media tracks when the session ends, and do not send camera frames to a server.
- Do not add patient-identifying data to the public Devnet memo. The signed proof should stay limited to the existing summary fields and hash.
