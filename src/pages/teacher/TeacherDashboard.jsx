import { useAuth } from '../../context/useAuth';
import { Alert } from '../../components/ui';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import AnnouncementsCard from '../../components/dashboard/AnnouncementsCard';
import {
  AssignedClassesCard,
  ResultsManagementCard,
  TeacherAttendanceCard,
  TeacherHomeworkCard,
} from '../../components/dashboard/TeacherPanels';
import { useAsync } from '../../hooks/useAsync';
import { getAnnouncements, getTeacherOverview } from '../../services/dataService';
import { greeting } from '../../utils/format';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const overview = useAsync(getTeacherOverview, []);
  const news = useAsync(getAnnouncements, []);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name}`} subtitle="Your classes, registers and marking for today." />

      <DataState state={overview} label="Loading your classes…">
        {(data) =>
          data.classes.length === 0 ? (
            <Alert tone="info" title="No classes assigned yet">
              You are not assigned to a class yet. The school office assigns classes and subjects.
            </Alert>
          ) : (
            <div className="space-y-6">
              <AssignedClassesCard classes={data.classes} />

              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <TeacherAttendanceCard classes={data.classes} followUp={data.followUp} />
                <ResultsManagementCard tasks={data.resultsTasks} />
              </div>

              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <TeacherHomeworkCard items={data.homework} />
                <DataState state={news} label="Loading announcements…">
                  {(items) => <AnnouncementsCard items={items} />}
                </DataState>
              </div>
            </div>
          )
        }
      </DataState>
    </>
  );
}
