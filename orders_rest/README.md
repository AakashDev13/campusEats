# CampusEats Orders REST Service — JavaScript

This is the JavaScript/Express conversion of the original Python Orders service.

## Requirements

- Node.js 18+ (Node.js 20+ recommended)
- npm

## Install

```bash
npm install
```

## Run a local mock Payments service

Terminal 1:

```bash
npm run mock-payment
```

## Run Orders

Terminal 2:

```bash
PAYMENTS_URL=http://127.0.0.1:9000 npm start
```

The API listens on:

```text
http://127.0.0.1:8000
```

## Test

```bash
npm test
```

## Assignment 5

See:

- `openapi.yaml`
- `NOTES.md`
- `curl-transcript.txt`

The service implements the HTTP methods, headers, ETag conditional requests, idempotency, CORS, rate limiting, authorization header handling, method override, and status codes required by Assignment 5.
