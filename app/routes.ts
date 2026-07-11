import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx",{id:"login-explicit"}),
  route("register", "routes/register.tsx"),
] satisfies RouteConfig;