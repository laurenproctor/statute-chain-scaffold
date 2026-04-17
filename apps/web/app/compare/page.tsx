import { Suspense } from 'react'
import { CompareClient } from './CompareClient'

export const metadata = { title: 'Compare — Law Navigator' }

export default function ComparePage() {
  return (
    <Suspense fallback={<main className="page"><p className="muted">Loading…</p></main>}>
      <CompareClient />
    </Suspense>
  )
}
