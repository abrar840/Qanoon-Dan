/** Plain-language explanation of what QanoonDaan is and is not. */
import { COPY } from '../config/examples';

export function AboutPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>About QanoonDaan</h1>
        <p>{COPY.tagline}.</p>
      </header>

      <section className="section">
        <h2>What it does</h2>
        <p>
          You ask a question in plain English. QanoonDaan finds the most relevant sections of the Pakistan Penal
          Code (PPC), 1860, and writes a short answer using only those sections. Every answer shows the sections it
          relied on so you can read the actual text.
        </p>
      </section>

      <section className="section">
        <h2>What it does not do</h2>
        <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
          <li>It does not give legal advice. {COPY.disclaimer} Talk to a licensed lawyer before acting.</li>
          <li>It covers the Pakistan Penal Code only. Family law, tax, property and civil matters are outside it.</li>
          <li>It answers in English only, for now.</li>
          <li>If it is not confident, it says so instead of guessing.</li>
        </ul>
      </section>

      <section className="section">
        <h2>If you are in danger</h2>
        <p className="section-desc">
          QanoonDaan is not an emergency service. If you or someone near you is at risk, contact the police or
          emergency services right away. When a question suggests someone is in danger, QanoonDaan shows verified
          helpline numbers at the top of the answer.
        </p>
      </section>

      <section className="section">
        <h2>Your privacy</h2>
        <p>
          Your questions are processed to produce an answer and are not tied to you. They are not saved in this
          app and disappear when you reload the page.
        </p>
      </section>
    </div>
  );
}
