import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Container } from '@/components/ui'
import { paths } from '@/app/router/paths'

/** Rendered by React Router when a route throws during loading or rendering. */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.'

  return (
    <Container className="py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">{message}</p>
      <Link to={paths.home} className="mt-6 inline-block font-medium underline underline-offset-4">
        Back to the store
      </Link>
    </Container>
  )
}
