import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import routes, { renderRoutes } from "./routes";
import "tailwindcss/tailwind.css";

const App = () => {
  return (
    <>
      <Router>
        <div className="app">{renderRoutes(routes)}</div>
      </Router>
    </>
  );
};

export default App;
