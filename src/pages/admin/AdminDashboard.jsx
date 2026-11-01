import { School, UserCog, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import PageHeader from '../../components/dashboard/PageHeader';
import DataState from '../../components/dashboard/DataState';
import StatCard from '../../components/dashboard/StatCard';
import QuickLinks from '../../components/dashboard/QuickLinks';
import EnrolmentCard from '../../components/dashboard/EnrolmentCard';
import AnnouncementsCard from '../../components/dashboard/AnnouncementsCard';
import ActivityCard from '../../components/dashboard/ActivityCard';
import { useAsync } from '../../hooks/useAsync';
import { getAdminSummary, getAnnouncements } from '../../services/dataService';
import { navFor } from '../../config/navigation';
import { ROLES } from '../../utils/roles';
import { greeting } from '../../utils/format';

// Shortcuts the brief asks for: records, classes, staff, fees and results.
const QUICK_LINK_PATHS = ['/admin/pupils', '/admin/classes', '/admin/staff', '/admin/fees', '/admin/results'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const summary = useAsync(getAdminSummary, []);
  const news = useAsync(getAnnouncements, []);
  const quickLinks = navFor(ROLES.ADMIN).filter((item) => QUICK_LINK_PATHS.includes(item.to));

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name}`} subtitle="Here is how the school looks today." />

      <DataState state={summary} label="Loading school figures…">
        {({ stats, enrolment, activities }) => (
          <>
            <section aria-label="School at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Users} label="Total pupils" value={stats.pupils} />
              <StatCard icon={UserCog} label="Total teachers" value={stats.teachers} />
              <StatCard icon={School} label="Classes" value={stats.classes} hint={stats.classRange} />
              <StatCard
                icon={Wallet}
                label="Fees collected"
                value={stats.feesCollectedPercent === null ? '—' : `${stats.feesCollectedPercent}%`}
                hint="of this term's expected fees"
              />
            </section>

            <div className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Go to</h2>
              <QuickLinks items={quickLinks} />
            </div>

            <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <EnrolmentCard classes={enrolment} />
              <DataState state={news} label="Loading announcements…">
                {(items) => <AnnouncementsCard items={items} />}
              </DataState>
              <div className="lg:col-span-2 xl:col-span-1">
                <ActivityCard items={activities} />
              </div>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
