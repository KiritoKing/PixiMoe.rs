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

More detail information like debugging for project reference to `@/openspec/projeect.md`.

## shadcn/ui Usage Rules

**MANDATORY workflow for shadcn/ui components:**

1. **Search with shadcn MCP** → Find component name
2. **Query API with Context7 MCP** → Get current props/variants
3. **Install if needed** → `pnpm dlx shadcn@latest add <component>`
4. **Import directly** → `import { Button } from "@/components/ui/button"`

**Common components:** Button, Card, Dialog, Input, Badge, Popover, Progress, ScrollArea, Skeleton

## Import Rules - No Barrel Files

**MANDATORY: Direct imports only. No barrel files.**

❌ Forbidden:
```typescript
// src/components/index.ts - DON'T CREATE
export { ImageGrid, ImageCard } from "./gallery"
```

✅ Required:
```typescript
import { ImageGrid } from "@/components/gallery/ImageGrid"
import { ImageCard } from "@/components/gallery/ImageCard"
```

**Why:** Build performance, tree shaking, code clarity, refactoring safety, IDE performance.