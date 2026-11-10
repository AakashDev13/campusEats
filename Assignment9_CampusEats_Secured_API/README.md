# CampusEats – Secured REST API

**Course:** CS543 – Web Services  
**Assignment:** 9 – Securing CampusEats API  
**Technology:** Node.js, Express.js, JWT, bcryptjs

## 1. Project Overview

CampusEats is a REST API that manages a campus food menu. In this assignment, the existing CampusEats API is secured using password hashing, JSON Web Tokens (JWT), and role-based authorization.

The application supports two types of users:

- **Customer:** Can log in and view menu items.
- **Restaurant:** Can log in, view menu items, and add new menu items.

Only authenticated users can access protected routes. Only users with the restaurant or admin role can add menu items.

## 2. Technologies Used

- Node.js
- Express.js
- JSON Web Token (jsonwebtoken)
- bcryptjs
- dotenv
- HTML
- CSS
- JavaScript

## 3. Project Structure

```text
Assignment9_CampusEats_Secured_API/
│
├── server.js
├── package.json
├── package-lock.json
├── .env
├── .env.example
├── .gitignore
│
└── public/
    ├── index.html
    └── style.css
```

## 4. Installation and Setup

**Step 1: Clone the repository**

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

**Step 2: Open the project directory**

```bash
cd Assignment9_CampusEats_Secured_API
```

**Step 3: Install dependencies**

```bash
npm install
```

**Step 4: Configure environment variables**

Create a `.env` file in the project root:

```env
JWT_SECRET=your_secure_secret_key
```

The `.env` file is excluded from Git using `.gitignore`. The `.env.example` file is provided as a template.

**Step 5: Start the server**

```bash
node server.js
```

The server runs at:

```text
http://localhost:3000
```

Open the application in your browser to use the frontend.

## 5. Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Customer | student@campus.edu | student123 |
| Restaurant | restaurant@campus.edu | resto123 |

Passwords are hashed using bcryptjs before being stored in the demo user data.

## 6. API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Authenticate user and generate JWT |
| GET | `/items` | Authenticated | Get all menu items |
| GET | `/items/:id` | Authenticated | Get a menu item by ID |
| POST | `/items` | Restaurant/Admin | Add a new menu item |

### Example: Login

**Request:**

```http
POST /login
Content-Type: application/json
```

```json
{
  "email": "student@campus.edu",
  "password": "student123"
}
```

**Response:** HTTP 200 OK

The response contains a JWT token and basic user information.

### Example: Get All Items

```http
GET /items
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** HTTP 200 OK

Returns the available menu items.

### Example: Add a Menu Item

```http
POST /items
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Cheese Burger",
  "price": 120,
  "available": true
}
```

**Response:** HTTP 201 Created

```json
{
  "id": 5,
  "name": "Cheese Burger",
  "price": 120,
  "available": true
}
```

## 7. Security Implementation

### 1. Password Hashing

The bcryptjs library is used to hash passwords. During login, the entered password is compared with the stored hash using `bcrypt.compareSync()`.

### 2. JWT Authentication

After successful login, the server generates a JWT using `jsonwebtoken`.

The token expires after one hour.

### 3. Authentication Middleware

The `auth` middleware checks the Authorization header and verifies the JWT using the secret key.

- Missing token: HTTP 401 Unauthorized
- Invalid token: HTTP 401 Unauthorized
- Expired token: HTTP 401 Unauthorized

### 4. Role-Based Authorization

The `requireRole()` middleware checks the user's role before allowing access to restricted routes.

- Customer: Can view menu items.
- Restaurant: Can view and add menu items.
- Admin: Can view and add menu items, if an admin account is configured
