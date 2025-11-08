# Style Guide & CSS Standards

## Overview

This project uses centralized CSS-in-JS styles to maintain consistency and reduce code duplication across pages and components.

## Location of Standardized Styles

### Main Style Files

- **`src/styles/projectDetailStyles.ts`** - Primary styles for project detail pages and forms
- **`src/styles/projectStyles.ts`** - Additional project-related styles
- **`src/styles/globals.css`** - Global CSS styles

## Using Standardized Styles

### Import Pattern

```typescript
import * as styles from '@/styles/projectDetailStyles';
```

### Available Style Constants

#### Layout Styles

- `pageContainerStyle` - Main page wrapper (full height, background)
- `headerStyle` - Page header bar
- `contentWrapperStyle` - Content container with max-width
- `threeColumnLayoutStyle` - Three-column flex layout
- `leftSidebarStyle` - Left sidebar (20% width)
- `mainContentStyle` - Main content area (55% width)
- `rightSidebarStyle` - Right sidebar (25% width)
- `stickyContainerStyle` - Sticky positioned container

#### Card Styles

- `cardStyle` - Standard card with border, shadow, padding
- `projectInfoCardStyle` - Project information card variant
- `statusCardStyle` - Status card with border

#### Form Styles

- `inputStyle` - Standard text input
- `labelStyle` - Form field labels (uppercase, small)
- `formFieldStyle` - Form field container (flex column)
- `editFormContainerStyle` - Edit form wrapper with background

#### Button Styles

- `primaryButtonStyle` - Primary action button (blue)
- `secondaryButtonStyle` - Secondary button (white with border)
- `dangerButtonStyle` - Destructive action (red)
- `successButtonStyle` - Success action (green)

#### Header Styles

- `sectionHeaderStyle` - Major section headers (20px)
- `subsectionHeaderStyle` - Subsection headers (16px)
- `sectionTitleStyle` - Small section titles (13px)

#### Text Styles

- `titleStyle` - Page title (28px, bold)
- `subtitleStyle` - Page subtitle (16px, gray)
- `detailLabelStyle` - Detail field labels (12px, gray)
- `detailValueStyle` - Detail field values (14px, dark)

#### Table Styles

- `thLeft`, `thCenter`, `thRight` - Table headers with alignment
- `tdLeft`, `tdCenter`, `tdRight` - Table cells with alignment

#### Section Styles

- `sectionDividerStyle` - Section divider with top border

#### Tab Styles

- `tabContainerStyle` - Tab navigation container
- `getTabStyle(isActive: boolean)` - Dynamic tab button style

#### Toast/Notification Styles

- `getToastStyle(type: 'success' | 'error' | 'info')` - Toast notification style

## Best Practices

### ✅ DO

- Import and use centralized styles from `projectDetailStyles.ts`
- Add new reusable styles to the style file when creating patterns used 2+ times
- Use the namespace import pattern: `import * as styles from '@/styles/projectDetailStyles'`
- Keep component-specific dynamic styles inline (e.g., conditional colors based on props)

### ❌ DON'T

- Create duplicate style objects in component files
- Define one-off style constants at the bottom of page files
- Hard-code common spacing/color values inline repeatedly
- Mix different style approaches in the same file

## Adding New Styles

When adding a new reusable style:

1. Add it to `src/styles/projectDetailStyles.ts`
2. Export with descriptive name ending in `Style` (e.g., `modalHeaderStyle`)
3. Use TypeScript `React.CSSProperties` for type safety
4. Group related styles together with comments

Example:

```typescript
// Modal Styles
export const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
};

export const modalContentStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 600,
  margin: '100px auto',
};
```

## Migration Status

### ✅ Completed

- `src/pages/projects/[id].tsx` - **Reduced from 1,919 to 1,692 lines** (227 lines saved)
  - All layout containers
  - Form fields and inputs
  - Headers and sections
  - Cards and navigation

### 🔄 To Be Standardized

- Other page files with repetitive inline styles
- Shared component styles that could be centralized

## Performance Notes

- CSS-in-JS objects are created once at module load time
- No runtime performance penalty for using imported constants vs inline objects
- Better bundle optimization since styles can be tree-shaken if unused

## Questions?

Refer to `src/styles/projectDetailStyles.ts` for the complete list of available styles and their definitions.
