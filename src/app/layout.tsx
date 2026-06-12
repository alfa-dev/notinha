import type { Metadata, Viewport } from "next";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Notinha",
  description: "Manda a foto da notinha que eu anoto.",
};

export const viewport: Viewport = {
  themeColor: "#191c24",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
