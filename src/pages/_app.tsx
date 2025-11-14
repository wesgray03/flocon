import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/mobile.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
        />
        {/* Site icons for bookmarks, tabs, and home screens */}
        <link
          rel="icon"
          type="image/png"
          href="/flocon-logo-small.png?v=2"
          sizes="32x32"
        />
        <link
          rel="shortcut icon"
          type="image/png"
          href="/flocon-logo-small.png?v=2"
        />
        <link rel="apple-touch-icon" href="/flocon-logo-small.png?v=2" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0d1b2a" />
        <meta name="msapplication-TileColor" content="#0d1b2a" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
