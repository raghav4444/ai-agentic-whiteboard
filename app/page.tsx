const isAppConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.DATABASE_URL;

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
          {isAppConfigured ? 'Your whiteboard workspace is ready' : 'Waiting for environment configuration'}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: '#d4d4d8' }}>
          {isAppConfigured
            ? 'Sign in to open your AI-powered whiteboard and start creating.'
            : 'Add your Clerk and database environment variables in your local environment, then reload the app.'}
        </p>
      </div>
    </main>
  );
}
