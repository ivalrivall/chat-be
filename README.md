# Chat Backend (NestJS)

Backend API service built with NestJS, TypeScript, TypeORM, and PostgreSQL.

## Getting Started

### Requirements
- Node.js `>=22`
- Yarn `1.x`
- PostgreSQL

### Install dependencies
```bash
yarn install
```

### Run in development
```bash
yarn start:dev
```

### Useful scripts
- `yarn lint`
- `yarn test`
- `yarn migration:run`

## API Notes

### `GET /users`

`GET /users` supports pagination and search.

#### Query parameters
- `page` (optional, number, default: `1`)
- `take` (optional, number, default: `10`, max: `50`)
- `order` (optional, `ASC | DESC`, default: `ASC`)
- `search` (optional, string, preferred search parameter)
- `q` (optional, string, fallback search parameter)

If both `search` and `q` are provided, `search` is prioritized.

Current search behavior for users filters by `email` with case-insensitive matching.

#### Example
```http
GET /users?page=1&take=10&order=DESC&search=gmail.com
```
