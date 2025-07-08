import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ECS Dashboard',
  description: 'AWS ECS Cluster and Service Management Dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
