import type { Metadata, Viewport } from "next";
import { Inter, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { OCRQueueProvider } from "@/components/OCRQueue";
import NavigationProgress from "@/components/NavigationProgress";
import { createClient } from "@/lib/supabase/server";
import type { UserCategory, Space } from "@/lib/types";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-archivo", // mantém variável para compat com classes existentes
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Notinha — Controle financeiro com IA",
  description: "Fotografe notas fiscais e comprovantes. A IA organiza tudo automaticamente.",
};

export const viewport: Viewport = {
  themeColor: "#0B1020",
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
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <NavigationProgress />
        <OCRQueueProvider userCategories={userCategories} spaces={spaces}>
          {children}
        </OCRQueueProvider>
      </body>
    </html>
  );
}
