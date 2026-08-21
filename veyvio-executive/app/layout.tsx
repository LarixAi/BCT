import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://veyvio.com";
  const description =
    "The company-owner and governance workspace for the Veyvio transport operating system.";
  return {
    metadataBase: new URL(origin),
    title: {
      default: "Veyvio Executive",
      template: "%s | Veyvio Executive",
    },
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Veyvio Executive",
      description,
      images: [{ url: `${origin}/og.png`, width: 1680, height: 945 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Veyvio Executive",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
