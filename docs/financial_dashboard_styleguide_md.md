# Financial Dashboard Style Guide

## Overview
This style guide defines the visual design system for the Financial Dashboard application, emphasizing clean, modern aesthetics with a focus on data clarity and user experience.

## Color Palette

### Primary Colors
- **Coral Primary**: `#E85A4F` - Main brand color, used for primary actions and key metrics
- **Coral Light**: `#FF6B5B` - Lighter variant for hover states and highlights
- **Coral Dark**: `#D44637` - Darker variant for pressed states and emphasis
- **Coral Muted**: `#F4A394` - Softer variant for backgrounds and subtle accents

### Neutral Colors
- **White**: `#FFFFFF` - Primary background color
- **Gray Lightest**: `#F8F9FA` - Secondary background, input backgrounds
- **Gray Light**: `#E9ECEF` - Borders, dividers
- **Gray Medium**: `#6C757D` - Secondary text, placeholders
- **Gray Dark**: `#343A40` - Primary text
- **Black**: `#1A1D21` - High contrast elements, dark backgrounds

### Semantic Colors
- **Success**: `#28A745` - Positive values, growth indicators
- **Warning**: `#FFC107` - Caution states, pending items
- **Error**: `#DC3545` - Negative values, error states
- **Info**: `#007BFF` - Informational content, links

## Typography

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Secondary**: SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif

### Font Sizes
- **Extra Small**: 0.75rem (12px) - Labels, captions
- **Small**: 0.875rem (14px) - Body text, buttons
- **Base**: 1rem (16px) - Standard body text
- **Large**: 1.125rem (18px) - Subheadings
- **Extra Large**: 1.25rem (20px) - Section headings
- **2X Large**: 1.5rem (24px) - Page headings
- **3X Large**: 1.875rem (30px) - Major headings
- **4X Large**: 2.25rem (36px) - Hero text, large numbers

### Font Weights
- **Light**: 300 - Subtle text elements
- **Regular**: 400 - Standard body text
- **Medium**: 500 - Emphasized text
- **Semibold**: 600 - Headings, buttons
- **Bold**: 700 - Strong emphasis, key metrics

## Spacing System

### Spacing Scale
- **XS**: 0.25rem (4px)
- **SM**: 0.5rem (8px)
- **MD**: 1rem (16px)
- **LG**: 1.5rem (24px)
- **XL**: 2rem (32px)
- **2XL**: 3rem (48px)
- **3XL**: 4rem (64px)

## Border Radius

- **None**: 0
- **Small**: 0.25rem (4px) - Small elements, icons
- **Medium**: 0.5rem (8px) - Input fields, small buttons
- **Large**: 0.75rem (12px) - Buttons, cards
- **Extra Large**: 1rem (16px) - Large cards, modals
- **Full**: 9999px - Circular elements, pills

## Shadows

### Shadow Scale
- **Small**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` - Subtle depth
- **Medium**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` - Standard cards
- **Large**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` - Elevated elements
- **Extra Large**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)` - Modals, dropdowns

## Components

### Buttons

#### Primary Button
- **Background**: Coral Primary (`#E85A4F`)
- **Text Color**: White
- **Border Radius**: Large (0.75rem)
- **Padding**: 0.75rem 1.5rem
- **Font Weight**: Semibold (600)
- **Font Size**: Small (0.875rem)
- **Hover State**: Coral Dark (`#D44637`)

#### Secondary Button
- **Background**: Transparent
- **Text Color**: Coral Primary
- **Border**: 1px solid Coral Primary
- **Border Radius**: Large (0.75rem)
- **Padding**: 0.75rem 1.5rem
- **Font Weight**: Semibold (600)
- **Font Size**: Small (0.875rem)
- **Hover State**: Background Coral Primary, Text White

### Cards
- **Background**: White (`#FFFFFF`)
- **Border Radius**: Extra Large (1rem)
- **Padding**: 1.5rem
- **Shadow**: Medium
- **Border**: 1px solid Gray Light (`#E9ECEF`)

### Input Fields
- **Background**: Gray Lightest (`#F8F9FA`)
- **Border**: 1px solid Gray Light (`#E9ECEF`)
- **Border Radius**: Medium (0.5rem)
- **Padding**: 0.75rem 1rem
- **Font Size**: Small (0.875rem)
- **Focus State**: Border Coral Primary, Box Shadow with Coral Primary

### Progress Circles
- **Size**: 80px diameter
- **Stroke Width**: 8px
- **Background**: Black (`#1A1D21`)
- **Progress Color**: Coral Primary (`#E85A4F`)

## Data Visualization

### Chart Colors
- **Primary Data**: Use Coral color palette variations
- **Secondary Data**: Use neutral grays
- **Positive Values**: Success green
- **Negative Values**: Error red

### Number Formatting
- **Large Numbers**: Use abbreviations (K, M, B) with 1-2 decimal places
- **Currency**: Include $ symbol, use comma separators
- **Percentages**: Include % symbol, up to 1 decimal place

## Layout Guidelines

### Grid System
- **Container Max Width**: 1440px
- **Container Padding**: 2rem horizontal
- **Grid Columns**: 12
- **Grid Gap**: 1.5rem

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Animation & Transitions

### Duration
- **Fast**: 0.15s - Micro-interactions, hover states
- **Normal**: 0.3s - Standard transitions, page changes
- **Slow**: 0.5s - Complex animations, large state changes

### Easing
- **Default**: cubic-bezier(0.4, 0, 0.2, 1)
- **Ease In**: cubic-bezier(0.4, 0, 1, 1)
- **Ease Out**: cubic-bezier(0, 0, 0.2, 1)

## Usage Guidelines

### Do's
- Use coral sparingly as an accent color for maximum impact
- Maintain consistent spacing using the defined scale
- Prioritize readability with sufficient color contrast
- Use white space generously to create breathing room
- Group related elements using cards and consistent spacing

### Don'ts
- Don't use more than 3 different font weights in a single view
- Don't use coral for large background areas
- Don't mix different border radius values within the same component group
- Don't use shadows on elements that are already elevated by other means

## Accessibility

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text
- Never rely solely on color to convey information

### Focus States
- All interactive elements must have visible focus indicators
- Focus indicators should use the coral primary color with appropriate opacity

## Implementation Notes

### CSS Custom Properties
Define color variables in CSS custom properties for easy theming:

```css
:root {
  --color-coral-primary: #E85A4F;
  --color-coral-light: #FF6B5B;
  --color-coral-dark: #D44637;
  --color-white: #FFFFFF;
  --color-gray-light: #E9ECEF;
  /* ... additional variables */
}
```

### Component Libraries
This style guide is designed to work with modern component libraries and CSS frameworks. The spacing, color, and typography scales are compatible with Tailwind CSS utility classes.