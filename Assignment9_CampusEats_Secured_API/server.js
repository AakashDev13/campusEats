
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    throw new Error("JWT_SECRET is missing. Check your .env file.");
}

// Demo users with bcrypt hashed passwords
const users = [
    {
        id: 1,
        email: "student@campus.edu",
        role: "customer",
        hash: bcrypt.hashSync("student123", 10)
    },
    {
        id: 2,
        email: "restaurant@campus.edu",
        role: "restaurant",
        hash: bcrypt.hashSync("resto123", 10)
    }
];

// Initial menu data
let items = [
    { id: 1, name: "Veg Thali", price: 90, available: true },
    { id: 2, name: "Paneer Roll", price: 70, available: true },
    { id: 3, name: "Masala Dosa", price: 60, available: true },
    { id: 4, name: "Cold Coffee", price: 50, available: true }
];

let nextId = 5;

// POST /login - Authenticate user and generate JWT
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const user = users.find((u) => u.email === email);

    if (
        !user ||
        typeof password !== "string" ||
        !bcrypt.compareSync(password, user.hash)
    ) {
        return res.status(401).json({ error: "bad login" });
    }

    const token = jwt.sign(
        { sub: user.id, role: user.role },
        SECRET,
        { expiresIn: "1h" }
    );

    res.status(200).json({
        message: "Login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    });
});

// Authentication middleware
function auth(req, res, next) {
    const header = req.get("Authorization") || "";
    const parts = header.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            error: "invalid or missing token"
        });
    }

    try {
        req.user = jwt.verify(parts[1], SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            error: "invalid or missing token"
        });
    }
}

// Authorization middleware
function requireRole(...allowed) {
    return (req, res, next) => {
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({
                error: "forbidden"
            });
        }

        next();
    };
}

// GET /items - Any authenticated user can view all items
app.get("/items", auth, (req, res) => {
    res.status(200).json(items);
});

// GET /items/:id - Any authenticated user can view one item
app.get("/items/:id", auth, (req, res) => {
    const id = Number(req.params.id);

    const item = items.find((item) => item.id === id);

    if (!item) {
        return res.status(404).json({
            error: "Item not found"
        });
    }

    res.status(200).json(item);
});

// POST /items - Only restaurant or admin can add items
app.post(
    "/items",
    auth,
    requireRole("restaurant", "admin"),
    (req, res) => {
        const { name, price, available } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(422).json({
                error: "name required"
            });
        }

        if (
            price === undefined ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {
            return res.status(422).json({
                error: "valid price required"
            });
        }

        const newItem = {
            id: nextId++,
            name: name.trim(),
            price: Number(price),
            available: available === undefined
                ? true
                : Boolean(available)
        };

        items.push(newItem);

        res.status(201).json(newItem);
    }
);

// Start server
app.listen(port, () => {
    console.log(
        `Secured CampusEats API running at http://localhost:${port}`
    );
});
