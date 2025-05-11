import { NextPage } from 'next'
import Head from 'next/head'

// Static page with meta refresh (most reliable solution)
const Home: NextPage = () => {
  return (
    <>
      <Head>
        <meta httpEquiv="refresh" content="0;url=/api" />
        <title>Fashion E-commerce API</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Fashion E-commerce API</h1>
        <p>Redirecting to API status page...</p>
        <a href="/api" className="text-blue-500 hover:underline">
          Click here if you are not redirected automatically
        </a>
      </div>
    </>
  )
}

export default Home