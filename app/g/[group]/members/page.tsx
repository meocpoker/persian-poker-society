import MembersClient from "./members-client";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  return <MembersClient slug={group} />;
}
