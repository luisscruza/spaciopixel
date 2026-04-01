import './App.css'

function App() {
  return (
    <main className="shell">
      <section className="hero-panel">
        <p className="eyebrow">SpacioPixel</p>
        <h1>Habbo-style social rooms, scaffolded and ready to build.</h1>
        <p className="lede">
          React, PixiJS, Laravel, Colyseus, PostgreSQL, Redis, and Docker are in
          place as the baseline for the MVP.
        </p>
      </section>

      <section className="status-grid">
        <article className="card">
          <h2>Web</h2>
          <p>Vite + React + TypeScript app is running.</p>
        </article>
        <article className="card">
          <h2>API</h2>
          <p>Laravel API scaffolded with Sanctum and Docker-ready env defaults.</p>
        </article>
        <article className="card">
          <h2>Realtime</h2>
          <p>Colyseus service is scaffolded for room-based multiplayer state.</p>
        </article>
        <article className="card">
          <h2>Next</h2>
          <p>Auth flows, lobby data, room schemas, and Pixi room rendering.</p>
        </article>
      </section>
    </main>
  )
}

export default App
