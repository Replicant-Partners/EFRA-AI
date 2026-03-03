import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Efrain AI — Investment Research",
  description: "Multi-agent equity research pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f0f] text-gray-200">
        <header className="px-8 pt-7 pb-4 flex items-baseline justify-between border-b border-[#1e1e1e]">
          <div className="flex items-baseline gap-4">
            <span className="text-green-500 font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>EFRAIN AI</span>
            <span className="t-label">Investment Research · v2.2</span>
          </div>
          <nav className="flex items-baseline gap-6">
            <a href="/" className="t-label hover:text-green-500 transition-colors">Pipeline</a>
            <a href="/screener" className="t-label hover:text-green-500 transition-colors">Screener</a>
          </nav>
        </header>
        <main className="max-w-3xl mx-auto px-8 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
