import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are Orken AI, a helpful and friendly AI chatbot.
Reply clearly and naturally. You can answer in the user's language, including Urdu or Roman Urdu.
Website reference: https://orken.us/
Do not invent company facts. If you do not know something about Orken AI or its website, say so and direct the user to the website.
`;

async function callGroq(apiKey: string, model: string, messages: unknown[]) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1024 }),
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });

  try {
    const body = await request.json();
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = incoming
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-20);

    const visitorId = typeof body?.visitorId === "string" && body.visitorId.trim()
      ? body.visitorId.trim().slice(0, 200)
      : crypto.randomUUID();

    let userId: string | null = null;
    let chatId: string | null = null;

    const { data: user } = await supabaseAdmin
      .from("users")
      .upsert({ visitor_id: visitorId, updated_at: new Date().toISOString() }, { onConflict: "visitor_id" })
      .select("id")
      .single();

    userId = user?.id ?? null;

    if (userId) {
      const { data: chat } = await supabaseAdmin
        .from("chats")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (chat?.id) {
        chatId = chat.id;
      } else {
        const created = await supabaseAdmin
          .from("chats")
          .insert({ user_id: userId, title: "Orken AI Chat" })
          .select("id")
          .single();
        chatId = created.data?.id ?? null;
      }
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    if (chatId && lastUser) {
      await supabaseAdmin.from("messages").insert({
        chat_id: chatId,
        role: "user",
        content: lastUser.content,
      });
    }

    const prompt = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    let response = await callGroq(apiKey, "openai/gpt-oss-120b", prompt);
    if (!response.ok && [429, 500, 502, 503, 504].includes(response.status)) {
      response = await callGroq(apiKey, "openai/gpt-oss-20b", prompt);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Groq request failed (HTTP ${response.status})`);

    const message = data?.choices?.[0]?.message?.content;
    if (!message) throw new Error("Groq returned an empty response.");

    if (chatId) {
      await supabaseAdmin.from("messages").insert({
        chat_id: chatId,
        role: "assistant",
        content: message,
      });
      await supabaseAdmin.from("agent_data").insert({
        user_id: userId,
        chat_id: chatId,
        data_type: "chat_usage",
        data: { model: data?.model ?? "unknown" },
      });
    }

    return NextResponse.json({ message, visitorId });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat request failed." },
      { status: 500 }
    );
  }
}
