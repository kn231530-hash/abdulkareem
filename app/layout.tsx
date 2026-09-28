import "./globals.css";

export const metadata = {
  title: "Orken AI Chatbot",
  description: "Orken AI chatbot powered by Groq."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}