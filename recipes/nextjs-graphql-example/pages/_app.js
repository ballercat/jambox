export default function App({ Component, pageProps }) {
  return (
    <>
      <nav>
        <a href="/">Client Example</a>
        <a href="/server-render">Server Rendered Example</a>
      </nav>
      <Component {...pageProps} />
    </>
  );
}
