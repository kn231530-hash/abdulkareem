import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase";

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

    const prompt = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    let response = await callGroq(apiKey, "openai/gpt-oss-120b", prompt);
    if (!response.ok && [429, 500, 502, 503, 504].includes(response.status)) {
      response = await callGroq(apiKey, "openai/gpt-oss-20b", prompt);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Groq request failed (HTTP ${response.status})`);

    const message = data?.choices?.[0]?.message?.content;
    if (!message) throw new Error("Groq returned an empty response.");

    // Database saving is best-effort: a missing Supabase env var must never
    // break the chatbot response.
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const visitorId = typeof body?.visitorId === "string" && body.visitorId.trim()
          ? body.visitorId.trim().slice(0, 200)
          : crypto.randomUUID();

        const { data: user } = await supabase
          .from("users")
          .upsert({ visitor_id: visitorId, updated_at: new Date().toISOString() }, { onConflict: "visitor_id" })
          .select("id")
          .single();

        if (user?.id) {
          let { data: chat } = await supabase
            .from("chats")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!chat?.id) {
            const created = await supabase
              .from("chats")
              .insert({ user_id: user.id, title: "Orken AI Chat" })
              .select("id")
              .single();
            chat = created.data;
          }

          if (chat?.id) {
            const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
            if (lastUser) {
              await supabase.from("messages").insert({
                chat_id: chat.id, role: "user", content: lastUser.content,
              });
            }
            await supabase.from("messages").insert({
              chat_id: chat.id, role: "assistant", content: message,
            });
            await supabase.from("agent_data").insert({
              user_id: user.id, chat_id: chat.id, data_type: "chat_usage",
              data: { model: data?.model ?? "unknown" },
            });
          }
        }
      } catch (dbError) {
        console.error("Supabase save error:", dbError);
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat request failed." },
      { status: 500 }
    );
  }
}
