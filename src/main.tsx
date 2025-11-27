import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/theme-provider";
import { createTauriPersister } from "./lib/persister";
import { queryClient } from "./lib/query-client";

const persister = createTauriPersister();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
				<App />
			</PersistQueryClientProvider>
		</ThemeProvider>
	</React.StrictMode>
);
