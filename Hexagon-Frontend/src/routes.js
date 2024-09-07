import React, { Suspense, Fragment, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoadingScreen from "./Components/LoadingScreen/LoadingScreen";
import Dashboard from "./Components/Dashboard/Dashboard";
import Spanish from "./Components/Spanish/Spanish";
import French from "./Components/French/French";
//const Dashboard = lazy(() => import("./Components/Dashboard/Dashboard"));

export const renderRoutes = (routes = []) => (
    <Suspense fallback={<LoadingScreen />}>
        <Routes>
            {routes.map((route, i) => {
                //const Guard = route.guard || Fragment;
                const Component = route.component;

                return (
                    <Route
                        key={i}
                        path={route.path}
                        exact={route.exact}
                        element={<Component/>}
                    />
                );
            })}
        </Routes>
    </Suspense>
);

const routes = [
    {
        path: "/",
        exact: true,
        component: Dashboard,
    },
    {
        path: "/es",
        exact: true,
        component: Spanish,
    },
    {
        path: "/fr",
        exact: true,
        component: French,
    },
];

export default routes;