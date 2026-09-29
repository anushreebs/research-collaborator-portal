# Outreach preparation — hold until live verification

No email has been sent. No public URL is currently verified. Finalize the requested 60–90 second walkthrough and email only after completing `docs/DEPLOYMENT.md`'s fresh-browser checklist.

Public sources checked September 28, 2026:

- [BrainHealth Platform](https://centerforbrainhealth.org/science/brainhealth-platform) describes dedicated participant, researcher and coach portals and collaboration across scientists, clinicians and technologists.
- [BrainHealth Network announcement](https://centerforbrainhealth.org/article/brainhealth-groundbreaking-research-collaborative) describes research collaboration and data sharing to accelerate discovery.

Appropriate connection: this independent synthetic prototype explores dataset discovery, metadata inspection, access review and authorized retrieval as a learning exercise relevant to research collaboration. It does not reproduce the Center's internal system or imply affiliation.

Verified locally: GraphQL catalog and request handling; forbidden researcher approval; denied and approved HTTP downloads; synthetic CSV export; deterministic recommendation fallback and output validation; TypeScript/build checks. Browser usability, managed PostgreSQL deployment, S3 retrieval, QuickSight rendering and live model responses are not yet verified.

After deployment, record the exact live URL, date, browser, dataset used, request/approval result, downloaded header, and whether S3/model/QuickSight were actually used. Then write the walkthrough around the verified flow, identify fallbacks honestly, and show the email plus URL to the user for review before any sending action.
