import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-signature",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LISAN INTELLIGENCE | Market Research",
  description: "Crypto market intelligence and signal analysis platform by LISAN HOLDINGS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} antialiased`}>
        <AnimatedBackground />
        <div className="relative z-10">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
      <Analytics />
    </html>
  );
}

