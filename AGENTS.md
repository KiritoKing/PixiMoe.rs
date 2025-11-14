<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## shadcn/ui Component Usage Workflow

This project uses [shadcn/ui](https://ui.shadcn.com/) for UI components. **ALL developers and AI assistants MUST follow this workflow** when using shadcn components:

### Required Steps (Before Using Any shadcn Component)

1. **Search with shadcn MCP**: Use the shadcn MCP server to search for the component
   - Example: Search for "button", "card", "dialog", etc.
   - Identify the exact component name and registry

2. **Query API with Context7 MCP**: Use the Context7 MCP server to fetch up-to-date API documentation
   - Example query: "shadcn/ui Button API"
   - Review props, variants, and usage patterns
   - Check for related components (e.g., DialogTrigger, DialogContent)

3. **Install Component**: Add the component via CLI if not already installed
   ```bash
   pnpm dlx shadcn@latest add <component-name>
   ```

4. **Import and Use**: Follow the documented API patterns from Context7
   ```typescript
   import { Button } from "@/components/ui/button"
   
   <Button variant="default" size="lg">Click me</Button>
   ```

### Example Workflow: Using Button Component

```typescript
// Step 1: Search with shadcn MCP
// Query: "button"
// Result: Found @shadcn/button component

// Step 2: Query API with Context7 MCP
// Query: "shadcn/ui Button component API documentation"
// Result: Learned about variants (default, destructive, outline, secondary, ghost, link)
//         and sizes (default, sm, lg, icon)

// Step 3: Install if needed
// $ pnpm dlx shadcn@latest add button

// Step 4: Import and use according to API
import { Button } from "@/components/ui/button"

export function MyComponent() {
  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Click me
    </Button>
  )
}
```

### Why This Matters

- **API Accuracy**: shadcn components have specific prop types and patterns. Guessing leads to TypeScript errors.
- **Up-to-date Documentation**: Context7 fetches the latest API documentation, avoiding outdated assumptions.
- **Consistency**: All components follow the same usage patterns when developers query before use.
- **Accessibility**: shadcn components use Radix UI primitives with proper ARIA attributes. Understanding the API ensures these are preserved.

### Common Components and Their APIs

Always query Context7 for the most current API, but here are typical components to search for:

- **Button**: Variants (default, destructive, outline, secondary, ghost, link), sizes
- **Card**: CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Dialog**: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
- **Input**: Standard input with consistent styling
- **Badge**: Variants (default, secondary, destructive, outline)
- **Popover**: Popover, PopoverTrigger, PopoverContent
- **Progress**: Value prop (0-100)
- **ScrollArea**: Wrapper for custom scrollable regions
- **Skeleton**: Loading placeholder with animation

### Enforcement

- **Code Reviews**: PRs using shadcn components without MCP queries will be flagged
- **AI Assistants**: Must demonstrate MCP usage in reasoning before implementing components
- **Documentation**: This workflow is documented in `openspec/changes/modernize-ui-with-shadcn/`

## Component Import Rules - No Barrel Files

**MANDATORY: All developers and AI assistants MUST follow direct import pattern.**

### Forbidden Pattern - Barrel Files
This project **strictly prohibits** barrel files (index.ts files that re-export components):

```typescript
// ❌ FORBIDDEN - Do NOT create or use barrel files
// src/components/index.ts
export { ImageGrid, ImageCard, ImageViewer } from "./gallery"
export { TagInput, TagFilterPanel } from "./tags"
```

### Required Pattern - Direct Imports
Always import directly from the component file:

```typescript
// ✅ CORRECT - Direct imports
import { ImageGrid } from "@/components/gallery/ImageGrid"
import { ImageCard } from "@/components/gallery/ImageCard"
import { ImageViewer } from "@/components/gallery/ImageViewer"
import { TagInput } from "@/components/tags/TagInput"
import { TagFilterPanel } from "@/components/tags/TagFilterPanel"
import { BatchTagEditor } from "@/components/tags/BatchTagEditor"
import { ImportButton } from "@/components/import/ImportButton"
```

### Why This Rule Exists

1. **Build Performance**: Barrel files create circular dependencies and slow down TypeScript compilation
2. **Tree Shaking**: Direct imports enable better tree shaking and smaller bundles
3. **Code Clarity**: Explicit import paths make dependencies clear and traceable
4. **Refactoring Safety**: Direct imports are safer for automated refactoring tools
5. **IDE Performance**: Reduces workspace indexing and improves IntelliSense performance

### Enforcement

- **Code Reviews**: Any PR containing barrel files will be rejected
- **AI Assistants**: Must use direct imports in all code generation
- **Linting**: Configure ESLint rules to detect and prevent barrel file creation
- **Documentation**: This rule is documented in `src/components/README.md`

### Migration Guide

When encountering existing barrel imports:
1. Identify the actual component file location
2. Replace barrel import with direct file import
3. Remove the barrel file after all references are updated
4. Test that imports work correctly