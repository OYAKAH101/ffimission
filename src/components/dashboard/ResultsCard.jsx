import { GraduationCap } from 'lucide-react';
import { Badge, Card, CardHeader } from '../ui';

// Scores and grades are worked out by the server (one grading scale for the whole system).
export default function ResultsCard({ pupil, className = '' }) {
  const { results, average, position } = pupil;
  const termLabel = [pupil.term, pupil.session].filter(Boolean).join(', ');

  return (
    <Card aria-labelledby="results-title" className={className}>
      <CardHeader
        id="results-title"
        icon={GraduationCap}
        title="Academic results"
        description={termLabel}
        action={position ? <Badge tone="brand">Position: {position}</Badge> : null}
      />
      {results.length === 0 ? (
        <p className="p-5 text-sm text-navy-700">No results have been entered for this term yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">
              {pupil.name}: scores for each subject, {termLabel}
            </caption>
            <thead>
              <tr className="bg-navy-50 text-left text-navy-700">
                <th scope="col" className="px-5 py-2.5 font-semibold">Subject</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">CA (40)</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Exam (60)</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {results.map((row) => (
                <tr key={row.subject}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-navy-900">
                    {row.subject}
                  </th>
                  <td className="px-3 py-3 text-right tabular-nums text-navy-800">{row.ca}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-navy-800">{row.exam}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-navy-900">{row.total}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2">
                      <Badge tone={row.grade.tone}>{row.grade.letter}</Badge>
                      <span className="text-navy-700">{row.grade.remark}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {average && (
              <tfoot>
                <tr className="border-t-2 border-navy-200 bg-navy-50/60">
                  <th scope="row" colSpan={3} className="px-5 py-3 text-left font-bold text-navy-900">
                    Average score
                  </th>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-navy-900">{average.score}</td>
                  <td className="px-5 py-3">
                    <Badge tone={average.grade.tone}>{average.grade.letter}</Badge>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Card>
  );
}
