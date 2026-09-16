# the tape on the photographs

`clear.webp` is a photograph of a real strip of clear tape — crinkled, torn at both
ends, with a fingerprint and dust in it.

| file | license | source |
|---|---|---|
| `clear.webp` | [Unsplash License](https://unsplash.com/license) — free for commercial use, no attribution required | photo by Alan Aprilio, [unsplash](https://unsplash.com/photos/a-close-up-of-a-clear-crinkled-piece-of-tape-eTtd1HDX0X8) |

Processing (`tools-paper/keytape.py`): shot on black, so the light the tape throws is
kept as alpha (screen-to-alpha above the black floor) and its colour cast is dropped.
Clear tape is nearly invisible on white paper except for its film and its cut edge, so
those are added back faintly from the strip's own outline: a warm film over the body
and a thin darker line at the edge. Exported at 700×224 with alpha.

One strip serves every corner; `TAPE` in `tools-epk.py` gives each corner its own
angle, length and flip.
