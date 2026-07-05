import { supabase } from "./supabase";

export type User = {
  id: number;
  name: string;
  xp: number;
  upoints: number;
  avatar: string;
  last_active: string;
  created_at: string;
  orders: number;
  saved_items: number;
};

export type GameType = "block" | "merge" | "quiz" | "connect";

export async function createUser(name: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({ name, upoints: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUser(id: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getLeaderboard(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("xp", { ascending: false })
    .limit(10);
  if (error) return [];
  return data ?? [];
}

export async function saveGameScore(
  userId: number,
  gameType: GameType,
  score: number
): Promise<void> {
  await supabase.from("game_scores").insert({
    user_id: userId,
    game_type: gameType,
    score,
  });
}

export async function addXp(
  userId: number,
  xp: number,
  upoints: number
): Promise<void> {
  await supabase.rpc("add_xp", {
    uid: userId,
    xp_add: xp,
    pt_add: upoints,
  });
}

export async function updateLastActive(userId: number): Promise<void> {
  await supabase
    .from("users")
    .update({ last_active: new Date().toISOString() })
    .eq("id", userId);
}

export function subscribeLeaderboard(
  callback: (users: User[]) => void
) {
  return supabase
    .channel("leaderboard")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      async () => {
        const users = await getLeaderboard();
        callback(users);
      }
    )
    .subscribe();
}
