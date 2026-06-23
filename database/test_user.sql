-- Проверка потребители

USE fitness_adaptive_system;

SELECT 
    id,
    first_name,
    last_name,
    username,
    email,
    phone,
    created_at
FROM users
ORDER BY id;