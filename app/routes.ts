// app/routes.ts
import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("auth/login.tsx"),
  route("login", "auth/login.tsx", { id: "login-explicit" }),
  
  route("register", "auth/register.tsx"),

  route("home", "layout.tsx", [
    index("routes/home.tsx"), 
    
    route("farmers", "routes/farmers.tsx"),
    route("crops", "routes/crops.tsx"), 
    route("cropInsert", "routes/cropInsert.tsx"),
    route("attendance", "routes/attendance.tsx"),
    route("weather", "routes/weather.tsx"),
    route("tasks", "routes/tasks.tsx"),
    
    route("disease-detection", "routes/disease-detection.tsx"),
    route("inventory", "routes/inventory.tsx"),
    route("harvest", "routes/harvest.tsx"),
    route("reports", "routes/reports.tsx"),
    route("settings", "routes/settings.tsx"),
    
    route("dashboard", "routes/dashboard.tsx"),
  ]),
] satisfies RouteConfig;