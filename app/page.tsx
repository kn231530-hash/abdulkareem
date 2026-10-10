"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "What can you help me with?",
  "Help me plan a trip",
  "Tell me about your features",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Assalam-o-alaikum! 👋 Main Orken AI hoon. Aaj main aapki kis tarah madad kar sakta hoon?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function getVisitorId() {
    const key = "orken_visitor_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  }

  async function sendMessage(e?: FormEvent, suggestedText?: string) {
    e?.preventDefault();
    const text = (suggestedText ?? input).trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, visitorId: getVisitorId() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat request failed");
      setMessages((current) => [...current, { role: "assistant", content: data.message }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function speak(text: string) {
    if (speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Voice request failed");
      }
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Voice request failed");
      setSpeaking(false);
    }
  }

  return (
    <main className="chatbot-shell">
      <section className="chatbot-panel" aria-label="Orken AI chat">
        <header className="chat-header">
          <div className="brand-mark" aria-hidden="true"><span>✦</span></div>
          <div className="brand-copy">
            <h1>Orken AI</h1>
            <p><span className="online-dot" /> Your AI assistant</p>
          </div>
          <a className="website-link" href="https://orken.us/" target="_blank" rel="noreferrer">Visit website <span aria-hidden="true">↗</span></a>
        </header>

        <div className="chat-body">
          <div className="welcome-block">
            <div className="welcome-orb" aria-hidden="true">✦</div>
            <p className="eyebrow">YOUR AI COMPANION</p>
            <h2>How can I help<br />you today?</h2>
            <p className="welcome-description">Ask a question, explore an idea, or tell me what you’re working on.</p>
            {messages.length === 1 && (
              <div className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void sendMessage(undefined, suggestion)} disabled={loading}>
                    <span>{suggestion}</span><span className="suggestion-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="messages-list">
            {messages.map((message, index) => (
              <article key={index} className={`chat-message ${message.role === "user" ? "from-user" : "from-assistant"}`}>
                {message.role === "assistant" && <div className="message-avatar" aria-hidden="true">✦</div>}
                <div className="message-content">
                  <p className="message-role">{message.role === "user" ? "You" : "Orken AI"}</p>
                  <div className="message-text">{message.content}</div>
                  {message.role === "assistant" && <button className="listen-button" type="button" onClick={() => void speak(message.content)} disabled={speaking}>◖)) {speaking ? "Playing audio…" : "Listen"}</button>}
                </div>
              </article>
            ))}
            {loading && <div className="chat-message from-assistant"><div className="message-avatar" aria-hidden="true">✦</div><div className="message-content"><p className="message-role">Orken AI</p><div className="typing-indicator" aria-label="Orken AI is typing"><i /><i /><i /></div></div></div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="chat-footer">
          <form className="message-composer" onSubmit={sendMessage}>
            <input aria-label="Message Orken AI" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message Orken AI…" disabled={loading} />
            <button className="send-button" type="submit" aria-label="Send message" disabled={loading || !input.trim()}><span>↑</span></button>
          </form>
          <p className="footer-note">AI can make mistakes. Check important information.</p>
        </footer>
      </section>
    </main>
  );
}
