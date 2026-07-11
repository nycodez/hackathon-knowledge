import app from '../apps/api/src/app.js'

export default function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const path = url.searchParams.get('__path')
  const myTascoPath = url.searchParams.get('__mytasco_path')

  if (path !== null) {
    url.searchParams.delete('__path')
    const query = url.searchParams.toString()
    request.url = `/api${path ? `/${path}` : ''}${query ? `?${query}` : ''}`
  } else if (myTascoPath !== null) {
    url.searchParams.delete('__mytasco_path')
    const query = url.searchParams.toString()
    request.url = `/mytasco${myTascoPath ? `/${myTascoPath}` : ''}${query ? `?${query}` : ''}`
  }

  app(request, response)
}
