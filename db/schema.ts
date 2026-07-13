export const tables = {
  users: "users",
  recipes: "recipes",
  likes: "likes",
  bookmarks: "bookmarks",
  comments: "comments",
  recipeTags: "recipe_tags",
  recipeEdits: "recipe_edits",
  notifications: "notifications",
  follows: "follows",
  credentials: "credentials",
  sessions: "sessions",
  authAttempts: "auth_attempts",
} as const;

export type ImageKey = "pumpkin" | "gnocchi" | "baking";
