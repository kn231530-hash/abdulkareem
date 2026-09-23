# Orkin AI Chatbot

A simple Orkin AI chatbot powered by Groq and ready for Vercel.

## Local setup

1. Install dependencies: `npm install`
2. Create `.env.local`
3. Add:
   `GROQ_API_KEY=your_key_here`
4. Run: `npm run dev`

## Vercel

In Vercel Project Settings -> Environment Variables, add `GROQ_API_KEY` with your Groq API key, then redeploy.

Never commit the real API key to GitHub.
