import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice: "troy", input: text.slice(0, 4000), response_format: "wav" })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Groq voice request failed");
    }
    return new NextResponse(await response.arrayBuffer(), { status: 200, headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Groq TTS error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Groq voice request failed." }, { status: 500 });
  }
}