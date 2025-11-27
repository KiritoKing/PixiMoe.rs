## 1. Theme Infrastructure Setup
- [x] 1.1 Install `next-themes` package for theme management
- [x] 1.2 Create `src/components/theme-provider.tsx` with ThemeProvider component
- [x] 1.3 Wrap App in ThemeProvider in `src/main.tsx`
- [x] 1.4 Create `src/components/theme-toggle.tsx` with theme toggle button (sun/moon icons)
- [x] 1.5 Verify dark mode toggles correctly between light/dark/system
- [x] 1.6 Verify theme preference persists across application restarts

## 2. Install Required shadcn Components
- [x] 2.1 Add `button` component via `pnpm dlx shadcn@latest add button`
- [x] 2.2 Add `card` component via `pnpm dlx shadcn@latest add card`
- [x] 2.3 Add `input` component via `pnpm dlx shadcn@latest add input`
- [x] 2.4 Add `badge` component via `pnpm dlx shadcn@latest add badge`
- [x] 2.5 Add `dialog` component via `pnpm dlx shadcn@latest add dialog`
- [x] 2.6 Add `popover` component via `pnpm dlx shadcn@latest add popover`
- [x] 2.7 Add `progress` component via `pnpm dlx shadcn@latest add progress`
- [x] 2.8 Add `scroll-area` component via `pnpm dlx shadcn@latest add scroll-area`
- [x] 2.9 Add `skeleton` component via `pnpm dlx shadcn@latest add skeleton`
- [x] 2.10 Add `checkbox` component via `pnpm dlx shadcn@latest add checkbox`
- [x] 2.11 Verify all components are in `src/components/ui/` and importable

## 3. Migrate ImportButton Component
- [x] 3.1 Query shadcn Button API using Context7 MCP
- [x] 3.2 Query shadcn Popover API using Context7 MCP
- [x] 3.3 Query shadcn Progress API using Context7 MCP
- [x] 3.4 Replace button element with shadcn Button (variant="default")
- [x] 3.5 Replace progress stats popover with shadcn Popover
- [x] 3.6 Replace progress indicators with shadcn Progress components
- [x] 3.7 Remove all `dark:` Tailwind classes (use CSS variables instead)
- [x] 3.8 Test ImportButton in both light and dark themes
- [x] 3.9 Verify file picker dialog opens correctly
- [x] 3.10 Verify progress updates display correctly

## 4. Migrate ImageCard Component
- [x] 4.1 Query shadcn Card API using Context7 MCP
- [x] 4.2 Query shadcn Skeleton API using Context7 MCP
- [x] 4.3 Replace container div with Card, CardContent components
- [x] 4.4 Replace loading skeleton with shadcn Skeleton component
- [x] 4.5 Update error state to use CardContent with muted foreground
- [x] 4.6 Remove all `dark:` classes from background and border styles
- [x] 4.7 Test ImageCard loading, success, and error states in both themes
- [x] 4.8 Verify hover effects work correctly
- [x] 4.9 Verify thumbnail images display with proper aspect ratio

## 5. Migrate ImageGrid Component
- [x] 5.1 Query shadcn Skeleton API if not already done
- [x] 5.2 Replace loading placeholder divs with shadcn Skeleton components
- [x] 5.3 Update empty state text colors to use `text-muted-foreground`
- [x] 5.4 Remove `dark:bg-gray-800` and similar hard-coded dark mode classes
- [x] 5.5 Test grid layout in both themes
- [x] 5.6 Verify loading skeletons animate correctly
- [x] 5.7 Verify empty state displays centered with proper typography

## 6. Migrate TagInput Component
- [x] 6.1 Query shadcn Input API using Context7 MCP
- [x] 6.2 Query shadcn Badge API using Context7 MCP
- [x] 6.3 Replace native input with shadcn Input component
- [x] 6.4 Replace tag badge elements with shadcn Badge (variant="secondary")
- [x] 6.5 Update autocomplete dropdown (consider Popover or Combobox)
- [x] 6.6 Remove all `dark:` classes from input and badge styles
- [x] 6.7 Test tag input functionality in both themes
- [x] 6.8 Verify tag badges display correctly with remove functionality
- [x] 6.9 Verify autocomplete suggestions work

## 7. Migrate TagFilterPanel Component
- [x] 7.1 Query shadcn ScrollArea API using Context7 MCP
- [x] 7.2 Query shadcn Badge API if not already done
- [x] 7.3 Query shadcn Checkbox API using Context7 MCP
- [x] 7.4 Replace sidebar scroll container with shadcn ScrollArea
- [x] 7.5 Replace tag count badges with shadcn Badge (variant="outline")
- [x] 7.6 Update section headers to use proper typography (text-sm font-semibold)
- [x] 7.7 Improve checkbox styling or use shadcn Checkbox component
- [x] 7.8 Remove all `dark:border-gray-700` style hard-coded classes
- [x] 7.9 Test tag filtering with multiple selections in both themes
- [x] 7.10 Verify scroll behavior works smoothly
- [x] 7.11 Verify "Clear Filters" button works

## 8. Migrate ImageViewer Component
- [x] 8.1 Query shadcn Dialog API using Context7 MCP
- [x] 8.2 Query shadcn Button API if not already done
- [x] 8.3 Replace modal overlay with shadcn Dialog, DialogContent, DialogHeader
- [x] 8.4 Replace close button with shadcn Button (variant="ghost")
- [x] 8.5 Update dialog layout to follow shadcn Dialog patterns
- [x] 8.6 Remove all `dark:` classes from dialog content
- [x] 8.7 Test image viewer modal in both themes
- [x] 8.8 Verify dialog opens/closes correctly
- [x] 8.9 Verify image displays at proper size
- [x] 8.10 Verify tag editing UI works within dialog

## 9. Update Main Application Layout
- [x] 9.1 Add ThemeToggle button to top toolbar in App.tsx
- [x] 9.2 Remove any remaining hard-coded `dark:bg-gray-950` classes
- [x] 9.3 Ensure top toolbar uses `border-border` for consistent borders
- [x] 9.4 Test full application layout in light mode
- [x] 9.5 Test full application layout in dark mode
- [x] 9.6 Test system theme preference detection and switching
- [x] 9.7 Verify all sections (toolbar, sidebar, grid) adapt to theme

## 10. Update AGENTS.md with shadcn Workflow
- [x] 10.1 Add new section "## shadcn/ui Component Usage Workflow"
- [x] 10.2 Document step 1: Use shadcn MCP to search for component
- [x] 10.3 Document step 2: Use Context7 MCP to query component API
- [x] 10.4 Document step 3: Add component via CLI if not installed
- [x] 10.5 Document step 4: Import and use according to API patterns
- [x] 10.6 Add example workflow for Button component
- [x] 10.7 Clarify this applies to ALL shadcn component usage
- [x] 10.8 Review AGENTS.md changes for clarity

## 11. Testing and Validation
- [x] 11.1 Run `pnpm dev` and verify application starts without errors
- [ ] 11.2 Test theme toggle cycles through light → dark → system
- [ ] 11.3 Test all components render correctly in light theme
- [ ] 11.4 Test all components render correctly in dark theme
- [ ] 11.5 Test file import flow with new components
- [ ] 11.6 Test tag filtering with migrated components
- [ ] 11.7 Test image viewer modal with new Dialog component
- [ ] 11.8 Verify no console errors or warnings
- [ ] 11.9 Verify theme preference persists after restart
- [x] 11.10 Run `openspec validate modernize-ui-with-shadcn --strict`

## 12. Documentation and Cleanup
- [x] 12.1 Remove any unused component files from before migration
- [x] 12.2 Update component README if needed
- [x] 12.3 Verify all TypeScript types are correct
- [ ] 12.4 Run `pnpm build` to ensure production build succeeds
- [ ] 12.5 Check bundle size hasn't increased significantly
- [ ] 12.6 Document any breaking changes for future reference
