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
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-[#f9fafb]">
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
              fontSize: '14px'
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            }
          }} 
        />
        {children}
      </body>
    </html>
  );
}
