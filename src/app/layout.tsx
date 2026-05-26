import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Pasada",
  description: "Plataforma de gestión para escuelas de danza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${syne.variable} ${dmSans.variable} h-full`}>
        <head>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
          />
        </head>
        <body className="min-h-full flex flex-col font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}