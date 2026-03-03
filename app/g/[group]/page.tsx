import DashboardClient from "./dashboard-client";

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  return <DashboardClient slug={group} />;
}


