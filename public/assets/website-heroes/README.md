# Website Template hero art

Bundled placeholder backgrounds for the Website Template hero. They are
generic greyscale patterns so Brand Kit colours can tint them. They are
**not** photographs of a local, a campus, or a national union.

| File | Catalog id | Look |
|------|------------|------|
| `mesh.svg` | `mesh` | Crossed lattice (default) |
| `arc.svg` | `arc` | Soft corner glow and bottom curve |
| `bloom.svg` | `bloom` | Overlapping soft circles |

Legacy ids `bands` and `horizon` import as `arc` and `bloom`.

To swap in a still later, keep the same filename (or update `fileName` /
`publicPath` in `src/lib/templates/website/hero-art.ts`). The exported ZIP
always copies the chosen file to `assets/hero.svg` (or `assets/hero.jpg` when
the steward uploads a photo).

Do not add member photos, officer headshots, or identifiable campus shots here.
