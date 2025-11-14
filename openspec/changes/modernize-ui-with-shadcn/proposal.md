# Change: Modernize UI with shadcn/ui and Theme Support

## Why
The current UI implementation uses ad-hoc component styles with inconsistent dark mode support (manually applied dark: classes). This leads to:
- Inconsistent visual language across the application
- No system-level dark mode detection or toggle
- Maintenance burden as Tailwind dark mode classes are scattered throughout components
- Lack of modern, accessible component patterns

shadcn/ui has been initialized with the new-york style and neutral base color, providing a foundation for consistent, accessible components with proper theme support.

## What Changes
- **BREAKING**: Replace all custom UI components (buttons, inputs, cards, dialogs) with shadcn/ui equivalents
- Add system dark mode detection and manual theme toggle with persistent preference
- Migrate all existing components to use shadcn/ui primitives instead of inline Tailwind classes
- Establish development guidelines requiring shadcn MCP and Context7 lookups before using components
- Update `AGENTS.md` to document shadcn + Context7 usage pattern

## Impact
- Affected specs: `ui-framework` (MODIFIED: Component Library, Theme Management)
- Affected code:
  - `src/components/import/ImportButton.tsx` - migrate to shadcn Button, Popover, Progress
  - `src/components/gallery/ImageCard.tsx` - migrate to shadcn Card
  - `src/components/gallery/ImageGrid.tsx` - migrate to shadcn Skeleton
  - `src/components/tags/TagInput.tsx` - migrate to shadcn Input, Badge
  - `src/components/tags/TagFilterPanel.tsx` - migrate to shadcn ScrollArea, Badge
  - `src/components/gallery/ImageViewer.tsx` - migrate to shadcn Dialog
  - `src/App.tsx` - add ThemeProvider wrapper
  - `AGENTS.md` - add shadcn/Context7 usage guidelines
