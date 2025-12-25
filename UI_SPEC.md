# Substitution Mapping Mixer – UI Specification

## 1. Core UI Principles

1. Branch results are always the primary content
2. Horizontal space must never be contested
3. Growing information is absorbed vertically

---

## 2. Base Screen Layout

```
┌──────────────────────────────┐
│ Input / Working Text         │
│ (Ciphertext + Plaintext)     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Substitution Mapping Grid    │
│ [A → fixed | candidates]     │
│ [B → fixed | candidates]     │
│ ... (A-Z in grid layout)     │
│ ─────────────────────────    │
│ Unused plaintext letters     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Branch Results View          │
│                              │
│ [Branch Card]                │
│ [Branch Card]                │
│ [Branch Card] ...            │
└──────────────────────────────┘
```

- Full-width layout (max 960px centered)
- Vertical scrolling only

---

## 3. Input / Working Text Area

### Role
- Ciphertext
- Confirmed plaintext
- Thinking notes

### Requirements
- Monospace font
- Uppercase and lowercase clearly distinguished
- Immediate reflection of edits

---

## 4. Branch Results View

### Structure
- One branch = one card
- Cards are stacked vertically

### Card Contents
- Branch label (single line)
- Decoded text
- Difference highlighting

Branch cards are never collapsed automatically.

---

## 5. Substitution Mapping Grid

### Display Mode
- Always visible (not an overlay)
- Positioned between input area and branch results

### Layout
- Responsive grid layout (auto-fill, minmax 140px)
- Each cipher letter (A-Z) has its own row with two inputs

### Per-Letter Inputs
- **Fixed input**: Single character field for confirmed mapping
- **Candidates input**: Multi-character field for possible mappings

### Visual Feedback
- Hover highlighting syncs with decoded text
- Conflict rows are highlighted in red
- Unused plaintext letters shown below the grid
  - Completely unused: neutral style
  - Candidate-only: warning style (yellow)

---

## 6. Conflict Visualization

- Conflicts are shown via color / emphasis
- The UI never blocks user actions
- The user always retains control

---

## 7. Explicitly Rejected Designs

- Side-by-side permanent panels
- Horizontal scrolling of branch results
- Automatic branch pruning or ranking

---

## 8. UX Statement (Final)

> Branch growth is not an error.
> It is the normal operating state of this tool.

The UI must remain stable even when branches increase significantly.
