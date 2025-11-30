# Enhanced Tag System Design

## Overview

This design integrates four major enhancements into a cohesive tag system upgrade: fixing critical AI classification bugs, adding custom categories, implementing favorites, and enhancing the UI.

## 1. AI Classification Bug Fix

### Problem Analysis
- **Current Issue**: AI model correctly outputs category IDs (9=rating, 4=character, 0=general) but all tags are stored as 'general'
- **Root Cause**: TagPrediction structure lacks category field, database insertion hardcodes 'general' type
- **Impact**: Breaks WD-Tagger compatibility and wastes sophisticated AI categorization

### Solution Architecture

**Enhanced Data Flow:**
```
AI Model (category ID) → TagPrediction (category string) → Database (correct type)
```

**Key Changes:**
- Extend TagPrediction with category field
- Fix database insertion to use actual categories
- Map category IDs to database types consistently

## 2. Custom Tag Categories System

### Database Schema
```sql
-- New TagCategories table
CREATE TABLE TagCategories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color_code TEXT NOT NULL DEFAULT '#6B7280',
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enhanced Tags table
ALTER TABLE Tags ADD COLUMN category_id INTEGER NOT NULL DEFAULT 1;
```

**Built-in Categories:**
- GENERAL (#10B981)
- CHARACTER (#3B82F6)
- RATING (#EF4444)
- ARTIST (#F59E0B)

### Migration Strategy
- Map existing type field to category system
- Preserve all existing tag relationships
- Provide rollback procedures for safety

## 3. Favorites System (Independent Module)

### Data Model
```sql
CREATE TABLE Favorites (
    favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### System Integration
- Independent favorites spec with complete functionality
- Integration with file management for filter support
- UI components for favorite status display
- Batch operations framework support

### Key Features
- Individual file favorite toggle
- Batch favorite operations
- Favorite status persistence
- Integration with existing filtering system

## 4. Enhanced Tag Filter UI

### Layout Architecture
```
┌─────────────────────────┐
│ Selected Tags Area      │ ← Horizontal scroll, quick removal
├─────────────────────────┤
│ Search Bar              │
├─────────────────────────┤
│ Category Sections       │ ← Collapsible, sortable
│ ├─ GENERAL (42) ▼      │
│ ├─ CHARACTER (15) ▼     │
│ └─ CUSTOM (8) ▼         │
├─────────────────────────┤
│ Empty Tags Section      │ ← Horizontal scroll, space-efficient
└─────────────────────────┘
```

### Key Features
- Multiple sorting modes (alphabetical, count)
- Collapsible category sections with persistence
- Real-time search across all sections
- Selected tags display with individual removal
- Empty tags optimization

## 5. Integration Architecture

### Data Flow
```
AI Model → TagPrediction (with category) → Database (correct types)
                                                   ↓
Categories ← TagCategories table → UI (color coding)
                                                   ↓
Favorites ← Favorites table → Filter logic (AND)
                                                   ↓
Enhanced UI ← TagFilterPanel improvements ← User experience
```

### API Layer
- Maintain backward compatibility with existing tag operations
- Add new category and favorites management commands
- Extend existing commands to support new features transparently

### Migration Path
1. Fix AI classification (Phase 0 - critical)
2. Add database schema (Phase 1)
3. Implement backend APIs (Phase 2)
4. Enhance UI components (Phase 3)
5. Integration testing and polish (Phase 4)

## Performance Considerations

### Database Optimization
- Indexes for category lookups and favorite relationships
- Efficient query patterns for combined filtering
- Batch operations for category assignments

### UI Performance
- Virtual scrolling for large tag sets
- Debounced search implementation
- Efficient re-render patterns with memoization

### Migration Performance
- Incremental data migration with validation
- Minimal downtime during schema changes
- Comprehensive backup and rollback procedures

## Risk Mitigation

### Data Integrity
- Comprehensive database backups before migration
- Transaction-based operations for consistency
- Validation scripts for data verification

### User Experience
- Progressive enhancement approach
- Backward compatibility maintenance
- Clear communication of changes

### Rollback Strategy
- Database schema rollback scripts
- Feature flags for gradual rollout
- Monitoring and alerting for issues