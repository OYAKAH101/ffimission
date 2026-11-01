import { useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, Button, Card, CardHeader, SelectField, TextField } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import AnnouncementsCard from '../../components/dashboard/AnnouncementsCard';
import { useAsync } from '../../hooks/useAsync';
import { getAnnouncements, getRecordClasses, sendClassNotice } from '../../services/dataService';

// Teachers: send a notice to one of your classes (its pupils and their parents) and read school notices.
export default function ClassNoticesPage() {
  const info = useAsync(getRecordClasses, []);
  const news = useAsync(getAnnouncements, []);
  return (
    <>
      <PageHeader title="Notices" subtitle="Send a message to a class you teach, and read notices from the school." />
      <div className="space-y-6">
        <DataState state={info} label="Loading your classes…">
          {(data) =>
            data.classes.length === 0 ? (
              <Alert tone="info" title="No classes yet">You are not assigned to a class yet.</Alert>
            ) : (
              <Compose classes={data.classes} onSent={news.reload} />
            )
          }
        </DataState>
        <DataState state={news} label="Loading notices…">{(items) => <AnnouncementsCard items={items} />}</DataState>
      </div>
    </>
  );
}

function Compose({ classes, onSent }) {
  const [classId, setClassId] = useState(classes[0].id);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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
      const result = await sendClassNotice(classId, title.trim(), body.trim());
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
    <Card aria-labelledby="cn-title">
      <CardHeader id="cn-title" icon={Send} title="Write a notice" />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <SelectField id="cn-class" label="Send to" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={busy}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} (pupils and their parents)</option>)}
        </SelectField>
        <TextField id="cn-title-input" label="Title" value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} maxLength={200} disabled={busy} autoComplete="off" />
        <div>
          <label htmlFor="cn-body" className="mb-1.5 block text-sm font-semibold text-navy-900">Message</label>
          <textarea id="cn-body" rows={5} maxLength={2000} value={body} disabled={busy} onChange={(e) => { setBody(e.target.value); setError(''); }}
            className="w-full rounded-lg border border-navy-400 bg-white p-3 text-base text-navy-900 focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50" />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {done && <p role="status" className="text-sm font-semibold text-green-800">{done}</p>}
        <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full sm:w-auto">{busy ? 'Sending…' : 'Send notice'}</Button>
      </form>
    </Card>
  );
}
