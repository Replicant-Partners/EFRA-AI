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
        <header className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-green-500 font-bold text-lg tracking-tight">EFRAIN AI</span>
            <span className="text-[#2a2a2a]">|</span>
            <span className="text-gray-500 text-sm">v2.2.0 · Investment Research Pipeline</span>
          </div>
          <div className="text-gray-600 text-xs">
            Flash Note $0.073 · ~3.3 min
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
