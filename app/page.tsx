"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! 👋 Main Orkin AI chatbot hoon. Kuch bhi pooch sakte hain." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat request failed");
      setMessages((current) => [...current, { role: "assistant", content: data.message }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally { setLoading(false); }
  }

  async function speak(text: string) {
    if (speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Voice request failed"); }
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (error) { alert(error instanceof Error ? error.message : "Voice request failed"); setSpeaking(false); }
  }

  return (
    <main className="page"><section className="chat">
      <header className="header"><div className="logo">🤖</div><div><h1>Orkin AI Chatbot</h1><p>Powered by Groq</p></div><a href="https://orken.us/" target="_blank" rel="noreferrer">Website</a></header>
      <div className="messages">
        {messages.map((m, i) => <div key={i} className={m.role === "user" ? "message user" : "message assistant"}><span>{m.content}</span>{m.role === "assistant" && <button className="speak" type="button" onClick={() => speak(m.content)} disabled={speaking}>🔊 {speaking ? "Playing…" : "Listen"}</button>}</div>)}
        {loading && <div className="message assistant"><span>Typing…</span></div>}
      </div>
      <form className="composer" onSubmit={sendMessage}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message Orkin AI..." disabled={loading}/><button type="submit" disabled={loading || !input.trim()}>Send</button></form>
    </section></main>
  );
}