import { useAuth } from '../../context/useAuth';
import { Alert } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import PupilProfileCard from '../../components/dashboard/PupilProfileCard';
import ResultsCard from '../../components/dashboard/ResultsCard';
import AttendanceCard from '../../components/dashboard/AttendanceCard';
import HomeworkCard from '../../components/dashboard/HomeworkCard';
import TimetableCard from '../../components/dashboard/TimetableCard';
import AnnouncementsCard from '../../components/dashboard/AnnouncementsCard';
import { useAsync } from '../../hooks/useAsync';
import { getAnnouncements, getMyPupils, getPupilOverview } from '../../services/dataService';
import { greeting } from '../../utils/format';
import { attendanceSummary } from '../../utils/pupilStats';

// A pupil account is linked to exactly one pupil record. The server returns only that record.
export default function StudentDashboard() {
  const { user } = useAuth();
  const mine = useAsync(getMyPupils, []);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle="Your lessons, homework and results." />
      <DataState state={mine} label="Loading your records…">
        {(list) =>
          list.length === 0 ? (
            <Alert tone="info" title="No record linked yet">
              Your account is not linked to a pupil record yet. Please ask your teacher or the school office.
            </Alert>
          ) : (
            <MyRecord pupilId={list[0].id} />
          )
        }
      </DataState>
    </>
  );
}

function MyRecord({ pupilId }) {
  const overview = useAsync(() => getPupilOverview(pupilId), [pupilId]);
  const news = useAsync(getAnnouncements, []);

  return (
    <DataState state={overview} label="Loading your records…">
      {(pupil) => {
        const attendance = attendanceSummary(pupil.attendance);
        const stats = [
          { label: 'Average score', value: pupil.average ? pupil.average.score : '—' },
          { label: 'Attendance', value: attendance.percent === null ? '—' : `${attendance.percent}%` },
          { label: 'Class position', value: pupil.position ? pupil.position.split(' ')[0] : '—' },
        ];
        return (
          <div className="space-y-6">
            <PupilProfileCard pupil={pupil} stats={stats} />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
              <ResultsCard pupil={pupil} className="xl:col-span-2" />
              <div className="min-w-0 space-y-6">
                <AttendanceCard attendance={pupil.attendance} />
                <HomeworkCard items={pupil.homework} />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <TimetableCard timetable={pupil.timetable} idPrefix="student-tt" />
              </div>
              <DataState state={news} label="Loading announcements…">
                {(items) => <AnnouncementsCard items={items} />}
              </DataState>
            </div>
          </div>
        );
      }}
    </DataState>
  );
}
