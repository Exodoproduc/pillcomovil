---
name: Pillco Móvil
colors:
  surface: '#f7fafd'
  surface-dim: '#d7dade'
  surface-bright: '#f7fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f7'
  surface-container: '#ebeef2'
  surface-container-high: '#e5e8ec'
  surface-container-highest: '#e0e3e6'
  on-surface: '#181c1f'
  on-surface-variant: '#404942'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eef1f4'
  outline: '#707971'
  outline-variant: '#c0c9c0'
  surface-tint: '#2d6a48'
  primary: '#003820'
  on-primary: '#ffffff'
  primary-container: '#0f5132'
  on-primary-container: '#84c39b'
  inverse-primary: '#95d4ac'
  secondary: '#006399'
  on-secondary: '#ffffff'
  secondary-container: '#67bafd'
  on-secondary-container: '#004972'
  tertiary: '#482904'
  on-tertiary: '#ffffff'
  tertiary-container: '#623f18'
  on-tertiary-container: '#ddab7b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f1c7'
  primary-fixed-dim: '#95d4ac'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#0f5132'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#94ccff'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#004b74'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#f0bd8b'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f18'
  background: '#f7fafd'
  on-background: '#181c1f'
  surface-variant: '#e0e3e6'
typography:
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system for this product is rooted in the dual identity of Huánuco: the lush, vibrant entrance to the Amazon and the enduring strength of its pre-Incan stone heritage. The brand personality is **Local, Secure, and Proud.** 

The visual style is **Corporate Modern with Regional Accents**. It prioritizes reliability and clarity—essential for a transit service—while utilizing distinctive cultural motifs. We move away from generic tech aesthetics by incorporating geometric patterns inspired by the 'Manos Cruzadas' (Crossed Hands) of Kotosh and the sturdy, rhythmic arches of the 'Puente Calicanto'. The interface uses high-contrast elements to ensure readability under the bright Andean sun.

## Colors
The palette is a tribute to the Huánuco landscape:
- **Primary (Yungas Green):** A deep, saturated forest green representing the lush vegetation. Used for primary actions and brand presence.
- **Secondary (Huallaga Blue):** A vibrant river blue used for real-time tracking, map paths, and active states.
- **Tertiary (Kotosh Ochre):** A warm, earthy tone used for highlights, warnings, or premium service tiers.
- **Surface (Calicanto Stone):** A range of cool greys and off-whites that provide a stable, architectural foundation for the UI.

The system uses a high-contrast ratio for all text elements to ensure accessibility for drivers and passengers on the move.

## Typography
We employ a pairing of **Montserrat** and **Inter** to balance personality with utility. 
- **Montserrat** is used for headlines and brand-heavy moments. Its geometric construction echoes the precision of ancient masonry.
- **Inter** is the workhorse for all functional UI, body text, and data-heavy ride details. Its high x-height ensures legibility at small sizes, crucial for maps and addresses.

Tracking is slightly tightened on headlines for a more "locked-in" and professional appearance.

## Layout & Spacing
This is a **mobile-first, fluid grid system**. The layout is designed around a 4-column mobile grid with 20px outer margins to provide "breathing room" for thumb interactions.

**Map-Centric Philosophy:**
The map is the persistent bottom layer. UI elements are treated as "floating sheets" or "bottom drawers" that slide over the map. This ensures the user never loses their geographic context. 
- **Safe Zones:** Critical action buttons (like "Request Ride") must stay within the bottom 30% of the screen.
- **Information Density:** Use ample vertical stacking (24px) between distinct sections to prevent accidental taps during bumpy rides.

## Elevation & Depth
The design system utilizes **Tonal Layers** and **Ambient Shadows** to create a clear hierarchy on the map:

1.  **Level 0 (Map):** The base layer.
2.  **Level 1 (Cards/Sheets):** White surfaces with a soft, diffused shadow (15% opacity Primary Green tint) to represent they are interactive objects sitting above the ground.
3.  **Level 2 (Floating Action Buttons):** High-elevation elements with a slightly sharper shadow to indicate they are the primary interaction points.
4.  **Level 3 (Modals/Overlays):** Full-screen takeovers with a 40% neutral backdrop tint to focus the user on critical safety or payment tasks.

## Shapes
We use a **Rounded (Level 2)** shape language. 
- **Standard UI elements** (Buttons, Inputs) use an 8px (0.5rem) radius. 
- **Bottom Drawers** use a 24px (1.5rem) top-only radius to create a "soft sheet" appearance.
- **Icon Enclosures** for vehicle types use a circular (pill) shape to distinguish them from functional UI buttons.

The visual rhythm is inspired by the "Calicanto" bridge—curves that feel structural and intentional rather than purely decorative.

## Components

### Buttons
- **Primary:** Solid Primary Green with white text. High-contrast and bold.
- **Secondary:** Outlined in Secondary Blue with 2px stroke. Used for secondary actions like "Add Stop".
- **Safety FAB:** A dedicated circular button in Kotosh Ochre with a "Shield" icon, always accessible during an active ride.

### Input Fields
- Floating labels are used to save vertical space. 
- Active states are indicated by a 2px Primary Green bottom border or "focus ring," mimicking the rhythmic lines of regional weaving.

### Ride Cards
- Summary cards use a clean white background with a subtle Stone Grey border. 
- Price points are displayed in bold Montserrat to ensure no ambiguity for the passenger.

### Custom Iconography
- **The "Manos Cruzadas" Loader:** A custom loading animation based on the crossed-hands motif.
- **Vehicle Icons:** Minimalist silhouettes of cars and moto-taxis, styled with rounded terminals to match the font weight of Inter.

### Status Indicators
- **Success:** Huallaga Blue.
- **Alert/Warning:** Kotosh Ochre.
- **Safe/Confirmed:** Yungas Green.