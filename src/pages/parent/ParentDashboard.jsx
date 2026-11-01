import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Alert } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import ChildSwitcher from '../../components/dashboard/ChildSwitcher';
import PupilProfileCard from '../../components/dashboard/PupilProfileCard';
import ResultsCard from '../../components/dashboard/ResultsCard';
import AttendanceCard from '../../components/dashboard/AttendanceCard';
import FeesCard from '../../components/dashboard/FeesCard';
import HomeworkCard from '../../components/dashboard/HomeworkCard';
import TimetableCard from '../../components/dashboard/TimetableCard';
import AnnouncementsCard from '../../components/dashboard/AnnouncementsCard';
import { useAsync } from '../../hooks/useAsync';
import { getAnnouncements, getMyPupils, getPupilOverview } from '../../services/dataService';
import { greeting, formatNaira } from '../../utils/format';
import { attendanceSummary, feeSummary } from '../../utils/pupilStats';

// One parent account, several children. The server returns only the pupils linked to this
// account, and refuses a request for any other pupil even if someone edits the address.
export default function ParentDashboard() {
  const { user } = useAuth();
  const children = useAsync(getMyPupils, []);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name}`}
        subtitle="Welcome to the school portal. Here is how your children are getting on this term."
      />
      <DataState state={children} label="Loading your children…">
        {(list) =>
          list.length === 0 ? (
            <Alert tone="info" title="No pupils linked yet">
              No pupil is linked to your account. Please contact the school office.
            </Alert>
          ) : (
            <Children list={list} />
          )
        }
      </DataState>
    </>
  );
}

function Children({ list }) {
  const [activeId, setActiveId] = useState(list[0].id);
  const overview = useAsync(() => getPupilOverview(activeId), [activeId]);
  const news = useAsync(getAnnouncements, []);
  const active = list.find((child) => child.id === activeId);

  return (
    <>
      {list.length > 1 && <ChildSwitcher pupils={list} activeId={activeId} onChange={setActiveId} />}
      <p className="sr-only" role="status">
        Showing {active.name}, {active.className}
      </p>

      <DataState state={overview} label={`Loading ${active.firstName}'s records…`}>
        {(pupil) => {
          const fees = feeSummary(pupil.fees);
          const attendance = attendanceSummary(pupil.attendance);
          const stats = [
            { label: 'Average score', value: pupil.average ? pupil.average.score : '—' },
            { label: 'Attendance', value: attendance.percent === null ? '—' : `${attendance.percent}%` },
            { label: 'Fees balance', value: fees.total === 0 ? '—' : fees.balance === 0 ? 'Nil' : formatNaira(fees.balance) },
          ];
          return (
            <div className="space-y-6">
              <PupilProfileCard pupil={pupil} stats={stats} />

              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
                <ResultsCard pupil={pupil} className="xl:col-span-2" />
                <div className="min-w-0 space-y-6">
                  <AttendanceCard attendance={pupil.attendance} />
                  <FeesCard fees={pupil.fees} />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
                <div className="min-w-0 xl:col-span-2">
                  <TimetableCard timetable={pupil.timetable} idPrefix="parent-tt" />
                </div>
                <HomeworkCard items={pupil.homework} />
              </div>
            </div>
          );
        }}
      </DataState>

      <div className="mt-6">
        <DataState state={news} label="Loading announcements…">
          {(items) => <AnnouncementsCard items={items} layout="grid" />}
        </DataState>
      </div>
    </>
  );
}
