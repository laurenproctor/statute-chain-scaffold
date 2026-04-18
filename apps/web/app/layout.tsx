import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Nav } from "../components/ui/Nav";
import { Footer } from "../components/ui/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greyledge",  // ← update to your product name
  description: "A clarity engine for law.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Nav />
        {children}
        <Footer />
        <div className="site-notice">
          <p>Informational research tool. Verify conclusions against official sources and current law.</p>
        </div>
      </body>
    </html>
  );
}
