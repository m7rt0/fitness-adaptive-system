const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const parts = storedHash.split(":");

    if (parts.length !== 2) {
        return false;
    }

    const salt = parts[0];
    const hash = parts[1];

    const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

    return hash === newHash;
}

function isValidName(value) {
    return /^[А-Я][а-я]+(-[А-Я][а-я]+)?$/.test(value);
}

function isValidUsername(value) {
    return /^[A-Za-zА-Яа-я0-9_]{6,30}$/.test(value);
}

function isValidEmail(value) {
    return /^[A-Za-z0-9._%+-]+@(gmail\.com|abv\.bg)$/.test(value);
}

function isValidPhone(value) {
    return /^08[7-9][0-9]{7}$/.test(value);
}

function isValidPassword(value) {
    return value.length >= 6;
}

router.post("/register", async (req, res) => {
    try {
        const firstName = String(req.body.first_name || "").trim();
        const lastName = String(req.body.last_name || "").trim();
        const username = String(req.body.username || "").trim().toLowerCase();
        const email = String(req.body.email || "").trim().toLowerCase();
        const phone = String(req.body.phone || "").trim();
        const password = String(req.body.password || "");

        if (!firstName || !lastName || !username || !email || !phone || !password) {
            return res.status(400).json({ error: "Попълнете празните полета!" });
        }

        if (!isValidName(firstName)) {
            return res.status(400).json({
                error: "Името трябва да започва с главна буква и да бъде изписано на кирилица!"
            });
        }

        if (!isValidName(lastName)) {
            return res.status(400).json({
                error: "Фамилията трябва да започва с главна буква и да бъде изписана на кирилица!"
            });
        }

        if (!isValidUsername(username)) {
            return res.status(400).json({
                error: "Невалидно потребителско име, може да съдържа само букви, цифри и долна черта, трябва да съдържа минимум 6 знака!"
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: "Невалиден имейл!"
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                error: "Невалиден телефонен номер!"
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                error: "Невалидна парола, трябва да съдържа минимум 6 знака!"
            });
        }

        const [sameUsername] = await db.query(
            "SELECT id FROM users WHERE username = ?",
            [username]
        );

        if (sameUsername.length > 0) {
            return res.status(400).json({
                error: "Потребителското име е заето."
            });
        }

        const [sameEmail] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (sameEmail.length > 0) {
            return res.status(400).json({
                error: "Имейлът е зает!"
            });
        }

        const passwordHash = hashPassword(password);
        const fullName = `${firstName} ${lastName}`;

        await db.query(
            `INSERT INTO users 
            (first_name, last_name, username, email, phone, password_hash, name, fitness_level, goal, training_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                firstName,
                lastName,
                username,
                email,
                phone,
                passwordHash,
                fullName,
                "intermediate",
                "muscle_gain",
                4
            ]
        );

        res.json({ message: "Регистрацията е успешна." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const identifier = String(req.body.identifier || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!identifier || !password) {
            return res.status(400).json({
                error: "Въведи потребителско име/имейл и парола."
            });
        }

        const [users] = await db.query(
            "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(400).json({
                error: "Грешно потребителско име/имейл или парола."
            });
        }

        const user = users[0];

        if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
            return res.status(400).json({
                error: "Грешно потребителско име/имейл или парола."
            });
        }

        res.json({
            message: "Входът е успешен.",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;