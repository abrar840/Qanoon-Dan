/**
 * MOCK API. Implements the `Api` interface with fake data kept in
 * localStorage, so the whole UI can be built and demoed with no backend.
 *
 * Deterministic test scenarios for ask(): put one of these words anywhere in
 * the question (case does not matter).
 *
 *   "refuse"   -> refused answer, no sources
 *   "crisis"   -> crisis answer. Helpline-only, unless the question also has
 *                 a legal keyword (assault, beat, hurt, rape, child, theft...)
 *                 in which case a cited legal answer follows the helplines.
 *   "error"    -> fails with a 503 "busy, try again in a minute"
 *   "limit"    -> fails with a 429 rate-limit error
 *   "slow"     -> normal answer after 5 seconds
 *   "divorce"  -> refused (PPC does not cover family law)
 *   anything else -> normal answer with 2-3 PPC sources, picked by keyword
 *                    (murder, cheque, theft, assault, cheating, threat)
 *
 * Auth scenarios:
 *   demo account: demo@qanoondaan.pk / demo1234 (pre-seeded with history)
 *   any other email + password >= 8 chars logs in / signs up
 *   password "wrong..." -> 401 incorrect password
 *   signing up with an email containing "confirm" -> needs email confirmation
 *
 * NOTE: the snippets below are PARAPHRASED placeholders written for the demo,
 * not the exact statute text. The real backend returns the real text.
 */
import {
  ApiError,
  DEFAULT_SETTINGS,
  type Api,
  type AskRequest,
  type AskResponse,
  type Conversation,
  type ConversationDetail,
  type FeedbackInput,
  type FeedbackRating,
  type Message,
  type Settings,
  type Source,
  type User,
} from './types';

// ---------------------------------------------------------------------------
// Storage helpers. Every key is prefixed so you can find and clear them in
// DevTools -> Application -> Local Storage.
// ---------------------------------------------------------------------------

const KEY = {
  users: 'qd.mock.users',
  session: 'qd.mock.session',
  conversations: 'qd.mock.conversations',
  messages: 'qd.mock.messages',
  feedback: 'qd.mock.feedback',
  settings: 'qd.mock.settings',
  seeded: 'qd.mock.seeded',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Wait a bit so loading states are visible, like a real network call. */
function delay(ms = 500 + Math.random() * 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(): string {
  // crypto.randomUUID exists in all modern browsers; fallback for old ones.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Fake user table. Passwords are stored in plain text because this is a mock
// that lives in your own browser. The real backend never sees passwords;
// Supabase Auth handles them.
// ---------------------------------------------------------------------------

interface StoredUser extends User {
  password: string;
}

function getUsers(): StoredUser[] {
  return load<StoredUser[]>(KEY.users, []);
}

function saveUsers(users: StoredUser[]): void {
  save(KEY.users, users);
}

function toPublicUser(u: StoredUser): User {
  // Strip the password before handing the user to the UI.
  const { password: _ignored, ...publicUser } = u;
  return publicUser;
}

function currentUser(): StoredUser | null {
  const id = load<string | null>(KEY.session, null);
  if (!id) return null;
  return getUsers().find((u) => u.id === id) ?? null;
}

function requireUser(): StoredUser {
  const u = currentUser();
  if (!u) throw new ApiError('Please log in to continue.', 401, 'unauthorized');
  return u;
}

// Listeners for onAuthStateChange.
const authListeners = new Set<(user: User | null) => void>();

function notifyAuth(user: User | null): void {
  authListeners.forEach((cb) => cb(user));
}

// ---------------------------------------------------------------------------
// Fake PPC knowledge base (paraphrased placeholders, see file header).
// ---------------------------------------------------------------------------

const LAW = 'Pakistan Penal Code, 1860';

const SECTIONS: Record<string, Source> = {
  '300': {
    section: '300',
    law: LAW,
    distance: 0.21,
    snippet:
      'Qatl-i-amd: whoever, with the intention of causing death or of causing bodily injury likely to cause death, or with the knowledge that the act is so imminently dangerous that it must in all probability cause death, causes the death of a person, is said to commit qatl-i-amd.',
  },
  '302': {
    section: '302',
    law: LAW,
    distance: 0.17,
    snippet:
      'Punishment of qatl-i-amd: whoever commits qatl-i-amd shall, subject to the provisions of this Chapter, be punished with death as qisas, or with death or imprisonment for life as ta’zir, or with imprisonment of either description for a term which may extend to twenty-five years where qisas is not applicable.',
  },
  '378': {
    section: '378',
    law: LAW,
    distance: 0.24,
    snippet:
      'Theft: whoever, intending to take dishonestly any movable property out of the possession of any person without that person’s consent, moves that property in order to such taking, is said to commit theft.',
  },
  '379': {
    section: '379',
    law: LAW,
    distance: 0.19,
    snippet:
      'Punishment for theft: whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
  },
  '489-F': {
    section: '489-F',
    law: LAW,
    distance: 0.15,
    snippet:
      'Dishonestly issuing a cheque: whoever dishonestly issues a cheque towards repayment of a loan or fulfilment of an obligation which is dishonoured on presentation, shall be punishable with imprisonment which may extend to three years, or with fine, or with both, unless he can establish that he made arrangements with his bank to ensure that the cheque would be honoured.',
  },
  '420': {
    section: '420',
    law: LAW,
    distance: 0.28,
    snippet:
      'Cheating and dishonestly inducing delivery of property: whoever cheats and thereby dishonestly induces the person deceived to deliver any property shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
  },
  '351': {
    section: '351',
    law: LAW,
    distance: 0.22,
    snippet:
      'Assault: whoever makes any gesture or any preparation intending or knowing it to be likely that such gesture or preparation will cause any person present to apprehend that he is about to use criminal force to that person, is said to commit an assault.',
  },
  '352': {
    section: '352',
    law: LAW,
    distance: 0.2,
    snippet:
      'Punishment for assault or criminal force otherwise than on grave provocation: imprisonment of either description for a term which may extend to three months, or with fine which may extend to one thousand five hundred rupees, or with both.',
  },
  '337-A': {
    section: '337-A',
    law: LAW,
    distance: 0.27,
    snippet:
      'Punishment of shajjah (injury to the head or face): the punishment depends on the kind of shajjah, ranging from daman and imprisonment up to two years for shajjah-i-khafifah to arsh and longer imprisonment for the graver kinds.',
  },
  '506': {
    section: '506',
    law: LAW,
    distance: 0.23,
    snippet:
      'Punishment for criminal intimidation: imprisonment of either description for a term which may extend to two years, or with fine, or with both; and if the threat is to cause death or grievous hurt, imprisonment which may extend to seven years, or with fine, or with both.',
  },
  '375': {
    section: '375',
    law: LAW,
    distance: 0.18,
    snippet:
      'Rape: a man is said to commit rape who has sexual intercourse with a woman against her will, without her consent, with consent obtained by fear of death or hurt, or when she is under sixteen years of age, among other circumstances listed in the section.',
  },
  '376': {
    section: '376',
    law: LAW,
    distance: 0.16,
    snippet:
      'Punishment for rape: death or imprisonment of either description for a term which shall not be less than ten years or more than twenty-five years, and shall also be liable to fine.',
  },
};

/** Topic rules: first match wins. Order matters (more specific first). */
const TOPICS: { words: string[]; sections: string[]; summary: string }[] = [
  {
    words: ['cheque', 'check bounce', 'bounced'],
    sections: ['489-F', '420'],
    summary:
      'Dishonestly issuing a cheque that is later dishonoured is an offence under [Section 489-F]. The punishment may extend to three years imprisonment, a fine, or both, unless the issuer shows they had arranged with the bank for the cheque to be honoured. Where the cheque was part of a wider deception, [Section 420] (cheating) may also apply.',
  },
  {
    words: ['murder', 'killed', 'qatl', 'homicide'],
    sections: ['302', '300'],
    summary:
      'Intentional murder is called qatl-i-amd and is defined in [Section 300]. Its punishment is set out in [Section 302]: death as qisas, or death or life imprisonment as ta’zir, or up to twenty-five years imprisonment in cases where qisas does not apply.',
  },
  {
    words: ['rape', 'raped', 'sexual'],
    sections: ['376', '375'],
    summary:
      'Rape is defined in [Section 375]. Under [Section 376] it is punishable with death or imprisonment of not less than ten and not more than twenty-five years, together with a fine.',
  },
  {
    words: ['theft', 'stole', 'stolen', 'steal', 'robbed', 'snatch'],
    sections: ['378', '379'],
    summary:
      'Taking someone’s movable property dishonestly and without consent is theft under [Section 378]. [Section 379] sets the punishment: imprisonment up to three years, a fine, or both.',
  },
  {
    words: ['threat', 'threaten', 'intimidat'],
    sections: ['506'],
    summary:
      'Threatening a person with injury to their body, reputation or property is criminal intimidation. [Section 506] punishes it with up to two years imprisonment or a fine, rising to seven years when the threat is to cause death or grievous hurt.',
  },
  {
    words: ['assault', 'beat', 'hit', 'hurt', 'slap', 'punch', 'violence'],
    sections: ['351', '352', '337-A'],
    summary:
      'A threatening gesture or preparation to use force is assault under [Section 351], punishable under [Section 352] with up to three months imprisonment or a fine. If the person was actually injured, the hurt sections apply, for example [Section 337-A] for injuries to the head or face.',
  },
  {
    words: ['cheat', 'fraud', 'scam', 'deceiv'],
    sections: ['420'],
    summary:
      'Deceiving someone so that they hand over property is cheating. [Section 420] punishes it with imprisonment up to seven years and a fine.',
  },
];

const DEFAULT_TOPIC = {
  sections: ['302', '379', '506'],
  summary:
    'The Pakistan Penal Code sets out offences and their punishments. For example, murder is punished under [Section 302], theft under [Section 379], and criminal intimidation under [Section 506]. If you tell me the specific situation, I can point to the most relevant sections.',
};

const DISCLAIMER = 'Legal information, not legal advice. Consult a licensed lawyer.';

const REFUSAL =
  'I don’t have reliable information on that in the Pakistan Penal Code. Please consult a licensed lawyer.';

/** Mirrors HELPLINES in the day-15 plan. The UI shows its own helpline list too. */
const CRISIS_MESSAGE =
  'You may be in danger. Please contact a helpline now. If you are in immediate danger, call Rescue 1122 (emergency) or Madadgaar 1098.';

function buildAnswer(question: string, answerLength: AskRequest['answer_length']): AskResponse {
  const q = question.toLowerCase();
  const topic = TOPICS.find((t) => t.words.some((w) => q.includes(w))) ?? DEFAULT_TOPIC;

  let answer = topic.summary;
  if (answerLength === 'short') {
    // Keep only the first sentence.
    answer = answer.split('. ')[0] + '.';
  } else if (answerLength === 'detailed') {
    answer +=
      '\n\nIn practice, the police register a First Information Report (FIR) under the relevant section and the case is then tried by a magistrate or sessions court depending on the offence. The exact sentence is decided by the court within the range the section allows.';
  }

  return {
    answer,
    sources: topic.sections.map((s) => SECTIONS[s]),
    refused: false,
    crisis: false,
    disclaimer: DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// Conversation storage
// ---------------------------------------------------------------------------

interface StoredConversation extends Conversation {
  user_id: string;
}

function getConversations(): StoredConversation[] {
  return load<StoredConversation[]>(KEY.conversations, []);
}

function getMessages(): Message[] {
  return load<Message[]>(KEY.messages, []);
}

function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, ' ');
  return clean.length > 60 ? clean.slice(0, 57) + '…' : clean;
}

/** Saves a Q&A pair for the logged-in user. Returns ids for the response. */
function persistExchange(
  user: StoredUser,
  req: AskRequest,
  res: AskResponse,
): { conversation_id: string; message_id: string } {
  const conversations = getConversations();
  let conv = req.conversation_id
    ? conversations.find((c) => c.id === req.conversation_id && c.user_id === user.id)
    : undefined;

  if (!conv) {
    conv = {
      id: uid(),
      user_id: user.id,
      title: titleFrom(req.question),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    conversations.unshift(conv);
  } else {
    conv.updated_at = nowIso();
  }
  save(KEY.conversations, conversations);

  const message: Message = {
    id: uid(),
    conversation_id: conv.id,
    question: req.question,
    answer: res.answer,
    sources: res.sources,
    refused: res.refused,
    crisis: res.crisis,
    feedback: null,
    created_at: nowIso(),
  };
  const messages = getMessages();
  messages.push(message);
  save(KEY.messages, messages);

  return { conversation_id: conv.id, message_id: message.id };
}

// ---------------------------------------------------------------------------
// Seed a demo account the first time the mock runs.
// ---------------------------------------------------------------------------

function seedOnce(): void {
  if (load<boolean>(KEY.seeded, false)) return;

  const demo: StoredUser = {
    id: 'demo-user',
    email: 'demo@qanoondaan.pk',
    name: 'Demo User',
    avatar_url: null,
    created_at: '2026-10-01T09:00:00.000Z',
    password: 'demo1234',
  };
  saveUsers([demo]);

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const conv: StoredConversation = {
    id: 'demo-conv-1',
    user_id: demo.id,
    title: 'What is the punishment for a bounced cheque?',
    created_at: yesterday,
    updated_at: yesterday,
  };
  save(KEY.conversations, [conv]);

  const first = buildAnswer('bounced cheque', 'normal');
  save(KEY.messages, [
    {
      id: 'demo-msg-1',
      conversation_id: conv.id,
      question: 'What is the punishment for a bounced cheque?',
      answer: first.answer,
      sources: first.sources,
      refused: false,
      crisis: false,
      feedback: 'up',
      created_at: yesterday,
    } satisfies Message,
  ]);

  save(KEY.seeded, true);
}

seedOnce();

// ---------------------------------------------------------------------------
// The implementation
// ---------------------------------------------------------------------------

export const mockApi: Api = {
  // ----- v1 -----

  async ask(req, options) {
    const q = req.question.toLowerCase();

    if (req.question.trim().length < 3 || req.question.length > 1000) {
      throw new ApiError('Question must be between 3 and 1000 characters.', 422, 'validation');
    }

    await delay(q.includes('slow') ? 5000 : undefined);

    // Respect cancellation (the UI aborts when the user navigates away).
    if (options?.signal?.aborted) {
      throw new ApiError('Request cancelled.', 0, 'network');
    }

    if (q.includes('error')) {
      throw new ApiError('QanoonDaan is busy. Please try again in a minute.', 503, 'server');
    }
    if (q.includes('limit')) {
      throw new ApiError('Too many questions in a short time. Please wait a minute and try again.', 429, 'rate_limited');
    }

    let res: AskResponse;

    if (q.includes('refuse') || q.includes('divorce')) {
      res = { answer: REFUSAL, sources: [], refused: true, crisis: false, disclaimer: DISCLAIMER };
    } else if (q.includes('crisis')) {
      // Day-15 behaviour: helpline message first; a legal answer follows only
      // when the crisis type allows it (we approximate that with a keyword).
      const legalToo = TOPICS.some((t) => t.words.some((w) => q.includes(w)));
      if (legalToo) {
        const legal = buildAnswer(req.question, req.answer_length);
        res = {
          ...legal,
          answer: CRISIS_MESSAGE + '\n\n' + legal.answer,
          crisis: true,
        };
      } else {
        res = { answer: CRISIS_MESSAGE, sources: [], refused: false, crisis: true, disclaimer: DISCLAIMER };
      }
    } else {
      res = buildAnswer(req.question, req.answer_length);
    }

    // Logged-in users get their exchange saved; guests do not.
    const user = currentUser();
    if (user) {
      const ids = persistExchange(user, req, res);
      res = { ...res, ...ids };
    } else {
      res = { ...res, conversation_id: null, message_id: null };
    }
    return res;
  },

  async health() {
    await delay(200);
    return { status: 'ok' };
  },

  // ----- auth -----

  async signUp({ email, password, name }) {
    await delay();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) throw new ApiError('Enter a valid email address.', 422, 'validation');
    if (password.length < 8) throw new ApiError('Password must be at least 8 characters.', 422, 'validation');
    if (!name.trim()) throw new ApiError('Please enter your name.', 422, 'validation');

    const users = getUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      throw new ApiError('An account with this email already exists. Try logging in.', 409, 'conflict');
    }

    const user: StoredUser = {
      id: uid(),
      email: cleanEmail,
      name: name.trim(),
      avatar_url: null,
      created_at: nowIso(),
      password,
    };
    users.push(user);
    saveUsers(users);

    // Scenario: emails containing "confirm" behave like Supabase with email
    // confirmation turned on (no session until the link is clicked).
    if (cleanEmail.includes('confirm')) {
      return { user: null, needs_email_confirmation: true };
    }

    save(KEY.session, user.id);
    const pub = toPublicUser(user);
    notifyAuth(pub);
    return { user: pub, needs_email_confirmation: false };
  },

  async logIn({ email, password }) {
    await delay();
    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    let user = users.find((u) => u.email === cleanEmail);

    if (password.toLowerCase().startsWith('wrong') || (user && user.password !== password)) {
      throw new ApiError('Incorrect email or password.', 401, 'unauthorized');
    }

    // Unknown email: the mock just creates the account so demos are easy.
    if (!user) {
      if (password.length < 8) throw new ApiError('Incorrect email or password.', 401, 'unauthorized');
      user = {
        id: uid(),
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        avatar_url: null,
        created_at: nowIso(),
        password,
      };
      users.push(user);
      saveUsers(users);
    }

    save(KEY.session, user.id);
    const pub = toPublicUser(user);
    notifyAuth(pub);
    return pub;
  },

  async logOut() {
    await delay(200);
    localStorage.removeItem(KEY.session);
    notifyAuth(null);
  },

  async getMe() {
    await delay(150);
    const u = currentUser();
    return u ? toPublicUser(u) : null;
  },

  onAuthStateChange(callback) {
    authListeners.add(callback);
    return () => {
      authListeners.delete(callback);
    };
  },

  async forgotPassword(email) {
    await delay();
    if (!email.includes('@')) throw new ApiError('Enter a valid email address.', 422, 'validation');
    // Real backend sends an email. The mock does nothing and resolves.
  },

  async resetPassword(newPassword) {
    await delay();
    if (newPassword.length < 8) throw new ApiError('Password must be at least 8 characters.', 422, 'validation');
    const user = requireUser();
    const users = getUsers().map((u) => (u.id === user.id ? { ...u, password: newPassword } : u));
    saveUsers(users);
  },

  // ----- profile -----

  async updateProfile(patch) {
    await delay();
    const user = requireUser();
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new ApiError('Name cannot be empty.', 422, 'validation');
    }
    const updated: StoredUser = {
      ...user,
      name: patch.name !== undefined ? patch.name.trim() : user.name,
      avatar_url: patch.avatar_url !== undefined ? patch.avatar_url : user.avatar_url,
    };
    saveUsers(getUsers().map((u) => (u.id === user.id ? updated : u)));
    const pub = toPublicUser(updated);
    notifyAuth(pub);
    return pub;
  },

  async uploadAvatar(file) {
    await delay();
    requireUser();
    if (!file.type.startsWith('image/')) throw new ApiError('Please choose an image file.', 422, 'validation');
    if (file.size > 1024 * 1024) throw new ApiError('Image must be smaller than 1 MB.', 422, 'validation');

    // Store the image inline as a data URL (fine for a mock, not for production).
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError('Could not read the file.', 0, 'server'));
      reader.readAsDataURL(file);
    });
    return { avatar_url: dataUrl };
  },

  async deleteAccount() {
    await delay();
    const user = requireUser();
    saveUsers(getUsers().filter((u) => u.id !== user.id));
    const convIds = new Set(getConversations().filter((c) => c.user_id === user.id).map((c) => c.id));
    save(KEY.conversations, getConversations().filter((c) => c.user_id !== user.id));
    save(KEY.messages, getMessages().filter((m) => !convIds.has(m.conversation_id)));
    localStorage.removeItem(`${KEY.settings}.${user.id}`);
    localStorage.removeItem(KEY.session);
    notifyAuth(null);
  },

  // ----- conversations -----

  async listConversations() {
    await delay(300);
    const user = requireUser();
    return getConversations()
      .filter((c) => c.user_id === user.id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(({ user_id: _ignored, ...c }) => c);
  },

  async getConversation(id) {
    await delay(300);
    const user = requireUser();
    const conv = getConversations().find((c) => c.id === id && c.user_id === user.id);
    if (!conv) throw new ApiError('Conversation not found.', 404, 'not_found');
    const { user_id: _ignored, ...pub } = conv;
    const detail: ConversationDetail = {
      ...pub,
      messages: getMessages()
        .filter((m) => m.conversation_id === id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
    return detail;
  },

  async renameConversation(id, title) {
    await delay(300);
    const user = requireUser();
    const clean = title.trim();
    if (!clean) throw new ApiError('Title cannot be empty.', 422, 'validation');
    if (clean.length > 100) throw new ApiError('Title is too long (max 100).', 422, 'validation');
    const all = getConversations();
    const conv = all.find((c) => c.id === id && c.user_id === user.id);
    if (!conv) throw new ApiError('Conversation not found.', 404, 'not_found');
    conv.title = clean;
    conv.updated_at = nowIso();
    save(KEY.conversations, all);
    const { user_id: _ignored, ...pub } = conv;
    return pub;
  },

  async deleteConversation(id) {
    await delay(300);
    const user = requireUser();
    const all = getConversations();
    if (!all.some((c) => c.id === id && c.user_id === user.id)) {
      throw new ApiError('Conversation not found.', 404, 'not_found');
    }
    save(KEY.conversations, all.filter((c) => c.id !== id));
    save(KEY.messages, getMessages().filter((m) => m.conversation_id !== id));
  },

  async deleteAllConversations() {
    await delay();
    const user = requireUser();
    const mine = new Set(getConversations().filter((c) => c.user_id === user.id).map((c) => c.id));
    save(KEY.conversations, getConversations().filter((c) => !mine.has(c.id)));
    save(KEY.messages, getMessages().filter((m) => !mine.has(m.conversation_id)));
  },

  // ----- feedback -----

  async sendFeedback(input: FeedbackInput) {
    await delay(300);
    const user = currentUser();
    const record = {
      id: uid(),
      user_id: user?.id ?? null,
      ...input,
      created_at: nowIso(),
    };
    const all = load<unknown[]>(KEY.feedback, []);
    all.push(record);
    save(KEY.feedback, all);

    // Also remember the rating on the message so history shows it.
    if (input.message_id) {
      const messages = getMessages();
      const m = messages.find((x) => x.id === input.message_id);
      if (m) {
        m.feedback = input.rating as FeedbackRating;
        save(KEY.messages, messages);
      }
    }
    return { id: record.id };
  },

  // ----- settings -----

  async getSettings() {
    await delay(150);
    const user = requireUser();
    return { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(`${KEY.settings}.${user.id}`, {}) };
  },

  async updateSettings(patch) {
    await delay(150);
    const user = requireUser();
    const key = `${KEY.settings}.${user.id}`;
    const next: Settings = { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(key, {}), ...patch };
    save(key, next);
    return next;
  },
};
