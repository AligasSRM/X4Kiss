# ElasticLake configuration (X4Kiss)

This document contains configuration names only. **Never commit access keys or secret values to Git.**

## Render service

Service: `x4kiss-backend-neon`

Set these non-secret environment variables:

| Name | Value |
|---|---|
| `ELASTICLAKE_ENDPOINT` | `https://app.elasticlake.com` |
| `ELASTICLAKE_BUCKET` | `x4kiss-storage--x4kiss-production--x4kiss-media` |
| `ELASTICLAKE_REGION` | `auto` |

Add these as **secret values in Render** only after confirming the correct key pair in the ElasticLake dashboard:

- `ELASTICLAKE_ACCESS_KEY_ID`
- `ELASTICLAKE_SECRET_ACCESS_KEY`

Do not add placeholder text as a secret. Until both credentials are present and valid, live storage is not verified.

## GitHub Actions

Repository: `AligasSRM/X4Kiss`

Open **Settings → Secrets and variables → Actions**.

Create these **Repository variables** (non-secret):

- `ELASTICLAKE_ENDPOINT` = `https://app.elasticlake.com`
- `ELASTICLAKE_BUCKET` = `x4kiss-storage--x4kiss-production--x4kiss-media`
- `ELASTICLAKE_REGION` = `auto`

Create these **Repository secrets** (sensitive):

- `ELASTICLAKE_ACCESS_KEY_ID`
- `ELASTICLAKE_SECRET_ACCESS_KEY`

The workflow `.github/workflows/x4kiss-elasticlake-live-test.yml` already references these exact names. After adding and verifying the key pair, run **Actions → X4Kiss ElasticLake Live Test → Run workflow**.

## Safety and acceptance criteria

- Never paste secret values into chat, source files, commits, logs, or screenshots.
- Do not delete the existing ElasticLake bucket, pond, or lake to troubleshoot authentication.
- The previous live test failed with `403 InvalidAccessKeyId`; re-run only after confirming the access-key ID and matching secret belong to the correct ElasticLake account.
- A successful configuration check is not proof of access. Mark storage GREEN only after a real write → read → delete test passes.
