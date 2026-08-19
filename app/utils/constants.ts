import {
  UserPlus,
  LayoutDashboard,
  Users,
  Sprout,
  ClipboardList,
  CloudSun,
  CheckSquare,
  ScanFace,
  Boxes,
  Wheat,
  FileText,
  Settings,
  LandPlot,
} from "lucide-react";

export const menuItems = [
  {
    icon: UserPlus,
    label: "Register",
    path: "/home/register-users",
    permission: "CAN_REGISTER_USERS",
  },

  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/home/dashboard",
    permission: "VIEW_DASHBOARD",
  },

  {
    icon: LandPlot,
    label: "Farm Management",
    path: "/home/farm-management",
    permission: "VIEW_FARM_MANAGEMENT",
  },

  {
    icon: Users,
    label: "Farmers",
    path: "/home/farmers",
    permission: "VIEW_FARMERS",
  },

  {
    icon: Sprout,
    label: "Crops",
    path: "/home/crops",
    permission: "VIEW_CROPS",
  },

  {
    icon: ClipboardList,
    label: "Attendance",
    path: "/home/attendance",
    permission: "VIEW_ATTENDANCE",
  },

  {
    icon: CloudSun,
    label: "Weather",
    path: "/home/weather",
    permission: "VIEW_WEATHER",
  },

  {
    icon: CheckSquare,
    label: "Tasks",
    path: "/home/tasks",
    permission: "VIEW_TASKS",
  },

  {
    icon: ScanFace,
    label: "Disease detection",
    path: "/home/disease-detection",
    permission: "VIEW_DISEASE_DETECTION",
  },

  {
    icon: Boxes,
    label: "Inventory",
    path: "/home/inventory",
    permission: "VIEW_INVENTORY",
  },

  {
    icon: Wheat,
    label: "Harvest",
    path: "/home/harvest",
    permission: "VIEW_HARVEST",
  },

  {
    icon: FileText,
    label: "Reports",
    path: "/home/reports",
    permission: "VIEW_REPORTS",
  },

  {
    icon: Settings,
    label: "Settings",
    path: "/home/settings",
    permission: "VIEW_SETTINGS",
  },
];

export const AVAILABLE_PERMISSIONS = menuItems.map(
  (item) => item.permission
);