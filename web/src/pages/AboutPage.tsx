/** Plain-language explanation of what QanoonDaan is and is not. */
import { Link } from 'react-router-dom';
import { COPY } from '../config/examples';
import { HELPLINES } from '../config/helplines';

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
          QanoonDaan is not an emergency service. If you or someone near you is at risk, please call:
        </p>
        <ul className="helplines">
          {HELPLINES.map((h) => (
            <li key={h.name} className="helpline">
              <div>
                <strong>{h.name}</strong>
                <span className="purpose">{h.purpose}</span>
              </div>
              <a className="btn btn-sm call" href={`tel:${h.tel}`}>
                {h.number}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Your privacy</h2>
        <p>
          As a guest, your questions are processed to produce an answer and are not tied to you. With an account,
          your conversations are saved so you can return to them. You can delete them, or your whole account, at
          any time in <Link to="/settings">Settings</Link>.
        </p>
      </section>
    </div>
  );
}
