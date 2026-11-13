import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { UpMentorThemeProvider } from '@/components/upmentor/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'TechNeeds IGDTUW — Mentorship with momentum',
  description: 'A TechNeeds-inspired mentorship workspace for learning roadmaps, mentor follow-ups, community resources, and transparent cohort analytics.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1420' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <UpMentorThemeProvider>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </UpMentorThemeProvider>
      </body>
    </html>
  )
}
