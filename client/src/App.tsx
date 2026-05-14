import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import NewAnalysis from "./pages/NewAnalysis";
import AnalysisHistory from "./pages/AnalysisHistory";
import Ranking from "./pages/Ranking";
import AnalysisDetail from "./pages/AnalysisDetail";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Switch>
              <Route path={"/dashboard/new"} component={NewAnalysis} />
              <Route path={"/dashboard/history"} component={AnalysisHistory} />
              <Route path={"/dashboard/ranking"} component={Ranking} />
              <Route path={"/dashboard/analysis/:id"} component={AnalysisDetail} />
              <Route component={NewAnalysis} />
            </Switch>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
