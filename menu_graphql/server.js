// server.js - Apollo Server (GraphQL) over MySQL + static front-end.
const fs = require("fs");
const path = require("path");
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");
const db = require("./db");

// The schema lives in its own file (schema.graphql).
const typeDefs = fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8");

// MySQL stores BOOLEAN as TINYINT(1), so convert 0/1 to false/true for GraphQL.
const toDish = (row) => ({ ...row, available: Boolean(row.available) });

// Resolvers: each one only runs SQL (plain CRUD, no business logic).
const resolvers = {
  Query: {
    // query { dishes { ... } }
    dishes: async () => {
      const [rows] = await db.query(
        "SELECT id, name, price, available FROM dishes ORDER BY id"
      );
      return rows.map(toDish);
    },

    // query { dish(id: 2) { ... } }  ->  the id argument becomes the WHERE clause
    dish: async (_parent, { id }) => {
      const [rows] = await db.query(
        "SELECT id, name, price, available FROM dishes WHERE id = ?",
        [id]
      );
      return rows.length ? toDish(rows[0]) : null;
    }
  },

  Mutation: {
    // mutation { addDish(input: {...}) { ... } }  ->  INSERT, then read the row back
    addDish: async (_parent, { input }) => {
      const { name, price, available = true } = input;
      const [result] = await db.query(
        "INSERT INTO dishes (name, price, available) VALUES (?, ?, ?)",
        [name, price, available]
      );
      const [rows] = await db.query(
        "SELECT id, name, price, available FROM dishes WHERE id = ?",
        [result.insertId]
      );
      return toDish(rows[0]);
    }
  }
};

async function start() {
  const apollo = new ApolloServer({ typeDefs, resolvers, includeStacktraceInErrorResponses: false });
  await apollo.start();

  const app = express();
  app.use(express.static(path.join(__dirname, "public"))); // the HTML/CSS page
  app.use("/graphql", express.json(), expressMiddleware(apollo));

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`Page:    http://localhost:${port}/`);
    console.log(`GraphQL: http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
