import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RecentVisits } from "@/components/dashboard/RecentVisits";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MachineStatusChart } from "@/components/dashboard/MachineStatusChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UpcomingRoutes } from "@/components/dashboard/UpcomingRoutes";
import { DollarSign, TrendingUp, Truck, ClipboardCheck } from "lucide-react";

const Index = () => {
  return (
    <AppLayout 
      title="Dashboard" 
      subtitle="Welcome back! Here's your operations overview."
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard
          title="Today's Revenue"
          value="$3,847"
          change="+18.2% vs yesterday"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-emerald-600"
        />
        <KPICard
          title="Weekly Revenue"
          value="$25,604"
          change="+12.5% vs last week"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <KPICard
          title="Active Machines"
          value="142"
          change="187 total in fleet"
          changeType="neutral"
          icon={Truck}
          iconColor="text-amber-600"
        />
        <KPICard
          title="Visits Today"
          value="24"
          change="32 scheduled"
          changeType="neutral"
          icon={ClipboardCheck}
          iconColor="text-violet-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <MachineStatusChart />
        </div>
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentVisits />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <UpcomingRoutes />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
