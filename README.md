# Pienissimo Hub

Tool interno per condividere aggiornamenti, rilasci, bug fix e guide del software **Pienissimo PRO**.

Tre ruoli:
- **Master** (solo tu, o pochissimi): può fare tutto, **incluso gestire gli utenti** (crea, modifica, assegna ruoli).
- **Admin**: crea, modifica, elimina i task. Gestisce le categorie. **Non** vede la sezione Utenti.
- **Guest** (marketing, commerciale, zucchetti, ecc.): consultano i task pubblicati e possono commentare per chiedere chiarimenti.

I "reparti" sono **etichette informative** che indicano a chi è utile un task — non filtrano la visibilità: tutti i guest vedono tutto.

---

## Stack

- **Frontend**: React 18 + Vite 5 + TypeScript (strict) + Tailwind 3
- **Editor**: Tiptap 2 (sicuro, sanitizzato con DOMPurify)
- **Data layer**: TanStack Query + Supabase JS
- **Backend / DB**: Supabase (Postgres + RLS + Auth + Edge Functions + Realtime)
- **Routing**: react-router-dom 6

---

## Setup locale

### 1. Prerequisiti

- Node.js >= 20
- Un progetto Supabase (puoi crearne uno gratis su [supabase.com](https://supabase.com))
- (Opzionale ma consigliato per le Edge Functions) [Supabase CLI](https://supabase.com/docs/guides/cli)

### 2. Clona, installa, configura

```bash
# clona il repo
git clone https://github.com/tuo-utente/pienissimo-hub.git
cd pienissimo-hub

# installa
npm install

# crea il file .env partendo dall'esempio
cp .env.example .env
# poi apri .env e compila VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
# (le trovi su Supabase > Settings > API)
```

### 3. Inizializza il database

Apri il SQL Editor di Supabase (**Database > SQL Editor > New query**) e copia-incolla **tutto** il contenuto di `supabase/migrations/001_initial_schema.sql`. Esegui.

Questo crea: tipi enum, tabelle (`profiles`, `categories`, `tasks`, `comments`, `read_receipts`), trigger, funzioni helper, **policy RLS complete** e qualche categoria di default.

### 4. Crea il primo admin

Senza un admin non puoi fare niente, perché le RLS bloccano la creazione di task da parte dei guest.

a) Su Supabase Dashboard: **Authentication > Users > Add user**.
   Inserisci email + password. In "Auto Confirm User" → **Yes**.

b) Torna nel SQL Editor ed esegui (sostituisci l'email):

```sql
update public.profiles
set role = 'admin', full_name = 'Nicola', department = 'sviluppo'
where email = 'tu@pienissimo.it';
```

c) Da quel momento puoi creare gli altri utenti dall'app, in **Utenti** (richiede però l'Edge Function deployata, vedi sotto).

### 5. Deploy dell'Edge Function `admin-update-user`

Questa funzione gestisce la creazione/modifica/cancellazione utenti **lato server** usando la `service_role` key (che NON deve mai stare nel frontend).

```bash
# login e link al progetto
supabase login
supabase link --project-ref TUO-PROJECT-ID

# carica il segreto (la service_role key la trovi su Supabase > Settings > API)
supabase secrets set SERVICE_ROLE_KEY=eyJhbGc...la-tua-service-role-key

# deploy
supabase functions deploy admin-update-user
```

> Senza questa Edge Function, la pagina **Utenti** dell'app risponderà con errore 404 quando provi a creare un nuovo utente. Tutto il resto dell'app funziona comunque, e puoi sempre creare utenti manualmente dalla dashboard Supabase.

### 6. Avvia in locale

```bash
npm run dev
```

L'app gira su `http://localhost:5173`. Loggati con le credenziali del primo admin.

---

## Comandi npm

| Comando            | Descrizione                                              |
| ------------------ | -------------------------------------------------------- |
| `npm run dev`      | Server di sviluppo Vite                                  |
| `npm run build`    | Build di produzione (con type check completo)            |
| `npm run preview`  | Anteprima della build di produzione                      |
| `npm run lint`     | ESLint                                                   |
| `npm run lint:fix` | ESLint con autofix                                       |
| `npm run types:gen`| Rigenera `src/types/database.ts` dai tipi Supabase       |

Per `types:gen` serve impostare `SUPABASE_PROJECT_ID` come env var ed essere loggati sulla CLI.

---

## Architettura della sicurezza

Il sistema "tu e gli admin scrivete, gli altri leggono" è imposto a **tre livelli** indipendenti:

1. **RLS Postgres** (vero gate): le policy in `001_initial_schema.sql` permettono insert/update/delete su `tasks` solo se `is_admin()` ritorna `true`. Anche se qualcuno bypassasse il frontend (es. chiamando direttamente l'API REST con la anon key), Postgres rifiuterebbe la query. **Questa è la difesa che conta.**

2. **Edge Function `admin-update-user`**: per le operazioni che richiedono privilegi elevati (creare/cancellare utenti `auth.users`), c'è una funzione dedicata che verifica il chiamante ed esegue con la service_role lato server.

3. **UI guard** (`AdminGuard` in `App.tsx`): se un utente naviga a `/new-task` da guest, viene reindirizzato. È solo UX, non sicurezza.

### XSS

Il contenuto Tiptap è HTML, e viene **sempre** renderizzato attraverso il componente `<SafeHtml />`, che applica `DOMPurify` con una whitelist molto restrittiva di tag e attributi.

### Credenziali

- `VITE_SUPABASE_ANON_KEY`: per design può finire nel bundle JS, ma è comunque escluso dal repo per pulizia.
- `SERVICE_ROLE_KEY`: **mai** nel frontend, solo come secret dell'Edge Function.

---

## Modello dati in breve

```
profiles (1:1 auth.users)
  id, email, full_name, role[admin|guest], department, avatar_url

categories
  id, name, color_class, description

tasks
  id, title, content (HTML sanitizzato), excerpt, type, version,
  category_id → categories,
  target_departments[],         -- etichetta UI, non filtra visibilità
  status[draft|published|archived],
  bug_status, bug_severity,     -- usati solo se type='bugfix'
  attachment_url,
  author_id → auth.users,
  created_at, updated_at, published_at

comments
  id, task_id → tasks, author_id → auth.users, content,
  created_at, updated_at

read_receipts (per badge "non letti", non ancora usato in UI)
  user_id, task_id, read_at
```

---

## Cosa fare adesso

Funzionalità pronte:

- Login (no signup pubblico)
- Dashboard con filtri (tipo, categoria, ricerca, bozze per admin)
- Lista task con TaskCard
- Vista dettaglio con commenti realtime
- Editor Tiptap (admin)
- Gestione categorie (admin)
- Gestione utenti CRUD via Edge Function (admin)
- Profilo personale (cambio nome / email / password)
- Toast, conferme, empty states, spinner — tutto

Funzionalità non incluse, da aggiungere se servono:

- **Notifiche email** quando viene pubblicato un task. Si fa con un'altra Edge Function su `INSERT tasks` con webhook → Resend (o SMTP Supabase).
- **Badge "non letti"** sul Dashboard (la tabella `read_receipts` è già pronta).
- **Allegati nativi** (upload su Supabase Storage). Per ora si linka un URL esterno (Zoho WorkDrive, Drive, ecc.) in `attachment_url`.
- **Audit log** delle modifiche.
- **Search full-text** vera (al momento è un `ilike` su titolo + excerpt, ok per qualche centinaia di task).

---

## Struttura progetto

```
.
├── public/                         asset statici (favicon)
├── src/
│   ├── components/                 UI riutilizzabile (Layout, TaskCard, RichTextEditor, ecc.)
│   ├── context/                    AuthContext, ToastContext
│   ├── hooks/                      useTasks, useCategories, useComments, useUsers (TanStack Query)
│   ├── lib/                        supabase client, sanitize, utils
│   ├── pages/                      Login, Dashboard, NewTask, EditTask, TaskDetail,
│   │                               AdminCategories, AdminUsers, Settings
│   ├── types/                      database.ts (tipi + costanti UI)
│   ├── App.tsx                     routing + guard
│   ├── main.tsx                    entry point + provider tree
│   └── index.css                   tailwind + classi form
├── supabase/
│   ├── migrations/                 SQL idempotente
│   └── functions/admin-update-user/  edge function CRUD utenti
├── .env.example
├── tailwind.config.js
├── tsconfig*.json
└── vite.config.ts
```

---

## Licenza

Proprietà di Pienissimo PRO. Uso interno aziendale.
