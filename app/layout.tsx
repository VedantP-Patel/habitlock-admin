import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HabitLock Admin',
  description: 'Manage your habits, punishments, app locks, and emergency unlocks from the HabitLock admin panel.',
  keywords: ['habit tracker', 'app blocker', 'productivity', 'self discipline'],
  authors: [{ name: 'HabitLock' }],
  themeColor: '#7C3AED',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
