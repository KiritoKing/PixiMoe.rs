import { Database, Settings, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CategoryManager } from "../categories/CategoryManager";
import { TagManager } from "../tags/TagManager";
// Import settings pages
import { AISettingsPage } from "./AISettingsPage";
import { DatabaseSettingsPage } from "./DatabaseSettingsPage";

// Settings pages configuration
const SETTINGS_PAGES = [
	{
		id: "account",
		name: "Account",
		icon: Settings,
		component: null, // TODO: Implement AccountSettingsPage
	},
	{
		id: "ai",
		name: "AI Settings",
		icon: Settings,
		component: AISettingsPage,
	},
	{
		id: "categories",
		name: "Categories",
		icon: Settings,
		component: CategoryManager,
	},
	{
		id: "tags",
		name: "Tags",
		icon: Settings,
		component: TagManager,
	},
	{
		id: "database",
		name: "Database",
		icon: Database,
		component: DatabaseSettingsPage,
	},
	{
		id: "notifications",
		name: "Notifications",
		icon: Settings,
		component: null, // TODO: Implement NotificationsSettingsPage
	},
	{
		id: "connections",
		name: "Connections",
		icon: Settings,
		component: null, // TODO: Implement ConnectionsSettingsPage
	},
	{
		id: "offline",
		name: "Offline",
		icon: Settings,
		component: null, // TODO: Implement OfflineSettingsPage
	},
] as const;

type SettingsPageId = (typeof SETTINGS_PAGES)[number]["id"];

interface SettingsPanelProps {
	children?: React.ReactNode;
}

export function SettingsPanel({ children }: SettingsPanelProps) {
	const [open, setOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState<SettingsPageId>("ai");

	const renderCurrentPage = () => {
		const page = SETTINGS_PAGES.find((p) => p.id === currentPage);
		if (!page || !page.component) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-center p-8">
					<Settings className="w-16 h-16 text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
					<p className="text-muted-foreground">
						{page?.name || "Unknown"} settings are not yet implemented.
					</p>
				</div>
			);
		}

		const Component = page.component;
		return <Component />;
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				{children || (
					<Button variant="outline" size="icon">
						<Settings className="h-4 w-4" />
						<span className="sr-only">Open settings</span>
					</Button>
				)}
			</SheetTrigger>
			<SheetContent
				className="settings-sheet-content w-[800px] sm:max-w-[800px] p-0 overflow-hidden"
				side="right"
				hideCloseButton
			>
				<div className="flex h-full">
					{/* Left sidebar - Navigation */}
					<div className="w-64 border-r bg-background">
						<SheetHeader className="p-6 border-b">
							<SheetTitle>Settings</SheetTitle>
						</SheetHeader>

						<ScrollArea className="flex-1 p-4">
							<nav className="space-y-2">
								{SETTINGS_PAGES.map((page) => {
									const Icon = page.icon;
									const isActive = currentPage === page.id;

									return (
										<button
											key={page.id}
											type="button"
											onClick={() => setCurrentPage(page.id)}
											className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
												isActive
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:text-foreground hover:bg-muted"
											}`}
										>
											<Icon className="h-4 w-4" />
											{page.name}
										</button>
									);
								})}
							</nav>
						</ScrollArea>
					</div>

					{/* Right content area */}
					<div className="flex-1 flex flex-col">
						<SheetHeader className="p-6 border-b">
							<div className="flex items-center justify-between">
								<SheetTitle>
									{SETTINGS_PAGES.find((p) => p.id === currentPage)?.name ||
										"Settings"}
								</SheetTitle>
								<Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
									<X className="h-4 w-4" />
									<span className="sr-only">Close settings</span>
								</Button>
							</div>
						</SheetHeader>

						<ScrollArea className="flex-1 p-6">{renderCurrentPage()}</ScrollArea>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
