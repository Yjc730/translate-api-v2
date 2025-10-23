# translate-api-v2

Minimal Vercel serverless API for translating English → Traditional Chinese via LLM.

## Deploy steps
1. Upload this folder to a new GitHub repo named `translate-api-v2`.
2. On Vercel: Add New → Project → select this repo.
   - Framework Preset: **Other**
   - Root Directory: **./**
3. In Vercel Settings → Environment Variables:
   - `LLM_API_KEY` = your OpenAI key
4. Deploy.

API endpoint will be:
`https://translate-api-v2.vercel.app/api/translate`
