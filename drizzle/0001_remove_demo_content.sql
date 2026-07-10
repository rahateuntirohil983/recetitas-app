DELETE FROM comments
WHERE recipe_id LIKE 'recipe_demo_%' OR author_id LIKE 'user_demo_%';

DELETE FROM likes
WHERE recipe_id LIKE 'recipe_demo_%' OR user_id LIKE 'user_demo_%';

DELETE FROM bookmarks
WHERE recipe_id LIKE 'recipe_demo_%' OR user_id LIKE 'user_demo_%';

DELETE FROM follows
WHERE follower_id LIKE 'user_demo_%' OR followed_id LIKE 'user_demo_%';

DELETE FROM recipes
WHERE id LIKE 'recipe_demo_%' OR author_id LIKE 'user_demo_%';

DELETE FROM users
WHERE id LIKE 'user_demo_%' OR email LIKE '%@demo.recetitas.app';
