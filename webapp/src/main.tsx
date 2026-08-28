import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import CheckoutPage from "./pages/CheckoutPage";
import "./index.css";

const PayDashboard = lazy(() => import("./pages/PayDashboard"));

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
      <Route path="/" element={<App />} />
      <Route path="/dashboard/*" element={<LazyLoad><PayDashboard /></LazyLoad>} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/*" element={<CheckoutPage />} />
      <Route path="/checkout-pro" element={<CheckoutPage />} />
      <Route path="/checkout-pro/*" element={<CheckoutPage />} />
      <Route path="/checkout/:slug" element={<CheckoutPage />} />
      <Route path="/checkout/products/:slug" element={<CheckoutPage />} />
    </Routes>
  </BrowserRouter>
);
