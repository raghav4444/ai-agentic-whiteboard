export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '2rem',
      background: '#09090b',
      color: '#f4f4f5',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 720 }}>
        <p style={{ marginBottom: 16, color: '#7dd3fc', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>
          App setup required
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', margin: '0 0 1rem' }}>
          Waiting for environment configuration
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: '#d4d4d8' }}>
          This project is still showing the default starter page because the required Clerk and database environment variables are not configured yet.
          Add your <strong>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</strong>, <strong>CLERK_SECRET_KEY</strong>, and <strong>DATABASE_URL</strong> values in your local environment, then reload the app.
        </p>
      </div>
    </main>
  );
}
