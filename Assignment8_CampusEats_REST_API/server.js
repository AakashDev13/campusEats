
const express = require("express");
const app = express();

const port = 3000;

app.use(express.json());
app.use(express.static("public"));

// Initial menu data
let items = [
    { id: 1, name: "Veg Thali", price: 90, available: true },
    { id: 2, name: "Paneer Roll", price: 70, available: true },
    { id: 3, name: "Masala Dosa", price: 60, available: true },
    { id: 4, name: "Cold Coffee", price: 50, available: true }
];

let nextId = 5;

// GET /items - Retrieve all menu items
app.get("/items", (req, res) => {
    res.status(200).json(items);
});

// GET /items/:id - Retrieve one menu item
app.get("/items/:id", (req, res) => {
    const id = Number(req.params.id);

    const item = items.find((item) => item.id === id);

    if (!item) {
        return res.status(404).json({ error: "Item not found" });
    }

    res.status(200).json(item);
});

// POST /items - Add a new menu item
app.post("/items", (req, res) => {
    const { name, price, available } = req.body;

    if (!name || !name.trim()) {
        return res.status(422).json({ error: "name required" });
    }

    if (price === undefined || price === "" || !Number.isFinite(Number(price)) || Number(price) < 0) {
        return res.status(422).json({ error: "valid price required" });
    }

    const newItem = {
        id: nextId++,
        name: name.trim(),
        price: Number(price),
        available: available === undefined ? true : Boolean(available)
    };

    items.push(newItem);

    res.status(201).json(newItem);
});

// Start server
app.listen(port, () => {
    console.log(`CampusEats server running at http://localhost:${port}`);
});
