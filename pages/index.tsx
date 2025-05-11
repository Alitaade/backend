"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation" // Changed from next/router

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to API documentation or status page
    router.push("/api")
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Fashion E-commerce API</h1>
      <p>Redirecting to API status page...</p>
    </div>
  )
}