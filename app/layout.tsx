import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Silent Fracture SOAR",
  description: "Security Orchestration, Automation & Response Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 6000,
            style: {
              background: 'oklch(0.18 0.025 260)',
              color: 'oklch(0.92 0.01 260)',
              border: '1px solid oklch(0.28 0.02 260)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
