import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { SiteLayout } from "./SiteLayout";
import { ArenaApp } from "./arena/ArenaApp";
import "./styles.css";
import "./site.css";
import "./arena/arena.css";

const router = createHashRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: "/", element: <App /> },
      { path: "/arena/*", element: <ArenaApp /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
