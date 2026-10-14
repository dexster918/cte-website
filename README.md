# CTE 2018 — Technology & Engineering Club Website

Official website of the **Technology & Engineering Club (CTE)**, University of Tipaza, Algeria.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `inventions.html` | Inventions (dynamic cards + full-screen modal) |
| `team.html` | Team members |
| `contact.html` | Contact |
| `join.html` | Join Us (registration form) |
| `admin.html` | Admin panel (password protected) |

## Features

- Multi-language (**EN / FR / AR**) with RTL support for Arabic
- Content managed from the admin panel, stored in `content.json`
  locally and in **MongoDB** when deployed
- Registration form delivered by email via **Web3Forms**
- Node / Express backend (`server.js`)

## Run locally

```bash
npm install
node server.js
```

- Website: <http://localhost:3000>
- Admin panel: <http://localhost:3000/admin.html>

## Deployment

See **[DEPLOY.md](DEPLOY.md)**.

## Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (persistent storage) |
| `ADMIN_PASSWORD` | Password required to save changes from the admin panel |
