import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css";

const PayDashboard = lazy(() => import("./pages/PayDashboard"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const adminHost = window.location.hostname === "admin.pay.axionenterprise.cloud";

const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="min-h-screen bg-[#040407] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#e8b923] border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    {children}
  </Suspense>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {adminHost && <Route path="*" element={<LazyLoad><AdminDashboard /></LazyLoad>} />}
      {!adminHost && <>
      <Route path="/" element={<App />} />
      <Route path="/dashboard/*" element={<LazyLoad><PayDashboard /></LazyLoad>} />
      <Route path="/docs" element={<LazyLoad><ApiDocs /></LazyLoad>} />
      <Route path="/admin/*" element={<LazyLoad><AdminDashboard /></LazyLoad>} />
      <Route path="/checkout/*" element={<App />} />
      </>}
    </Routes>
  </BrowserRouter>
);
