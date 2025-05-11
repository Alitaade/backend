import { GetServerSideProps, NextPage } from 'next'

// Server-side redirect using getServerSideProps
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/api',
      permanent: true, // or false for temporary redirect
    },
  }
}

// This component won't actually be rendered due to the redirect
const Home: NextPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Fashion E-commerce API</h1>
      <p>Redirecting to API status page...</p>
    </div>
  )
}

export default Home