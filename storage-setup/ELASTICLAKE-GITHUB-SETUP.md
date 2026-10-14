# ElasticLake verification through GitHub Actions

The workflow tests ElasticLake directly using a temporary object. It uses the S3-compatible endpoint `https://app.elasticlake.com`, region `auto`, and the configured XKiss bucket.

## Required GitHub Actions repository secrets

Open **Settings → Secrets and variables → Actions → New repository secret** and create these two secrets with the exact names below:

- `ELASTICLAKE_ACCESS_KEY_ID`
- `ELASTICLAKE_SECRET_ACCESS_KEY`

Enter the active replacement credentials from ElasticLake. The access key must have permission to put, get, and delete objects in the XKiss bucket. Never paste the secret values into chat or commit them to a file. If an old key was exposed, revoke it and use a replacement.

## Run the test

1. Open **Actions → XKiss ElasticLake Storage Verification**.
2. Select **Run workflow**.
3. Open the run and inspect the `Direct ElasticLake write-read-delete using repository secrets` job.

A green run proves that the two GitHub repository secrets work for direct ElasticLake write, read-back comparison, and delete. A red run should show the provider's error without printing the secret values.

**Important:** GitHub Actions secrets are separate from Render's runtime environment variables. This workflow verifies the new repository secrets first; it does not automatically configure Render. After this test passes, configure the same valid credentials in Render's environment settings before testing the live deployed backend.
