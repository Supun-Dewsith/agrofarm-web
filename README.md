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

### Installation

Install the dependencies:

```bash
npm install
```

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