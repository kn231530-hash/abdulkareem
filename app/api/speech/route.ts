import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY is not configured. Add it in Vercel Environment Variables." }, { status: 500 });
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
    const groq = new Groq({ apiKey });
    const response = await groq.audio.speech.create({
      model: "canopylabs/orpheus-v1-english",
      voice: "troy",
      input: text.slice(0, 4000),
      response_format: "wav"
    });
    return new NextResponse(Buffer.from(await response.arrayBuffer()), { status: 200, headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Groq TTS error:", error);
    return NextResponse.json({ error: "Groq voice request failed. Check GROQ_API_KEY and deployment settings." }, { status: 500 });
  }
}