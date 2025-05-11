import { Html, Head, Main, NextScript } from 'next/document'

// This is the correct place to use Html, Head, Main, and NextScript components
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add any global meta tags, fonts, etc. here */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}