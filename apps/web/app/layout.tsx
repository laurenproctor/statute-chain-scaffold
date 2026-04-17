import './globals.css'

export const metadata = { title: 'Statute Chain', description: 'Resolve statutory citations and expand their chain.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
