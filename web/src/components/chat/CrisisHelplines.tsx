/**
 * Helpline list shown inside a CRISIS answer. Numbers come from
 * config/helplines.ts and are PLACEHOLDERS until you verify them.
 */
import { HELPLINES } from '../../config/helplines';
import { PhoneIcon } from '../ui/Icons';

export function CrisisHelplines() {
  const anyUnverified = HELPLINES.some((h) => !h.verified);

  return (
    <div>
      <p>
        <strong>If you or someone else is in danger, please call for help now.</strong> These services are free
        and confidential.
      </p>
      <ul className="helplines">
        {HELPLINES.map((h) => (
          <li key={h.name} className="helpline">
            <div>
              <strong>{h.name}</strong>
              <span className="purpose">{h.purpose}</span>
            </div>
            <a className="btn btn-sm call" href={`tel:${h.tel}`}>
              <PhoneIcon width={16} height={16} /> {h.number}
            </a>
          </li>
        ))}
      </ul>
      {anyUnverified && (
        <p className="verify-note">
          {/* TODO(owner): remove this line once every number in helplines.ts is verified. */}
          Helpline numbers are being verified. If one does not connect, call Rescue 1122.
        </p>
      )}
    </div>
  );
}
