import React from "react";
import Login from "./components/Login";
import { Route, Routes } from "react-router-dom";
import MessengerUI from "./components/MessengerUI";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Route */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <MessengerUI />
            </ProtectedRoute>
          }
        />
      </Routes>
      {/* ✅ Ye zaroor add karo */}
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: "#4ade80",
              color: "#fff",
            },
          },
          error: {
            style: {
              background: "#f87171",
              color: "#fff",
            },
          },
        }}
      />
    </>
  );
};

export default App;
