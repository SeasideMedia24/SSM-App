// The root route just forwards into the app. If the visitor isn't signed in,
// the proxy (proxy.ts) will have already redirected them to /login.

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
