export const tables = {
  users: "users",
  recipes: "recipes",
  likes: "likes",
  bookmarks: "bookmarks",
  comments: "comments",
  follows: "follows",
  credentials: "credentials",
  sessions: "sessions",
  authAttempts: "auth_attempts",
} as const;

export type ImageKey = "pumpkin" | "gnocchi" | "baking";
