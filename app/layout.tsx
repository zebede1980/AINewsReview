import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Newspaper, Settings, Tag, Home } from "lucide-react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NewsLens — AI News Bias Analyzer",
  description: "Compare news stories across outlets, detect bias, and find the truth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 border-r border-border/50 bg-card flex flex-col fixed left-0 top-0 bottom-0 z-40">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Newspaper className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm tracking-tight">NewsLens</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">AI Bias Analyzer</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              <NavItem href="/" icon={<Home className="w-4 h-4" />} label="Dashboard" />
              <NavItem href="/topics" icon={<Tag className="w-4 h-4" />} label="Topics" />
              <NavItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
            </nav>
            <div className="p-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground text-center">
                Powered by nano-gpt.com
              </p>
            </div>
          </aside>
          {/* Main content */}
          <main className="flex-1 ml-56 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
