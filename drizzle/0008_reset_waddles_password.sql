UPDATE credentials
SET password_hash = '9f68fc75e29ac069013fd88bdb5fa052a517d4551cbdfe742f82f216a087f1ee',
    password_salt = 'd5221ac6b89c0136d14dd5e44d7bb4ac',
    password_iterations = 100000,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = (SELECT id FROM users WHERE handle = 'waddles');

DELETE FROM sessions
WHERE user_id = (SELECT id FROM users WHERE handle = 'waddles');
