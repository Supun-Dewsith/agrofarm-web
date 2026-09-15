# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed.

### Installation
To install the dependencies exactly as locked in the project, run:
```bash
npm ci
```

> ⚠️ **Important for Developers:** 
> Always use `npm ci` instead of `npm install` when syncing your local environment. 
> * **`npm ci`** guarantees everyone uses the exact same package versions and prevents `package-lock.json` merge conflicts.
> * Only use `npm install <package-name>` when you are intentionally adding or updating a specific dependency.


### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.



## Accessing User Authentication Data in Components

In React Router v7 SPA Mode, authentication data (like `username` and `role`) is extracted from `localStorage` using a `clientLoader`. This ensures the data is available immediately when the component mounts, preventing any layout shifts or visual flashing.


```
import { useLoaderData } from "react-router";
import { getAuthData } from "../utils/auth"; 

export function clientLoader() {
  const authData = getAuthData();
  
  return { 
    username: authData?.username ?? "Guest",
    role: authData?.role ?? "User"
  };
}

export default function page() {
  const { username, role } = useLoaderData<typeof clientLoader>();

  return (
    <div>
      <p>User: {username} {role}</p>
    </div>
  );
}
```

Here is a step-by-step execution breakdown of how `fetchWithAuth` processes the request when you call `fetchWithAuth("/api/dashboard/stats")`

```
[ Dashboard Loader Call ]
           │
           ▼
1. URL Resolution ──► Converts '/api/dashboard/stats' to 'http://localhost:8080/api/dashboard/stats'
           │
           ▼
2. Token Injection ──► Reads 'accessToken' from localStorage and sets 'Authorization: Bearer <token>'
           │
           ▼
3. First HTTP Request ──► Sends request to Spring Boot backend
           │
    ┌──────┴──────┐
    ▼             ▼
[ Status 200 ]  [ Status 401 Unauthorized ]
    │             │
    │             ▼
    │       4. Refresh Token Flow ──► Posts 'refreshToken' to '/api/auth/refresh'
    │             │
    │      ┌──────┴──────┐
    │      ▼             ▼
    │   [ Success ]   [ Failure ]
    │      │             │
    │      ▼             ▼
    │   Save new      Clear localStorage
    │   tokens &      & redirect to /login
    │   retry original
    │   request
    │      │

```


##  Git & Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages. This helps maintain a clean git history and automates versioning.

###  Commit Message Structure

Each commit message consists of a **type**, an optional **scope**, and a **description**:

`<type>(<scope>): <short summary>`

#### Examples
- `feat(dashboard): add activity feed component`
- `fix(auth): resolve JWT expiration bug on refresh`
- `docs(readme): update git commit guidelines`
- `refactor(user-service): decouple security principal from database entity`
- `chore(deps): update spring boot to v3.2.0`

---

###  Allowed Types

| Type | Description | Example |
| :--- | :--- | :--- |
| `feat` | A new feature for the user | `feat(charts): add real-time vitality spider chart` |
| `fix` | A bug fix | `fix(api): fix null pointer on missing headers` |
| `docs` | Documentation changes only | `docs(api): add OpenAPI endpoint docs` |
| `style` | Formatting, missing semi-colons, no code change | `style(frontend): run prettier on dashboard components` |
| `refactor` | Code restructuring without fixing a bug or adding a feature | `refactor(auth): simplify custom security filter logic` |
| `perf` | Code changes that improve performance | `perf(db): add index to user email lookup` |
| `test` | Adding missing tests or correcting existing tests | `test(auth): add unit tests for token refresh` |
| `chore` | Build process, auxiliary tools, or dependency updates | `chore(gradle): bump dependency versions` |
| `ci` | Changes to CI configuration files and scripts | `ci(github): add workflow for running backend tests` |

---

### Rules to Follow

1. **Imperative Mood:** Use imperative, present tense in the description (*"add"* not *"added"* or *"adds"*).
2. **Lowercase Scope & Type:** Keep types and scopes in lowercase.
3. **No Period:** Do not end the subject line with a period.
4. **Atomic Commits:** Keep commits small and focused on a single change or fix.
