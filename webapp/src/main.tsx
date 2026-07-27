import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css";

const PayDashboard = lazy(() => import("./pages/PayDashboard"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));

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
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard/*" element={<LazyLoad><PayDashboard /></LazyLoad>} />
        <Route path="/checkout" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
        <Route path="/checkout/*" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
        <Route path="/checkout-pro" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
        <Route path="/checkout-pro/*" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
        <Route path="/checkout/:slug" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
        <Route path="/checkout/products/:slug" element={<LazyLoad><CheckoutPage /></LazyLoad>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
