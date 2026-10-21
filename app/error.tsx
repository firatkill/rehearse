'use client';
import Link from 'next/link';
export default function ErrorPage() {
  return (
    <>
      <h1>Something went wrong</h1>
      <p>The page hit an error. Your saved sessions are safe in this browser.</p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload the page
      </button>
      <Link href="/">Go to the start page</Link>
    </>
  );
}
