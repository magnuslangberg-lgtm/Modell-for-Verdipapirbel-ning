# Pensum Verdipapirbelåning Kalkulator

En interaktiv kalkulator for å beregne verdipapirbelåning, utviklet for Pensum Asset Management.

## Funksjoner

### 📈 Reinvestering
- Lån mot verdipapirer og reinvester i samme aktiva
- Sammenlign avkastning med og uten belåning
- Se årlig utvikling med graf og tabell

### 💵 Kontantuttak
- Ta ut kontanter mot verdipapirpant
- Pantet forblir investert og vokser
- Rentekostnader trekkes fra pantekontoen
- **Investeringsscenario**: Se hva som skjer hvis kontantuttaket investeres i eiendom eller PE

### 🚀 Maks belåning
- Teoretisk maksimum med reinvestering og pantsetting
- Formel: Maks gjeld = (LTV / (1-LTV)) × Egenkapital
- År-for-år utvikling av egenkapital, gjeld og eksponering

## LTV per aktivaklasse

| Aktivaklasse | Maks LTV |
|--------------|----------|
| Cash | 100% |
| Pengemarkedsfond | 90% |
| Høyrentefond | 80% |
| Aksjefond | 60% |
| Enkeltaksjer (diversifisert) | 50% |
| Enkeltaksjer (konsentrert) | 20% |

## Valuta / Baserenter

- NOK (NIBOR 3M)
- EUR (EURIBOR 3M)
- USD (SOFR 3M)
- SEK (STIBOR 3M)

## Installasjon

```bash
npm install
npm run dev
```

## Bygg for produksjon

```bash
npm run build
```

## Deploy til Vercel

1. Push til GitHub
2. Koble repository til Vercel
3. Vercel vil automatisk bygge og deploye

## Teknologi

- React 18
- Vite
- Recharts (grafer)

---

© Pensum Asset Management AS
