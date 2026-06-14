import type { Metadata, Viewport } from "next";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { OCRQueueProvider } from "@/components/OCRQueue";
import { createClient } from "@/lib/supabase/server";
import type { UserCategory, Space } from "@/lib/types";

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
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userCategories: UserCategory[] = [];
  let spaces: Space[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [catRes, spaceRes] = await Promise.all([
        supabase.from("user_categories").select("*").order("position"),
        supabase
          .from("spaces")
          .select("*, space_members(*)"),
      ]);
      userCategories = (catRes.data ?? []) as UserCategory[];
      spaces = (spaceRes.data ?? []) as Space[];
    }
  } catch {
    // Silenciosamente ignora erros no layout (ex: tabelas ainda não existem)
  }

  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${mono.variable} antialiased`}>
        <OCRQueueProvider userCategories={userCategories} spaces={spaces}>
          {children}
        </OCRQueueProvider>
      </body>
    </html>
  );
}
