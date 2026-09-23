import "./globals.css";

export const metadata = {
  title: "Orkin AI Chatbot",
  description: "Orkin AI chatbot powered by Groq."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}