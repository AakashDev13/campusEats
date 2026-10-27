# CampusEats Menu Service - GraphQL (CS543 Assignment 7)

**Run it:** `cd menu_graphql && npm install && mysql -u root -p < schema.sql && DB_USER=root DB_PASSWORD=<your-mysql-password> npm start` - then open <http://localhost:4000>.

## Team

| Roll No. | Name |
|---|---|
| 20252651001 | Aakash (Leader) |
| 20252651044 | Sahil Kumar |
| 20252651056 | Sonu Jha |
| 20252651062 | Vedansh Raghuwanshi |
| 20252651050 | Shanu Singh |

## Files

| File | Purpose |
|---|---|
| `schema.graphql` | `Dish` type, `AddDishInput`, `Query`, `Mutation` |
| `schema.sql` | `dishes` table + 4 seed rows |
| `db.js` | `mysql2` connection pool |
| `server.js` | Apollo Server + resolvers (SQL only) + serves `public/` |
| `public/index.html` | Plain HTML/CSS page: `fetch()` lists dishes, one button fires the mutation |
| `screenshots/` | `before.png` / `after.png` of the mutation |

## Answers

**1. Which CampusEats service did you pick?**
The **Menu / Catalogue** service. A `Dish` (id, name, price, available) is a trimmed-down version of the `food_items` table owned by the Catalogue service in `campusEats_shema/schema.sql`.

**2. Name one field a client can skip and one it cannot (why we use the `!` sign).**
- **Can skip:** `available` in `AddDishInput` (declared `Boolean`, no `!`). The client may leave it out and the resolver stores `TRUE`. Likewise, on the read side a client can skip any field it does not select, e.g. `query { dishes { name } }`.
- **Cannot skip:** `name` (`String!`) and `price` (`Float!`) in `AddDishInput`. If they are missing, Apollo rejects the request before any resolver runs (`Field "AddDishInput.price" of required type "Float!" was not provided`).
- **Why `!`:** it is a contract in the schema. The server guarantees a non-null value on output (a `Dish` always has an `id`, `name`, `price`, `available`), and requires one on input, so a dish can never be stored or returned without a name or price.

**3. Map it to SQL: which part of the query became the WHERE, and which resolver ran the INSERT?**
- `query { dish(id: 2) { id name price } }` - the `id: 2` argument becomes `WHERE id = ?` in the `Query.dish` resolver: `SELECT id, name, price, available FROM dishes WHERE id = ?`.
- `query { dishes { ... } }` - the `Query.dishes` resolver runs `SELECT ... FROM dishes ORDER BY id` (no WHERE, because it lists everything).
- `mutation { addDish(input: {...}) { ... } }` - the **`Mutation.addDish` resolver** in `server.js` runs `INSERT INTO dishes (name, price, available) VALUES (?, ?, ?)`, then `SELECT`s the new row by `insertId` so the client gets back the fields it asked for.

## Try it in the GraphQL endpoint

```graphql
query { dishes { id name price available } }

mutation {
  addDish(input: { name: "Paneer Roll", price: 90 }) { id name price }
}
```

## Configuration (environment variables, all optional)

`DB_HOST` (localhost) - `DB_PORT` (3306) - `DB_USER` (root) - `DB_PASSWORD` (empty) - `DB_NAME` (campuseats_menu) - `PORT` (4000)

To reset the demo data, re-run `mysql -u root -p < schema.sql`.
