import UserService from "@/services/user";
import { authenticationGuard } from "../auth/authenticationGuard";

export default [
  {
    path: "/",
    component: () => import("layouts/home"),
    meta: { breadcrumb: "Home" },
    children: [
      { path: "", redirect: "audits" },
      {
        path: "audits",
        beforeEnter: authenticationGuard,
        component: () => import("pages/audits"),
        meta: { breadcrumb: "Audits" },
        children: [
          {
            path: "",
            name: "audits",
            component: () => import("pages/audits/list"),
          },
          {
            path: ":auditId",
            component: () => import("pages/audits/edit"),
            meta: { breadcrumb: "Edit Audit" },
            children: [
              { path: "", redirect: "general" },
              {
                path: "general",
                component: () => import("pages/audits/edit/general"),
              },
              {
                path: "network",
                component: () => import("pages/audits/edit/network"),
              },
              {
                path: "findings/add",
                component: () => import("pages/audits/edit/findings/add"),
              },
              {
                path: "findings/:findingId",
                component: () => import("pages/audits/edit/findings/edit"),
              },
              {
                path: "sections/:sectionId",
                component: () => import("pages/audits/edit/sections"),
              },
            ],
          },
        ],
      },
      {
        path: "datas",
        beforeEnter: authenticationGuard,
        component: () => import("pages/datas"),
        meta: { breadcrumb: "Datas" },
        children: [
          { path: "", redirect: "collaborators" },
          {
            path: "collaborators",
            component: () => import("pages/datas/collaborators"),
          },
          {
            path: "companies",
            component: () => import("pages/datas/companies"),
          },
          { path: "clients", component: () => import("pages/datas/clients") },
          {
            path: "templates",
            component: () => import("pages/datas/templates"),
          },
          { path: "dump", component: () => import("pages/datas/dump") },
          { path: "custom", component: () => import("pages/datas/custom") },
        ],
      },
      {
        path: "vulnerabilities",
        beforeEnter: authenticationGuard,
        component: () => import("pages/vulnerabilities"),
        meta: { breadcrumb: "Vulnerabilities" },
      },
      {
        path: "profile",
        beforeEnter: authenticationGuard,
        component: () => import("pages/profile"),
      },
      { path: "403", name: "403", component: () => import("pages/403") },
      { path: "404", name: "404", component: () => import("pages/404") },
    ],
  },
  { path: "*", beforeEnter: authenticationGuard, redirect: "/" },
];
