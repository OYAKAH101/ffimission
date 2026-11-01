import { useEffect, useState } from 'react';
import { GraduationCap, Save } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, SelectField, TextField } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import { useAsync } from '../../hooks/useAsync';
import { addClassSubjects, getRecordClasses, getResultSheet, saveResultSheet, setCurrentTerm } from '../../services/dataService';

// ASSUMPTION (same as the server): continuous assessment out of 40, exam out of 60.
const CA_MAX = 40;
const EXAM_MAX = 60;
const TERMS = ['First Term', 'Second Term', 'Third Term'];

// ============================================================================
// Administrators and teachers type in each pupil's scores for a subject.
// Pupils and parents then see them (with grade and class position) on their own pages.
// ============================================================================
export default function ResultsEntryPage({ isAdmin = false }) {
  const info = useAsync(getRecordClasses, []);
  return (
    <>
      <PageHeader title="Results" subtitle="Enter each pupil's continuous assessment (CA) and exam scores for a subject." />
      <DataState state={info} label="Loading your classes…">{(data) => <Content data={data} isAdmin={isAdmin} />}</DataState>
    </>
  );
}

// Keeps the term and any subjects added on this screen in local state, so saving them never
// reloads the page and throws away the class and subject you had chosen.
function Content({ data, isAdmin }) {
  const [term, setTerm] = useState(data.term);
  return (
    <div className="space-y-6">
      <TermCard term={term} canSet={isAdmin} onSaved={setTerm} />
      {data.classes.length === 0 ? (
        <Alert tone="info" title="No classes yet">
          {isAdmin ? 'Add the classes first in Pupil records.' : 'You are not assigned to a class yet. The school office assigns classes and subjects.'}
        </Alert>
      ) : (
        <Sheet classes={data.classes} termSet={Boolean(term)} />
      )}
    </div>
  );
}

function TermCard({ term, canSet, onSaved }) {
  const [editing, setEditing] = useState(!term && canSet);
  const [session, setSession] = useState(term?.session ?? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [name, setName] = useState(term?.term ?? 'First Term');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await setCurrentTerm(session.trim(), name);
      onSaved(saved.term);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!term && !canSet) {
    return <Alert tone="warning" title="Term not set">The administrator has not set the current term yet, so scores cannot be saved.</Alert>;
  }
  return (
    <Card aria-labelledby="term-title">
      <CardHeader id="term-title" icon={GraduationCap} title="Current term" description="Scores and registers are filed under this term." />
      <CardBody>
        {!editing && term ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-navy-900">{term.session}, {term.term}</p>
            {canSet && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change term</Button>}
          </div>
        ) : (
          <form onSubmit={save} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField id="t-session" label="Session" hint="For example 2026/2027" value={session} onChange={(e) => setSession(e.target.value)} disabled={busy} className="sm:w-48" />
            <SelectField id="t-term" label="Term" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className="sm:w-48">
              {TERMS.map((t) => <option key={t}>{t}</option>)}
            </SelectField>
            <Button type="submit" loading={busy}>Save term</Button>
            {term && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      </CardBody>
    </Card>
  );
}

function Sheet({ classes: loaded, termSet }) {
  const [added, setAdded] = useState({}); // subjects added on this screen, by class id
  const classes = loaded.map((c) => ({ ...c, subjects: added[c.id] ?? c.subjects }));
  const [classId, setClassId] = useState(classes[0].id);
  const cls = classes.find((c) => c.id === classId) ?? classes[0];
  const [subject, setSubject] = useState(cls.subjects[0] ?? '');
  const [extra, setExtra] = useState('');
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [subjectError, setSubjectError] = useState('');

  // keep the subject valid when the class changes
  useEffect(() => {
    if (!cls.subjects.includes(subject)) setSubject(cls.subjects[0] ?? '');
  }, [cls, subject]);

  const addSubjects = async (body) => {
    setSubjectBusy(true);
    setSubjectError('');
    try {
      const subjects = await addClassSubjects(cls.id, body);
      setAdded((a) => ({ ...a, [cls.id]: subjects }));
      setExtra('');
    } catch (err) {
      setSubjectError(err.message);
    } finally {
      setSubjectBusy(false);
    }
  };

  return (
    <Card aria-labelledby="sheet-title">
      <CardHeader id="sheet-title" icon={GraduationCap} title="Enter scores" />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="r-class" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <SelectField id="r-subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={cls.subjects.length === 0}>
            {cls.subjects.length === 0 && <option value="">No subjects yet</option>}
            {cls.subjects.map((s) => <option key={s}>{s}</option>)}
          </SelectField>
        </div>

        {cls.canManage && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {cls.subjects.length === 0 && (
              <Button variant="secondary" loading={subjectBusy} onClick={() => addSubjects({ usual: true })}>Add the usual subjects</Button>
            )}
            <TextField id="r-extra" label="Add a subject to this class" value={extra} onChange={(e) => setExtra(e.target.value)} className="sm:max-w-xs sm:flex-1" disabled={subjectBusy} />
            <Button variant="secondary" disabled={!extra.trim()} loading={subjectBusy} onClick={() => addSubjects({ subjects: [extra.trim()] })}>Add subject</Button>
          </div>
        )}
        {subjectError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{subjectError}</p>}

        {!termSet ? (
          <Alert tone="warning" title="Term not set" className="mt-5">The current term has to be set before scores can be saved.</Alert>
        ) : subject ? (
          <ScoreTable key={`${cls.id}|${subject}`} classId={cls.id} subject={subject} />
        ) : (
          <p className="mt-5 text-sm text-navy-700">Choose a subject to start.</p>
        )}
      </CardBody>
    </Card>
  );
}

function ScoreTable({ classId, subject }) {
  const sheet = useAsync(() => getResultSheet(classId, subject), [classId, subject]);
  return (
    <div className="mt-5">
      <DataState state={sheet} label="Loading pupils…">
        {(data) => <Rows classId={classId} subject={subject} data={data} />}
      </DataState>
    </div>
  );
}

function Rows({ classId, subject, data }) {
  const initial = Object.fromEntries(data.pupils.map((p) => [p.id, { ca: p.ca ?? '', exam: p.exam ?? '' }]));
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ tone: '', text: '', pupilId: null });
  const [dirty, setDirty] = useState(false);

  const change = (id, field) => (event) => {
    setValues((v) => ({ ...v, [id]: { ...v[id], [field]: event.target.value } }));
    setDirty(true);
    setMessage({ tone: '', text: '', pupilId: null });
  };

  const save = async () => {
    setBusy(true);
    setMessage({ tone: '', text: '', pupilId: null });
    try {
      const scores = data.pupils.map((p) => ({ pupilId: p.id, ca: values[p.id].ca, exam: values[p.id].exam }));
      const result = await saveResultSheet(classId, subject, scores);
      setDirty(false);
      setMessage({ tone: 'ok', text: `Saved ${result.saved} score${result.saved === 1 ? '' : 's'} for ${subject}.`, pupilId: null });
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message, pupilId: err.data?.pupilId ?? null });
    } finally {
      setBusy(false);
    }
  };

  if (data.pupils.length === 0) return <p className="text-sm text-navy-700">There are no pupils in this class yet.</p>;
  const total = (id) => {
    const { ca, exam } = values[id];
    return ca === '' || exam === '' || Number.isNaN(Number(ca)) || Number.isNaN(Number(exam)) ? '—' : Number(ca) + Number(exam);
  };

  return (
    <>
      <p className="mb-2 text-sm text-navy-700">{data.term.session}, {data.term.term}. Leave a pupil blank if there is no score yet.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="bg-navy-50 text-left text-navy-700">
              <th scope="col" className="px-3 py-2 font-semibold">Pupil</th>
              <th scope="col" className="px-3 py-2 font-semibold">CA (0–{CA_MAX})</th>
              <th scope="col" className="px-3 py-2 font-semibold">Exam (0–{EXAM_MAX})</th>
              <th scope="col" className="px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {data.pupils.map((p) => (
              <tr key={p.id} className={message.pupilId === p.id ? 'bg-red-50' : ''}>
                <th scope="row" className="px-3 py-2 text-left font-semibold text-navy-900">{p.name}</th>
                {['ca', 'exam'].map((field) => (
                  <td key={field} className="px-3 py-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={field === 'ca' ? CA_MAX : EXAM_MAX}
                      step="any"
                      aria-label={`${field === 'ca' ? 'CA' : 'Exam'} score for ${p.name}`}
                      value={values[p.id][field]}
                      onChange={change(p.id, field)}
                      disabled={busy}
                      className="h-11 w-24 rounded-lg border border-navy-400 bg-white px-2 text-base text-navy-900 focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 font-bold text-navy-900">{total(p.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message.text && (
        <p role={message.tone === 'bad' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${message.tone === 'bad' ? 'text-red-700' : 'text-green-800'}`}>{message.text}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button size="lg" icon={Save} loading={busy} onClick={save}>{busy ? 'Saving…' : 'Save scores'}</Button>
        {dirty && !busy && <span className="text-sm text-navy-700">You have unsaved changes.</span>}
      </div>
    </>
  );
}
