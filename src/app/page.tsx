import { supabase } from '@/lib/supabase';

export default async function Home() {
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Nomad Spirit</h1>
      {session ? (
        <p>Welcome, {session.user.email}!</p>
      ) : (
        <p>Please log in.</p>
      )}
    </main>
  );
}