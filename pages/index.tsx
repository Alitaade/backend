//@ts-ignore
// pages/index.tsx
import { GetServerSideProps } from 'next'
//@ts-ignore
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: '/api',
      permanent: false, // 308 = true, 307 = false
    },
  }
}

export default function Home() {
  return null // This will never be shown
}
