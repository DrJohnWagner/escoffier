Title: ContentBlockList cannot render EntryBase.introduction when it is an array of strings

Summary
The component `components/ContentBlockList.tsx` can render `EntryBase.introduction` only when it is a string. When the introduction is an array of strings (as used in our data and described in `data/schemas/content-block-schema.json`), it is not rendered correctly.

Details
- Affected file: `components/ContentBlockList.tsx`
- Schema reference: `data/schemas/content-block-schema.json` defines a Content Block as either:
  - a string, or
  - an object whose property values are arrays of strings.
- Current behavior: The component assumes `introduction` is a string and skips or mishandles cases where it is not.
- Expected behavior: The component should render introductions that are:
  - a single string (render as a paragraph),
  - an array of strings (render each item as its own paragraph or list item), and
  - an object where each key maps to an array of strings (render the key as a subheading/title and the array items beneath it).

Reproduction
1) Pick an `Entry` where `introduction` is not a plain string, e.g., a list of paragraphs (array of strings) or an object of arrays as allowed by the schema.
2) Load the page that renders that entry (e.g., a chapter page under `app/chapters/[id]/page.tsx`).
3) Observe that the introduction content is not fully rendered.

Examples
- Valid content-block examples per schema:
  - String: `"A single intro paragraph."`
  - Array of strings (currently problematic): `["Para 1", "Para 2"]`
  - Object of arrays: `{ "Introduction": ["Para 1", "Para 2"] }`

Acceptance Criteria
- `ContentBlockList` renders all three forms above without errors.
- Add/adjust TypeScript types to reflect `ContentBlock` union shape.
- Add a small test or storybook example (if available) to cover string, array-of-strings, and object-of-arrays cases.

Proposed Approach
- In `ContentBlockList`, detect the input type:
  - if string: render a paragraph.
  - if array: map and render each string as a paragraph/list item.
  - if object: iterate keys, render a heading for the key and paragraphs for each string in the array.
- Reuse existing styles and layout.

Notes
- The JSON schema is authoritative: `data/schemas/content-block-schema.json`.
- Some earlier data used raw arrays of strings; the component should handle that gracefully even if we normalize data over time.
