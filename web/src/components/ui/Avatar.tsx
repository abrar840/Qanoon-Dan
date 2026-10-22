import type { User } from '../../api';
import { initials } from '../../utils/format';

/** Round avatar: the user's image if they have one, otherwise initials. */
export function Avatar({ user, large = false }: { user: User; large?: boolean }) {
  const className = large ? 'avatar avatar-lg' : 'avatar';
  if (user.avatar_url) {
    return (
      <span className={className}>
        <img src={user.avatar_url} alt="" />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initials(user.name, user.email)}
    </span>
  );
}
