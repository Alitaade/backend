import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'

// Custom 404 page without incorrectly importing Html component
const NotFoundPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Page Not Found - Fashion E-commerce API</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-lg mb-6">The page you are looking for does not exist.</p>
        <Link href="/api" className="text-blue-500 hover:text-blue-700 underline">
          Return to API Documentation
        </Link>
      </div>
    </>
  )
}

export default NotFoundPage