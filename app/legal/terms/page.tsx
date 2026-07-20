// Public Terms of Service / End-User License Agreement for the Seaside Media
// Ops Hub. Lives outside the signed-in app (and is allow-listed in
// PUBLIC_PREFIXES) so it's reachable without logging in — QuickBooks/Intuit and
// other integrations require a publicly readable EULA URL.
//
// To edit the wording, edit the sections below. LAST_UPDATED shows on the page.

export const metadata = {
  title: 'Terms of Service — Seaside Media Ops Hub',
  description: 'End-user license agreement for the Seaside Media Ops Hub application.',
};

const LAST_UPDATED = 'July 20, 2026';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Agreement',
    body: [
      'This End-User License Agreement ("Agreement") governs your use of the Seaside Media Ops Hub (the "App"), an internal business application provided by Seaside Media LLC ("Seaside Media", "we", "us"). By accessing or using the App, you agree to these terms. If you do not agree, do not use the App.',
    ],
  },
  {
    heading: '2. Who may use the App',
    body: [
      'The App is private business software. Access is limited to Seaside Media and the team members, contractors, and clients we specifically invite. You must not share your login, and you must keep your credentials confidential.',
      'Some parts of the App are shared with clients through private links (for example a quote, contract, invoice, or project portal). Those links are intended only for the recipient they were sent to.',
    ],
  },
  {
    heading: '3. Licence',
    body: [
      'Seaside Media grants you a limited, non-exclusive, non-transferable, revocable licence to use the App for its intended business purpose. You may not copy, sell, sublicense, reverse engineer, or attempt to gain unauthorised access to the App or its underlying systems.',
    ],
  },
  {
    heading: '4. Your content',
    body: [
      'You retain ownership of the business information you put into the App — clients, projects, quotes, contracts, invoices, files, and related records. We use it only to operate the App for you.',
      'You are responsible for making sure you have the right to upload and store the information you provide, including any client or third-party material.',
    ],
  },
  {
    heading: '5. Connected services',
    body: [
      'The App can connect to third-party services at your direction, including Google (calendar), Intuit QuickBooks Online (estimates and invoices), and the infrastructure and AI providers that run the App. When you connect one of these services, information is exchanged with it only as needed to perform the actions you request.',
      'Those services are governed by their own terms and privacy policies. You can disconnect any integration at any time from the App\'s Settings page.',
    ],
  },
  {
    heading: '6. Automated assistance',
    body: [
      'The App includes an assistant feature that can draft content and prepare actions. Actions that send or change things outside the App require explicit confirmation before they run. You remain responsible for reviewing anything the assistant prepares before you approve it.',
    ],
  },
  {
    heading: '7. Availability',
    body: [
      'We aim to keep the App available and working, but it is provided on an "as is" and "as available" basis, without warranties of any kind, express or implied. We do not warrant that the App will be uninterrupted, error-free, or that it will meet any particular requirement.',
    ],
  },
  {
    heading: '8. Limitation of liability',
    body: [
      'To the fullest extent permitted by law, Seaside Media will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, or data, arising out of or related to your use of the App.',
    ],
  },
  {
    heading: '9. Suspension and termination',
    body: [
      'We may suspend or end access to the App at any time, including if it is used in a way that breaches this Agreement or puts the App or its data at risk. You may stop using the App at any time.',
    ],
  },
  {
    heading: '10. Changes',
    body: [
      'We may update this Agreement as the App changes. The date below shows when it was last revised. Continued use of the App after an update means you accept the revised terms.',
    ],
  },
  {
    heading: '11. Governing law',
    body: [
      'This Agreement is governed by the laws of the jurisdiction in which Seaside Media LLC is established, without regard to its conflict-of-law rules.',
    ],
  },
  {
    heading: '12. Contact',
    body: [
      'Questions about this Agreement can be sent to jeremy@seasidemedia.co.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200">
          <header className="border-b border-slate-200 pb-6">
            <p className="font-display text-3xl tracking-wide text-ink">SEASIDE MEDIA</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-sea">Video Production</p>
            <h1 className="mt-6 text-2xl font-semibold text-ink">Terms of Service</h1>
            <p className="mt-1 text-sm text-slate-500">End-User License Agreement · Last updated {LAST_UPDATED}</p>
          </header>

          <div className="mt-6 flex flex-col gap-6">
            {SECTIONS.map((s) => (
              <section key={s.heading}>
                <h2 className="text-base font-semibold text-ink">{s.heading}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-2 text-sm leading-relaxed text-slate-700">{p}</p>
                ))}
              </section>
            ))}
          </div>

          <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Seaside Media LLC · jeremy@seasidemedia.co
          </footer>
        </div>
      </div>
    </main>
  );
}
