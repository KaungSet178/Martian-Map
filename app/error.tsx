"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="boot">
      <h1>Workspace could not load</h1>
      <p>
        Your saved missions remain in this browser. Try opening the workspace
        again.
      </p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
