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
import ImportFromLink from "@/pages/ImportFromLink";
import PDFImport from "@/pages/PDFImport";
import Validation from "@/pages/Validation";

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/new">
          <NewAnalysis />
        </Route>
        <Route path="/import">
          <ImportFromLink />
        </Route>
        <Route path="/pdf-import">
          <PDFImport />
        </Route>
        <Route path="/history">
          <AnalysisHistory />
        </Route>
        <Route path="/ranking">
          <Ranking />
        </Route>
        <Route path="/analysis/:id">
          <AnalysisDetail />
        </Route>
        <Route path="/validation/:id">
          <Validation />
        </Route>
        <Route>
          <NewAnalysis />
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      <Route path="/dashboard" nest>
        <DashboardRouter />
      </Route>
      <Route path="/404">
        <NotFound />
      </Route>
      <Route>
        <NotFound />
      </Route>
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
