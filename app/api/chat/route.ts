import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Orkin AI, a helpful and friendly AI chatbot.
Reply clearly and naturally. You can answer in the user's language, including Urdu or Roman Urdu.
Website reference: https://orken.us/
Do not invent company facts. If you do not know something about Orkin AI or its website, say so and direct the user to the website.
`;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured. Add it in Vercel Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = incoming
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-20);

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.4,
      max_tokens: 1024
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content || "Sorry, mujhe response nahi mila."
    });
  } catch (error) {
    console.error("Groq error:", error);
    return NextResponse.json(
      { error: "Groq se response nahi aa raha. GROQ_API_KEY aur deployment settings check karein." },
      { status: 500 }
    );
  }
}