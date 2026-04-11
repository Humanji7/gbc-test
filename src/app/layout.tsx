import type { ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Literata } from "next/font/google";
import "./globals.css";

const displayFont = Literata({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap"
});

const uiFont = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "GBEMPIRE Test Project",
  description: "Серверный дашборд по заказам для тестового проекта GBEMPIRE AI Tools Specialist."
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={`${uiFont.variable} ${displayFont.variable}`}>
        <a className="skip-link" href="#main-content">
          Перейти к содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
