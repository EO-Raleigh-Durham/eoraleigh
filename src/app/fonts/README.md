# Self-hosted Roboto fonts

`src/app/layout.tsx` loads these with `next/font/local`. They replace `next/font/google`, whose build-time download from Google failed intermittently in CI and every time in cache-free Vercel builds (`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`).

Each file is a variable woff2 subset to the `latin-vietnamese` ranges Google Fonts uses (latin plus its accented extension):

| File | Source (github.com/google/fonts, `ofl/`) | Axes kept |
| --- | --- | --- |
| `roboto-latin-vietnamese.woff2` | `roboto/Roboto[wdth,wght].ttf` | wght 300 to 900 (wdth pinned 100) |
| `roboto-mono-latin-vietnamese.woff2` | `robotomono/RobotoMono[wght].ttf` | wght 400 to 700 |
| `roboto-serif-latin-vietnamese.woff2` | `robotoserif/RobotoSerif[GRAD,opsz,wdth,wght].ttf` | wght 400 to 700 (GRAD 0, opsz 20, wdth 100 pinned) |

Licence: SIL Open Font License 1.1.

To rebuild (needs `pip install fonttools brotli`):

```bash
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"
fonttools varLib.instancer "Roboto[wdth,wght].ttf" wdth=100 wght=300:900 -o r.ttf
fonttools varLib.instancer "RobotoMono[wght].ttf" wght=400:700 -o m.ttf
fonttools varLib.instancer "RobotoSerif[GRAD,opsz,wdth,wght].ttf" GRAD=0 opsz=drop wdth=100 wght=400:700 -o s.ttf
pyftsubset r.ttf --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=roboto-latin-vietnamese.woff2
pyftsubset m.ttf --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=roboto-mono-latin-vietnamese.woff2
pyftsubset s.ttf --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=roboto-serif-latin-vietnamese.woff2
```
