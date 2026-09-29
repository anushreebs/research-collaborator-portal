# Optional AWS integrations — not yet live

Only synthetic fixtures may be uploaded. Keep all credentials in server environment variables or the AWS credential chain, never `VITE_*` variables.

## Private S3

1. Choose an AWS sandbox account and region. In S3 create a globally unique bucket with **Block all public access enabled**, ACLs disabled (bucket owner enforced), and default encryption. Do not make files public.
2. Generate the exact fixtures used by the fallback:
   ```bash
   NODE_ENV=test node --import tsx scripts/export-synthetic.ts
   ```
   This uses an isolated in-memory database and writes four CSVs in `synthetic/`.
3. Using an authorized uploader identity, upload each file under `synthetic/BHP-001.csv` through `synthetic/BHP-004.csv`. With the AWS CLI already configured:
   ```bash
   aws s3 cp synthetic/ s3://YOUR-BUCKET/synthetic/ --recursive --exclude "*" --include "*.csv"
   ```
4. Give the **server runtime identity** only this retrieval policy, replacing the bucket name:
   ```json
   {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::YOUR-BUCKET/synthetic/*"}]}
   ```
   No `PutObject`, public ACL, or bucket listing is needed by the app. SSE-KMS requires narrowly scoped KMS decrypt permission as well. Prefer a runtime role; if your non-AWS host needs access keys, keep them in its secret manager and rotate them.
5. Set server `S3_BUCKET`, `AWS_REGION` and runtime credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, plus `AWS_SESSION_TOKEN` for temporary credentials). Restart.
6. Verify missing approval returns 403 with no URL. After approval, `/download/BHP-001` returns a 60-second presigned URL. Follow it and inspect the CSV. Wait beyond expiration and confirm a new request to that URL is denied. An issued link is a bearer capability until expiry; do not log or share it.

If S3 is unset, the endpoint honestly returns a generated local synthetic CSV. If S3 is configured but fails, it returns an error, never silently claims an S3 success. A successfully signed URL alone does **not** prove that an object exists or can be fetched.

Reference: [AWS presigned URL behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

## QuickSight registered-user path

1. Review [current pricing](https://aws.amazon.com/quick/quicksight/pricing/) and account eligibility before subscribing. No AWS resources or paid subscriptions were created here.
2. Create a QuickSight account in the selected region. Use only the generated synthetic CSV to create a dataset and an analysis. Build a simple count or aggregate chart, title it **Synthetic demo — no scientific meaning**, then publish a dashboard.
3. Create/identify the properly licensed invited QuickSight user, grant that user access to the published dashboard, and record its exact user ARN and dashboard ID. This single registered identity is not a public anonymous embedding solution.
4. Give the server runtime `quicksight:GenerateEmbedUrlForRegisteredUser` permission scoped to that user ARN. Configure permitted embedding domains for the exact HTTPS app origin; do not use wildcards for arbitrary websites.
5. Set `AWS_ACCOUNT_ID`, `AWS_REGION`, `QUICKSIGHT_USER_ARN`, `QUICKSIGHT_DASHBOARD_ID`, and `WEB_ORIGIN` on the server.
6. Sign in to the portal and select **Load QuickSight dashboard** in dataset details. The backend calls AWS and returns an embed URL; credentials remain on the server. Confirm the actual dashboard renders, filters work, and it shows only synthetic data. The dashboard is a shared demonstration, not automatically filtered to the selected dataset.
7. If permissions, licensing, domain policy, or loading prevent rendering, use the labeled synthetic chart fallback. Keep README status “configured but unverified” until rendering is observed in a fresh session.

Reference: [GenerateEmbedUrlForRegisteredUser](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_GenerateEmbedUrlForRegisteredUser.html). Embed URLs are short-lived; the code requests a 15-minute session. A returned URL does not prove browser rendering.
