import { FC, ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import { useCore } from "@/hooks/useCore";
import { DefaultLayout } from "@/layouts/Default";
import { AppPage } from "@/pages/App";
import { AutomationsPage } from "@/pages/Automations";
import { BillingPage } from "@/pages/Billing";
import { FaqPage } from "@/pages/FAQ";
import { FeeTransactionsPage } from "@/pages/FeeTransactions";
import { InternalErrorPage } from "@/pages/InternalError";
import { MainPage } from "@/pages/Main";
import { MyAppsPage } from "@/pages/MyApps";
import { NotFoundPage } from "@/pages/NotFound";
import { TransactionsPage } from "@/pages/Transactions";
import { routeTree } from "@/utils/routes";

const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { vault } = useCore();

  return !vault ? <Navigate to={routeTree.root.path} replace /> : children;
};

export const Routes = () => {
  const router = createBrowserRouter([
    {
      path: routeTree.root.path,
      element: <DefaultLayout />,
      children: [
        { index: true, element: <MainPage /> },
        { path: routeTree.app.path, element: <AppPage /> },
        {
          path: routeTree.automations.path,
          element: (
            <ProtectedRoute>
              <AutomationsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: routeTree.billing.path,
          element: (
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          ),
        },
        {
          path: routeTree.feeTransactions.path,
          element: (
            <ProtectedRoute>
              <FeeTransactionsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: routeTree.myApps.path,
          element: (
            <ProtectedRoute>
              <MyAppsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: routeTree.transactions.path,
          element: (
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          ),
        },
        { path: routeTree.faq.path, element: <FaqPage /> },
      ],
      errorElement: <InternalErrorPage />,
    },
    { path: routeTree.notFound.path, element: <NotFoundPage /> },
  ]);

  return <RouterProvider router={router} />;
};
