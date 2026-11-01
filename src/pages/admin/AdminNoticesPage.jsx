import { useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, SelectField, TextField } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import { useAsync } from '../../hooks/useAsync';
import {
  deleteAnnouncement, getAdminClasses, getAdminPupils, getAnnouncements, sendAnnouncement,
} from '../../services/dataService';
import { formatShortDate } from '../../utils/format';

// "group:Parents", "class:<id>" or "pupil:<id>" -> the fields the server expects
function targetFrom(value) {
  const [kind, id] = value.split(':');
  if (kind === 'class') return { classId: id };
  if (kind === 'pupil') return { pupilId: id };
  return { audience: id };
}

// ============================================================================
// Administrator: send a notice to everyone, to parents, teachers or pupils, to one class,
// or to a single pupil (their parents see it too). Recipients see it on their own dashboard.
// ============================================================================
export default function AdminNoticesPage() {
  const classes = useAsync(getAdminClasses, []);
  const pupils = useAsync(getAdminPupils, []);
  const sent = useAsync(getAnnouncements, []);

  return (
    <>
      <PageHeader title="Notices" subtitle="Send a message through the portal. It appears on the recipients' own dashboards." />
      <div className="space-y-6">
        <DataState state={classes} label="Loading…">
          {(classList) => (
            <DataState state={pupils} label="Loading…">
              {(pupilList) => <ComposeCard classes={classList} pupils={pupilList} onSent={sent.reload} />}
            </DataState>
          )}
        </DataState>
        <DataState state={sent} label="Loading notices…">
          {(items) => <SentCard items={items} onChanged={sent.reload} />}
        </DataState>
      </div>
    </>
  );
}

function ComposeCard({ classes, pupils, onSent }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('group:Everyone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!title.trim()) return setError('Enter a title.');
    if (!body.trim()) return setError('Write the message.');
    setBusy(true);
    setError('');
    setDone('');
    try {
      const result = await sendAnnouncement(title.trim(), body.trim(), targetFrom(to));
      setDone(`Sent to ${result.sentTo}.`);
      setTitle('');
      setBody('');
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card aria-labelledby="compose-title">
      <CardHeader id="compose-title" icon={Send} title="Write a notice" />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <SelectField id="n-to" label="Send to" value={to} onChange={(e) => setTo(e.target.value)} disabled={busy}>
          <optgroup label="Groups">
            <option value="group:Everyone">Everyone</option>
            <option value="group:Parents">All parents</option>
            <option value="group:Pupils">All pupils</option>
            <option value="group:Teachers">All teachers</option>
          </optgroup>
          {classes.length > 0 && (
            <optgroup label="One class (pupils and their parents)">
              {classes.map((c) => <option key={c.id} value={`class:${c.id}`}>{c.name}</option>)}
            </optgroup>
          )}
          {pupils.length > 0 && (
            <optgroup label="One pupil (and their parents)">
              {pupils.map((p) => <option key={p.id} value={`pupil:${p.id}`}>{p.name} ({p.className})</option>)}
            </optgroup>
          )}
        </SelectField>
        <TextField id="n-title" label="Title" value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} maxLength={200} disabled={busy} autoComplete="off" />
        <div>
          <label htmlFor="n-body" className="mb-1.5 block text-sm font-semibold text-navy-900">Message</label>
          <textarea
            id="n-body"
            rows={5}
            maxLength={2000}
            value={body}
            disabled={busy}
            onChange={(e) => { setBody(e.target.value); setError(''); }}
            className="w-full rounded-lg border border-navy-400 bg-white p-3 text-base text-navy-900 focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50"
          />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {done && <p role="status" className="text-sm font-semibold text-green-800">{done}</p>}
        <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full sm:w-auto">
          {busy ? 'Sending…' : 'Send notice'}
        </Button>
      </form>
    </Card>
  );
}

function SentCard({ items, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const remove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await deleteAnnouncement(id);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card aria-labelledby="sent-title">
      <CardHeader id="sent-title" icon={Megaphone} title="Notices sent" />
      {items.length === 0 ? (
        <p className="p-5 text-sm text-navy-700">No notices yet.</p>
      ) : (
        <CardBody>
          <ul className="divide-y divide-navy-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{item.audience}</Badge>
                    <time dateTime={item.postedAt.toISOString()} className="text-xs text-navy-600">{formatShortDate(item.postedAt)}</time>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-navy-900">{item.title}</h3>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-navy-700">{item.body}</p>
                </div>
                <Button size="sm" variant="ghost" icon={Trash2} loading={busyId === item.id} onClick={() => remove(item.id)} aria-label={`Delete notice ${item.title}`}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
        </CardBody>
      )}
    </Card>
  );
}
