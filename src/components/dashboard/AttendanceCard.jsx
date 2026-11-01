import { CalendarCheck } from 'lucide-react';
import { Card, CardBody, CardHeader, ProgressBar } from '../ui';
import { attendanceSummary } from '../../utils/pupilStats';

export default function AttendanceCard({ attendance }) {
  const summary = attendanceSummary(attendance);
  const cells = [
    ['Present', summary.present],
    ['Absent', summary.absent],
    ['Late', summary.late],
  ];

  return (
    <Card aria-labelledby="attendance-title">
      <CardHeader
        id="attendance-title"
        icon={CalendarCheck}
        title="Attendance"
        description={summary.schoolDays > 0 ? `${summary.schoolDays} school days so far this term` : 'No register taken yet this term'}
      />
      <CardBody>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-black text-navy-900">{summary.percent === null ? '—' : `${summary.percent}%`}</span>
          <span className="text-sm text-navy-700">attendance rate</span>
        </p>
        <ProgressBar
          value={summary.percent ?? 0}
          label="Attendance rate this term"
          tone={(summary.percent ?? 0) >= 90 ? 'success' : 'warning'}
          className="mt-3"
        />
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {cells.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-navy-50 px-3 py-2.5 text-center">
              <dt className="text-xs text-navy-700">{label}</dt>
              <dd className="font-display text-xl font-black tabular-nums text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-navy-600">Late arrivals count as present in the rate.</p>
      </CardBody>
    </Card>
  );
}
