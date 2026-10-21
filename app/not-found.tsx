import Link from 'next/link';
export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>There’s nothing at this address.</p>
      <Link href="/">Go to the start page</Link>
    </>
  );
}
