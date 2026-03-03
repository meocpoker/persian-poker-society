import { createClient } from "@supabase/supabase-js";
import SignupForm from "./signup-form";

export default async function GroupRegisterPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group: slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("groups")
    .select("id,name,slug")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Group not found</h1>
        <p>Slug: {slug}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 520 }}>
      <h1 style={{ fontSize: 48, marginBottom: 10 }}>Register</h1>
      <p style={{ fontSize: 22, marginBottom: 24 }}>
        Group: <b>{data.name}</b>
      </p>

      <SignupForm groupId={data.id} groupSlug={data.slug} />
    </main>
  );
}

