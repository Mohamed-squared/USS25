import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Raleway } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth/auth-provider"
import { Navbar } from "@/components/layout/navbar"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/ui/theme-provider"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
})

export const metadata: Metadata = {
  title: "USS25 - Undergraduate Summer Seminar 2025",
  description: "A dynamic community platform for the Undergraduate Summer Seminar 2025",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${raleway.variable}`}>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 font-raleway">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="bg-white dark:bg-gray-900 border-t mt-auto">
              <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Developed by Mohamed Mohamed and Muhammed Alaa El-Din
                </p>
              </div>
            </footer>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
