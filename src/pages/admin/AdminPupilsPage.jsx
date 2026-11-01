import { useEffect, useState } from 'react';
import { Camera, Copy, Download, KeyRound, School, UserPlus, Users } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, SelectField, TextField } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import { PupilPhoto } from '../../components/dashboard/PupilProfileCard';
import { useAsync } from '../../hooks/useAsync';
import {
  addStandardClasses, createClass, createPupil, getAdminClasses, getAdminCredentials, getAdminPupils,
  resetPupilPassword, updatePupil, uploadPupilPhoto,
} from '../../services/dataService';

const SIGN_IN = {
  never: { tone: 'warning', label: 'Not signed in yet' },
  active: { tone: 'success', label: 'Active' },
  locked: { tone: 'danger', label: 'Locked' },
  'no-account': { tone: 'neutral', label: 'No login' },
};

// Spreadsheet programs run text that starts with = + - @ as a formula, so defuse it.
const csvCell = (value) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

function downloadCsv(rows) {
  const lines = [['Pupil', 'Class', 'Username', 'Password'], ...rows.map((r) => [r.name, r.className, r.username, r.password])];
  const blob = new Blob([`﻿${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `pupil-logins-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================================================
// Administrator screen: add pupils (name, photo, class) and look after each pupil's own login.
// Every pupil gets a different random password that the administrator can look up again.
// ============================================================================
export default function AdminPupilsPage() {
  const classes = useAsync(getAdminClasses, []);
  const pupils = useAsync(getAdminPupils, []);
  const [showLogins, setShowLogins] = useState(false);
  const [loginsVersion, setLoginsVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const loginsChanged = () => {
    setShowLogins(true);
    setLoginsVersion((n) => n + 1);
  };

  return (
    <>
      <PageHeader
        title="Pupils"
        subtitle="Add each pupil with their name, photo and class. Each one gets their own login and sees only their own records."
      />
      <div className="space-y-6">
        <DataState state={classes} label="Loading classes…">
          {(list) => (
            <>
              <ClassesCard list={list} onChanged={classes.reload} />
              {list.length > 0 && (
                <AddPupilForm
                  classes={list}
                  onAdded={(message) => {
                    setNotice(message);
                    loginsChanged();
                    pupils.reload();
                    classes.reload();
                  }}
                />
              )}
            </>
          )}
        </DataState>

        {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">{notice}</p>}
        <LoginsCard open={showLogins} refresh={loginsVersion} onToggle={() => setShowLogins((v) => !v)} />

        <DataState state={pupils} label="Loading pupils…">
          {(rows) => <PupilsTable rows={rows} classes={classes.data ?? []} onChanged={loginsChanged} />}
        </DataState>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ classes

function ClassesCard({ list, onChanged }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setName('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card aria-labelledby="classes-title">
      <CardHeader id="classes-title" icon={School} title="Classes" description="A pupil's class decides their timetable, homework, results and fees." />
      <CardBody>
        {list.length === 0 ? (
          <Alert tone="info" title="Set up the classes first">
            Add the classes the school has before adding pupils.
          </Alert>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {list.map((item) => (
              <li key={item.id}>
                <Badge tone="info">{item.name}: {item.pupils}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          {list.length === 0 && (
            <Button variant="secondary" loading={busy} onClick={() => run(addStandardClasses)}>
              Add Creche to Primary 6
            </Button>
          )}
          <TextField
            id="new-class"
            label="Add another class"
            placeholder="For example: Primary 1A"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="sm:max-w-xs sm:flex-1"
            disabled={busy}
          />
          <Button variant="secondary" disabled={!name.trim()} loading={busy} onClick={() => run(() => createClass(name.trim()))}>
            Add class
          </Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      </CardBody>
    </Card>
  );
}

// ------------------------------------------------------------------ add pupil

function AddPupilForm({ classes, onAdded }) {
  const empty = { firstName: '', lastName: '', otherNames: '', gender: '', admissionNo: '' };
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [classId, setClassId] = useState(classes[0].id); // kept between pupils: handy when adding a whole class
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Enter the pupil’s first name and last name.');
    if (photo && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return setError('Choose a JPEG, PNG or WebP photograph.');
    if (photo && photo.size > 3 * 1024 * 1024) return setError('That photograph is over 3 MB. Please choose a smaller one.');
    setBusy(true);
    setError('');
    try {
      const { pupil } = await createPupil({ ...form, classId });
      let photoNote = '';
      if (photo) {
        try {
          await uploadPupilPhoto(pupil.id, photo);
        } catch (err) {
          photoNote = ` The photo could not be saved (${err.message}) - add it from the table below.`;
        }
      }
      onAdded(`${pupil.name} was added to ${pupil.className}. Their login is in the list below.${photoNote}`);
      setForm(empty);
      setPhoto(null);
      setFileKey((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card aria-labelledby="add-pupil-title">
      <CardHeader id="add-pupil-title" icon={UserPlus} title="Add a pupil" description="This also creates the pupil's own login with a password of their own." />
      <form onSubmit={submit} noValidate className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField id="p-first" label="First name" value={form.firstName} onChange={set('firstName')} disabled={busy} autoComplete="off" />
          <TextField id="p-last" label="Last name" value={form.lastName} onChange={set('lastName')} disabled={busy} autoComplete="off" />
          <TextField id="p-other" label="Other names (optional)" value={form.otherNames} onChange={set('otherNames')} disabled={busy} autoComplete="off" />
          <SelectField id="p-class" label="Class" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={busy}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField id="p-gender" label="Gender (optional)" value={form.gender} onChange={set('gender')} disabled={busy}>
            <option value="">Not stated</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </SelectField>
          <TextField
            id="p-adm"
            label="Admission number (optional)"
            hint="Leave blank and the next number is chosen, for example IMM/2026/0001."
            value={form.admissionNo}
            onChange={set('admissionNo')}
            disabled={busy}
            autoComplete="off"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="p-photo" className="block text-sm font-semibold text-navy-900">Photo (optional)</label>
          <input
            key={fileKey}
            id="p-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => { setPhoto(event.target.files[0] ?? null); setError(''); }}
            className="mt-1 block w-full max-w-sm text-sm text-navy-800 file:mr-3 file:rounded-lg file:border file:border-navy-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
          <p className="mt-1 text-xs text-navy-600">JPEG, PNG or WebP, up to 3 MB. You can also add or change it later.</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
        <Button type="submit" size="lg" icon={UserPlus} loading={busy} className="mt-5 w-full sm:w-auto">
          {busy ? 'Adding…' : 'Add pupil and create login'}
        </Button>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------- login details

// Every pupil's username and password, for the administrator only. Pupils cannot change their
// password, so the office keeps this list and hands each pupil their own line.
function LoginsCard({ open, refresh, onToggle }) {
  const [state, setState] = useState({ rows: null, error: '', loading: false });
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    getAdminCredentials()
      .then((rows) => current && setState({ rows, error: '', loading: false }))
      .catch((err) => current && setState({ rows: null, error: err.message, loading: false }));
    return () => { current = false; };
  }, [open, refresh]);

  const copy = async (entry) => {
    try {
      await navigator.clipboard.writeText(`${entry.name}\nUsername: ${entry.username}\nPassword: ${entry.password}`);
      setNote(`Copied ${entry.name}'s login.`);
    } catch {
      setNote('Your browser blocked copying. Select the text in the table instead.');
    }
  };

  const rows = state.rows ?? [];
  return (
    <Card aria-labelledby="logins-title">
      <CardHeader
        id="logins-title"
        icon={KeyRound}
        title="Login details"
        description="Each pupil's username and password. Only you, as administrator, can see this."
        action={
          <div className="flex gap-2">
            {open && rows.length > 0 && (
              <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCsv(rows)}>Download CSV</Button>
            )}
            <Button size="sm" variant={open ? 'ghost' : 'primary'} onClick={onToggle}>{open ? 'Hide' : 'Show passwords'}</Button>
          </div>
        }
      />
      {open && (
        <CardBody>
          <p className="text-sm text-navy-700">
            Give each pupil only their own line. Pupils cannot change their password, so keep this list private.
            Opening it is recorded in the activity log.
          </p>
          {state.loading && <p role="status" className="mt-3 text-sm text-navy-700">Loading…</p>}
          {state.error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{state.error}</p>}
          {state.rows && rows.length === 0 && <p className="mt-3 text-sm text-navy-700">No pupils yet.</p>}
          {rows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="bg-navy-50 text-left text-navy-700">
                    <th scope="col" className="px-3 py-2 font-semibold">Pupil</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Class</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Username</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Password</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Copy</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {rows.map((entry) => (
                    <tr key={entry.id}>
                      <th scope="row" className="px-3 py-2.5 text-left font-semibold text-navy-900">{entry.name}</th>
                      <td className="px-3 py-2.5 text-navy-800">{entry.className}</td>
                      <td className="px-3 py-2.5 font-mono text-navy-900">{entry.username ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-navy-900">
                        {entry.password ?? <span className="font-sans text-xs font-normal text-red-700">Unavailable: use New password</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {entry.password && (
                          <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(entry)} aria-label={`Copy ${entry.name}'s login`}>Copy</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p role="status" className="mt-3 text-sm text-navy-700">{note}</p>
        </CardBody>
      )}
    </Card>
  );
}

// --------------------------------------------------------------- pupils table

function PupilsTable({ rows, classes, onChanged }) {
  const [patches, setPatches] = useState({}); // changes made on this screen, merged over the loaded rows
  const [photoVersion, setPhotoVersion] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [messages, setMessages] = useState({});

  const patch = (id, change) => setPatches((current) => ({ ...current, [id]: { ...current[id], ...change } }));
  const say = (id, text) => setMessages((current) => ({ ...current, [id]: text }));
  const merged = rows.map((row) => ({ ...row, ...patches[row.id] }));

  const run = async (id, work) => {
    setBusyId(id);
    say(id, '');
    try {
      await work();
    } catch (err) {
      say(id, err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeClass = (row, classId) =>
    run(row.id, async () => {
      const updated = await updatePupil(row.id, { classId });
      patch(row.id, { classId: updated.classId, className: updated.className });
    });

  const issue = (row) =>
    run(row.id, async () => {
      await resetPupilPassword(row.id);
      onChanged();
      patch(row.id, { signInState: 'never' });
      setConfirming(null);
      say(row.id, 'New password issued. See Login details above.');
    });

  const upload = (row, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return say(row.id, 'Choose a JPEG, PNG or WebP photograph.');
    if (file.size > 3 * 1024 * 1024) return say(row.id, 'That photograph is over 3 MB. Please choose a smaller one.');
    return run(row.id, async () => {
      await uploadPupilPhoto(row.id, file);
      patch(row.id, { hasPhoto: true });
      setPhotoVersion((current) => ({ ...current, [row.id]: Date.now() }));
    });
  };

  return (
    <Card aria-labelledby="pupils-title">
      <CardHeader id="pupils-title" icon={Users} title="All pupils" description={`${rows.length} pupil${rows.length === 1 ? '' : 's'} with a login`} />
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-navy-700">No pupils have been added yet. Use the form above to add the first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="bg-navy-50 text-left text-navy-700">
                <th scope="col" className="px-5 py-2.5 font-semibold">Pupil</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Class</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Username</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Sign-in</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {merged.map((row) => {
                const state = SIGN_IN[row.signInState] ?? SIGN_IN['no-account'];
                const busy = busyId === row.id;
                return (
                  <tr key={row.id} className="align-top">
                    <th scope="row" className="px-5 py-3 text-left">
                      <span className="flex items-center gap-3">
                        <PupilPhoto pupil={row} className="size-11 text-base" version={photoVersion[row.id]} />
                        <span>
                          <span className="block font-semibold text-navy-900">{row.name}</span>
                          <span className="block text-xs font-normal text-navy-600">{row.admissionNo}</span>
                        </span>
                      </span>
                    </th>
                    <td className="px-3 py-3">
                      <select
                        aria-label={`Class for ${row.name}`}
                        value={row.classId}
                        disabled={busy}
                        onChange={(event) => changeClass(row, event.target.value)}
                        className="h-10 rounded-lg border border-navy-400 bg-white px-2 text-navy-900 focus:outline-2 focus:outline-marian-500/50"
                      >
                        {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 font-mono text-navy-900">{row.username ?? '—'}</td>
                    <td className="px-3 py-3"><Badge tone={state.tone}>{state.label}</Badge></td>
                    <td className="px-5 py-3">
                      {confirming === row.id ? (
                        <div role="group" aria-label={`Confirm new password for ${row.name}`} className="max-w-60">
                          <p className="text-sm text-navy-800">Make a new password? The old one stops working and {row.firstName} is signed out.</p>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" loading={busy} onClick={() => issue(row)}>Yes, make new</Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" icon={KeyRound} disabled={busy || !row.username} onClick={() => setConfirming(row.id)}>
                            New password
                          </Button>
                          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-3 text-sm font-semibold text-navy-800 hover:bg-navy-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-marian-600">
                            <Camera aria-hidden="true" className="size-5" />
                            {row.hasPhoto ? 'Change photo' : 'Add photo'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={busy}
                              onChange={(event) => {
                                upload(row, event.target.files[0]);
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      )}
                      {messages[row.id] && <p role="alert" className="mt-2 text-sm font-semibold text-navy-900">{messages[row.id]}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
