import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Container } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <Container className="py-24 text-center">
      <p className="font-display text-6xl font-bold text-sand">404</p>
      <h1 className="mt-4 text-2xl font-bold">This pair has walked off</h1>
      <p className="mt-2 text-ink-muted">The page you are looking for does not exist.</p>
      <Link to={paths.home} className="mt-6 inline-block font-medium underline underline-offset-4">
        Back to the store
      </Link>
    </Container>
  )
}
