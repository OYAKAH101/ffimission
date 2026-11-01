import { Link } from 'react-router-dom';
import { ClipboardCheck, GraduationCap, NotebookPen, School } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, ProgressBar } from '../ui';
import { dueLabel, daysUntil } from '../../utils/format';

export function AssignedClassesCard({ classes }) {
  return (
    <Card aria-labelledby="classes-title">
      <CardHeader id="classes-title" icon={School} title="My classes" description="Classes assigned to you this term" />
      <ul className="grid gap-4 p-5 md:grid-cols-3">
        {classes.map((item) => (
          <li key={item.id} className="flex flex-col rounded-lg border border-navy-100 bg-navy-50/50 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-navy-900">{item.name}</h3>
              <Badge tone={item.role === 'Class teacher' ? 'brand' : 'info'}>{item.role}</Badge>
            </div>
            <p className="mt-1 text-sm text-navy-700">{item.subjects}</p>
            <p className="mt-3 text-sm font-semibold text-navy-900">{item.pupils} pupils</p>
            <div className="mt-3 flex-1 text-sm text-navy-700">
              {item.registerTaken ? (
                <p>
                  {item.presentToday} of {item.pupils} present today
                </p>
              ) : (
                <Button as={Link} to="/teacher/attendance" size="sm" variant="secondary" className="mt-1">
                  Take today&rsquo;s register
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TeacherAttendanceCard({ classes, followUp }) {
  return (
    <Card aria-labelledby="t-attendance-title">
      <CardHeader id="t-attendance-title" icon={ClipboardCheck} title="Pupil attendance today" />
      <CardBody>
        <ul className="space-y-4">
          {classes.map((item) => {
            const percent = item.registerTaken && item.pupils > 0 ? (item.presentToday / item.pupils) * 100 : 0;
            return (
              <li key={item.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-navy-900">
                    {item.name}
                    {item.role !== 'Class teacher' && ` (${item.subjects})`}
                  </span>
                  {item.registerTaken ? (
                    <span className="tabular-nums text-navy-700">
                      {item.presentToday} / {item.pupils} present
                    </span>
                  ) : (
                    <Badge tone="warning">Register not taken</Badge>
                  )}
                </div>
                <ProgressBar
                  value={percent}
                  label={`${item.name} attendance today`}
                  tone={percent >= 90 ? 'success' : 'warning'}
                  className="mt-1.5"
                />
              </li>
            );
          })}
        </ul>

        <h3 className="mt-6 text-sm font-bold text-navy-900">Pupils to follow up</h3>
        <ul className="mt-2 divide-y divide-navy-100 rounded-lg border border-navy-100">
          {followUp.map((pupil) => (
            <li key={pupil.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold text-navy-900">{pupil.name}</span>
                <span className="text-navy-600">, {pupil.className}</span>
              </span>
              <span className="text-right text-navy-700">{pupil.note}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function ResultsManagementCard({ tasks }) {
  return (
    <Card aria-labelledby="t-results-title">
      <CardHeader
        id="t-results-title"
        icon={GraduationCap}
        title="Results management"
        description="Scores entered so far this term"
        action={
          <Button as={Link} to="/teacher/results" size="sm" variant="secondary">
            Enter scores
          </Button>
        }
      />
      <ul className="divide-y divide-navy-100">
        {tasks.map((task) => (
          <li key={task.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-navy-900">{task.className}</p>
                <p className="text-sm text-navy-700">{task.subject}</p>
              </div>
              <Badge tone={task.tone}>{task.status}</Badge>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <ProgressBar
                value={task.total > 0 ? (task.entered / task.total) * 100 : 0}
                label={`${task.className} ${task.subject}: ${task.entered} of ${task.total} scores entered`}
                tone={task.total > 0 && task.entered === task.total ? 'success' : 'navy'}
              />
              <span className="shrink-0 text-xs tabular-nums text-navy-700">
                {task.entered}/{task.total} scores
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TeacherHomeworkCard({ items }) {
  return (
    <Card aria-labelledby="t-homework-title">
      <CardHeader
        id="t-homework-title"
        icon={NotebookPen}
        title="Homework and assignments"
        action={
          <Button as={Link} to="/teacher/homework" size="sm" variant="secondary">
            Set homework
          </Button>
        }
      />
      <ul className="divide-y divide-navy-100">
        {items.map((item) => {
          const overdue = daysUntil(item.due) < 0;
          return (
            <li key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-navy-900">{item.title}</p>
                <Badge tone={overdue ? 'neutral' : daysUntil(item.due) <= 1 ? 'warning' : 'info'}>
                  {overdue ? 'Closed' : dueLabel(item.due)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-navy-700">{item.className}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
