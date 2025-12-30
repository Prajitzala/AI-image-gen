import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Chango } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
})

const chango = Chango({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-chango",
})

export const metadata: Metadata = {
  title: "AI Outfit Generator - Virtual Try-On",
  description: "Create stunning outfit combinations with AI-powered virtual try-on technology. Upload your clothing items and see how they look together instantly.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.className} ${chango.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  )
}





