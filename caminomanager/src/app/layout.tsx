import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Roboto, Montserrat } from "next/font/google";
import "./globals.css";
import React from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { UpdateNotification } from "@/components/electron/UpdateNotification";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "ComunidadCat",
  description: "Sistema de gestión para comunidades neocatecumenales",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ComunidadCat",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${roboto.variable} ${montserrat.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <UpdateNotification />
            <Toaster richColors position="top-right" />
            <ServiceWorkerRegistration />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
