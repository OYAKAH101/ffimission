import { School } from 'lucide-react';
import { Card, CardBody, CardHeader, ProgressBar } from '../ui';

// Simple bar list: one row per class, bar length = number of pupils.
export default function EnrolmentCard({ classes }) {
  const total = classes.reduce((sum, item) => sum + item.pupils, 0);
  const largest = Math.max(1, ...classes.map((item) => item.pupils));

  return (
    <Card aria-labelledby="enrolment-title">
      <CardHeader
        id="enrolment-title"
        icon={School}
        title="Pupils in each class"
        description={`${total} pupils across ${classes.length} classes`}
      />
      <CardBody>
        {classes.length === 0 && <p className="text-sm text-navy-700">No classes have been added yet.</p>}
        <ul className="space-y-3">
          {classes.map((item) => (
            <li key={item.name} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="font-semibold text-navy-800">{item.name}</span>
              <ProgressBar
                value={(item.pupils / largest) * 100}
                label={`${item.name}: ${item.pupils} pupils`}
                tone="navy"
              />
              <span className="text-right font-semibold tabular-nums text-navy-900">{item.pupils}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
