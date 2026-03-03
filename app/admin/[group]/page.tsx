import AdminGroupClient from "./admin-client";

export default async function AdminGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  return <AdminGroupClient slug={group} />;
}

