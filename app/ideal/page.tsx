import { createClient } from "@/lib/supabase/server";
import { fetchIdealNationFeed } from "@/lib/feeds";
import { IdealFeed } from "@/components/IdealFeed";
import { getCommunitySize } from "@/lib/society/member-counts";
import { getViewer } from "@/lib/viewer";

export default async function IdealNationPage() {
  const supabase = await createClient();
  const { authId } = await getViewer();

  const viewer = authId
    ? { voterType: "human" as const, voterId: authId }
    : undefined;

  const [entries, community] = await Promise.all([
    fetchIdealNationFeed(supabase, 30, viewer),
    getCommunitySize(supabase),
  ]);

  return <IdealFeed entries={entries} community={community} />;
}
