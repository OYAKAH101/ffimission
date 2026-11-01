import { useState } from 'react';
import { ClipboardCheck, Save } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, SelectField } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import { useAsync } from '../../hooks/useAsync';
import { getRecordClasses, getRegister, saveRegister } from '../../services/dataService';

const STATUSES = [
  ['present', 'Present'],
  ['late', 'Late'],
  ['absent', 'Absent'],
];

// Local calendar date as YYYY-MM-DD (not the UTC date, which can be a day behind in the morning).
const todayText = () => new Date().toLocaleDateString('en-CA');

// ============================================================================
// The class teacher (or the administrator) takes the daily register. Parents and pupils
// then see attendance counts on their own pages.
// ============================================================================
export default function AttendancePage() {
  const info = useAsync(getRecordClasses, []);
  return (
    <>
      <PageHeader title="Attendance" subtitle="Take the daily register for a class." />
      <DataState state={info} label="Loading your classes…">
        {(data) => {
          const classes = data.classes.filter((c) => c.canRegister);
          return classes.length === 0 ? (
            <Alert tone="info" title="No register to take">
              Only a class teacher or the administrator takes the register. If you are a class teacher, ask the school office to assign you.
            </Alert>
          ) : (
            <Register classes={classes} />
          );
        }}
      </DataState>
    </>
  );
}

function Register({ classes }) {
  const [classId, setClassId] = useState(classes[0].id);
  const [date, setDate] = useState(todayText());
  return (
    <Card aria-labelledby="reg-title">
      <CardHeader id="reg-title" icon={ClipboardCheck} title="Register" />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="a-class" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <div>
            <label htmlFor="a-date" className="mb-1.5 block text-sm font-semibold text-navy-900">Date</label>
            <input
              id="a-date"
              type="date"
              value={date}
              max={todayText()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-navy-400 bg-white px-3 text-base text-navy-900 focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50"
            />
          </div>
        </div>
        <RegisterTable key={`${classId}|${date}`} classId={classId} date={date} />
      </CardBody>
    </Card>
  );
}

function RegisterTable({ classId, date }) {
  const sheet = useAsync(() => getRegister(classId, date), [classId, date]);
  return (
    <div className="mt-5">
      <DataState state={sheet} label="Loading the register…">
        {(data) => <Marks classId={classId} date={date} data={data} />}
      </DataState>
    </div>
  );
}

function Marks({ classId, date, data }) {
  // A register that was never taken starts with everyone present: mark the exceptions.
  const [marks, setMarks] = useState(Object.fromEntries(data.pupils.map((p) => [p.id, p.status ?? 'present'])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ tone: '', text: '' });

  const set = (id, status) => {
    setMarks((m) => ({ ...m, [id]: status }));
    setMessage({ tone: '', text: '' });
  };
  const counts = Object.values(marks).reduce((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});

  const save = async () => {
    setBusy(true);
    setMessage({ tone: '', text: '' });
    try {
      await saveRegister(classId, date, data.pupils.map((p) => ({ pupilId: p.id, status: marks[p.id] })));
      setMessage({ tone: 'ok', text: 'Register saved.' });
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (data.pupils.length === 0) return <p className="text-sm text-navy-700">There are no pupils in this class yet.</p>;
  return (
    <>
      <p className="mb-3 text-sm text-navy-700">
        {data.taken ? 'This register was already taken; you can correct it.' : 'Everyone starts as present. Mark the pupils who are late or absent.'}
      </p>
      <ul className="divide-y divide-navy-100 rounded-lg border border-navy-100">
        {data.pupils.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <span className="font-semibold text-navy-900">{p.name}</span>
            <fieldset className="flex gap-1.5">
              <legend className="sr-only">Attendance for {p.name}</legend>
              {STATUSES.map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold focus-within:outline-2 focus-within:outline-marian-600 ${
                    marks[p.id] === value
                      ? value === 'absent' ? 'border-red-600 bg-red-600 text-white' : value === 'late' ? 'border-amber-500 bg-amber-500 text-navy-900' : 'border-navy-800 bg-navy-800 text-white'
                      : 'border-navy-200 bg-white text-navy-800'
                  }`}
                >
                  <input type="radio" className="sr-only" name={`att-${p.id}`} value={value} checked={marks[p.id] === value} onChange={() => set(p.id, value)} disabled={busy} />
                  {label}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-navy-700">Present {counts.present ?? 0}, late {counts.late ?? 0}, absent {counts.absent ?? 0}.</p>
      {message.text && (
        <p role={message.tone === 'bad' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${message.tone === 'bad' ? 'text-red-700' : 'text-green-800'}`}>{message.text}</p>
      )}
      <Button size="lg" icon={Save} loading={busy} onClick={save} className="mt-4">{busy ? 'Saving…' : 'Save register'}</Button>
    </>
  );
}
