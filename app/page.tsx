import { createClient } from "@/lib/supabase/server";
import { fetchPlazaFeed } from "@/lib/feeds";
import { fetchHotTopics } from "@/lib/sidebar-data";
import { PlazaFeed } from "@/components/PlazaFeed";
import { getCommunitySize } from "@/lib/society/member-counts";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  const supabase = await createClient();
  const { authId } = await getViewer();

  const viewer = authId
    ? { voterType: "human" as const, voterId: authId }
    : undefined;

  const [postList, hotTopics, community] = await Promise.all([
    fetchPlazaFeed(supabase, 50, viewer),
    fetchHotTopics(supabase, 10),
    getCommunitySize(supabase),
  ]);

  return (
    <PlazaFeed
      initialPosts={postList}
      hotTopics={hotTopics}
      promotionThreshold={community.promotionThreshold}
      authId={authId ?? undefined}
    />
  );
}
