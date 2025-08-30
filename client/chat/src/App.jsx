import React from "react";
import Login from "./components/Login";
import { Route, Routes } from "react-router-dom";
import MessengerUI from "./components/MessengerUI";
import Register from "./components/Register";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<MessengerUI />} />
      </Routes>
    </>
  );
};

export default App;
