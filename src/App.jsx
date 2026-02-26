import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, Bar } from 'recharts';

const PensumVerdipapirbelaning = () => {
  // Porteføljesammensetning
  const [portefoljeMode, setPortefoljeMode] = useState('enkel');
  const [portefoljeVerdi, setPortefoljeVerdi] = useState(10000000);
  const [portefolje, setPortefolje] = useState({
    cash: 0,
    pengemarkedsfond: 0,
    enkeltaksjer: 0,
    hoyrentefond: 0,
    aksjefond: 10000000
  });
  
  const [enkeltaksjerDiversifisert, setEnkeltaksjerDiversifisert] = useState(true);
  const [aktivaklasse, setAktivaklasse] = useState('aksjefond');
  const [ltv, setLtv] = useState(60);
  
  // Renteinnstillinger
  const [valuta, setValuta] = useState('NOK');
  const [rentepaaslag, setRentepaaslag] = useState(1.0);
  
  const [reinvesteringAvkastning, setReinvesteringAvkastning] = useState(8);
  const [tidshorisont, setTidshorisont] = useState(5);
  const [modus, setModus] = useState('reinvestering'); // 'reinvestering', 'kontantuttak', 'maksbelaning'
  const [visDetaljer, setVisDetaljer] = useState(true);
  
  // Investeringsscenario for kontantuttak
  const [visInvesteringsscenario, setVisInvesteringsscenario] = useState(false);
  const [investeringstype, setInvesteringstype] = useState('eiendom'); // 'eiendom', 'pe'
  const [investeringAvkastning, setInvesteringAvkastning] = useState(12); // Forventet avkastning på eiendom/PE

  // Aktivaklasser med maks LTV
  const getAktivaklasser = (diversifisert) => ({
    cash: { navn: 'Cash', maksLTV: 100, farge: '#2e7d4a' },
    pengemarkedsfond: { navn: 'Pengemarkedsfond', maksLTV: 90, farge: '#3d8a6e' },
    enkeltaksjer: { 
      navn: 'Enkeltaksjer', 
      maksLTV: diversifisert ? 50 : 20, 
      farge: '#4a7db8',
      info: diversifisert ? 'Maks 20% per aksje' : 'Konsentrert posisjon'
    },
    hoyrentefond: { navn: 'Høyrentefond', maksLTV: 80, farge: '#6a5acd' },
    aksjefond: { navn: 'Aksjefond', maksLTV: 60, farge: '#1e3a5f' }
  });

  const aktivaklasser = getAktivaklasser(enkeltaksjerDiversifisert);

  // Baserenter (3M) - oppdatert januar 2026
  const baserenter = {
    NOK: { navn: 'NIBOR 3M', rate: 4.00, oppdatert: '03.01.2026' },
    EUR: { navn: 'EURIBOR 3M', rate: 2.25, oppdatert: '03.01.2026' },
    USD: { navn: 'SOFR 3M', rate: 3.60, oppdatert: '02.01.2026' },
    SEK: { navn: 'STIBOR 3M', rate: 2.45, oppdatert: '03.01.2026' }
  };

  const valgtValuta = baserenter[valuta];
  const totalRente = valgtValuta.rate + rentepaaslag;

  // Pensum fargepalett
  const colors = {
    primary: '#1e3a5f',
    primaryLight: '#5B8DB8',
    primaryDark: '#0f2540',
    accent: '#c9a227',
    white: '#ffffff',
    lightGray: '#f5f7fa',
    mediumGray: '#e8ecf1',
    textDark: '#1a1a1a',
    textMuted: '#5a6a7a',
    success: '#2e7d4a',
    warning: '#d4a017',
    danger: '#b33a3a'
  };

  // Beregn vektet LTV for porteføljesammensetning
  const portefoljeBeregning = useMemo(() => {
    if (portefoljeMode === 'enkel') {
      const valgtAktiva = aktivaklasser[aktivaklasse];
      const faktiskLTV = Math.min(ltv, valgtAktiva.maksLTV);
      return {
        totalVerdi: portefoljeVerdi,
        vektetMaksLTV: valgtAktiva.maksLTV,
        faktiskLTV,
        maksLanebelop: portefoljeVerdi * (valgtAktiva.maksLTV / 100),
        faktiskLanebelop: portefoljeVerdi * (faktiskLTV / 100),
        fordeling: [{ navn: valgtAktiva.navn, verdi: portefoljeVerdi, andel: 100, maksLTV: valgtAktiva.maksLTV }]
      };
    } else {
      const totalVerdi = Object.values(portefolje).reduce((sum, val) => sum + val, 0);
      
      if (totalVerdi === 0) {
        return { totalVerdi: 0, vektetMaksLTV: 0, faktiskLTV: 0, maksLanebelop: 0, faktiskLanebelop: 0, fordeling: [] };
      }

      let vektetMaksLTV = 0;
      const fordeling = [];
      
      Object.entries(portefolje).forEach(([key, verdi]) => {
        if (verdi > 0) {
          const aktiva = aktivaklasser[key];
          const andel = (verdi / totalVerdi) * 100;
          vektetMaksLTV += (verdi / totalVerdi) * aktiva.maksLTV;
          fordeling.push({ key, navn: aktiva.navn, verdi, andel, maksLTV: aktiva.maksLTV });
        }
      });

      const faktiskLTV = Math.min(ltv, vektetMaksLTV);
      
      return {
        totalVerdi, vektetMaksLTV, faktiskLTV,
        maksLanebelop: totalVerdi * (vektetMaksLTV / 100),
        faktiskLanebelop: totalVerdi * (faktiskLTV / 100),
        fordeling: fordeling.sort((a, b) => b.verdi - a.verdi)
      };
    }
  }, [portefoljeMode, portefolje, portefoljeVerdi, aktivaklasse, ltv, aktivaklasser]);

  // Maks belåning med reinvestering beregninger - forenklet
  const maksBelaningBeregning = useMemo(() => {
    const C = portefoljeBeregning.totalVerdi; // Startpant / Egenkapital
    const valgtAktiva = portefoljeMode === 'enkel' ? aktivaklasser[aktivaklasse] : null;
    const L = portefoljeMode === 'enkel' ? valgtAktiva.maksLTV / 100 : portefoljeBeregning.vektetMaksLTV / 100;
    
    if (L >= 1 || C === 0) {
      return { arligData: [], maksGjeld: 0, totalEksponering: 0, ltv: L * 100, egenkapital: C };
    }
    
    // Teoretisk maks gjeld med reinvestering: D = (L / (1 - L)) * C
    const maksGjeld = (L / (1 - L)) * C;
    const totalEksponering = C + maksGjeld;
    
    const arligData = [];
    
    // År 0: Start - kun egenkapital, ingen gjeld ennå
    arligData.push({
      ar: 0,
      label: 'Start',
      egenkapital: C,
      gjeld: 0,
      totalEksponering: C,
      ltv: 0
    });
    
    // År 1+: Full maks belåning fra år 1, deretter vokser alt med avkastning
    let egenkapital = C;
    
    for (let ar = 1; ar <= Math.max(tidshorisont, 10); ar++) {
      // Total eksponering ved maks LTV = Egenkapital / (1 - LTV)
      const eksponering = egenkapital / (1 - L);
      const gjeld = eksponering - egenkapital;
      const ltvProsent = (gjeld / eksponering) * 100; // Skal alltid være lik L * 100
      
      arligData.push({
        ar,
        label: `År ${ar}`,
        egenkapital: egenkapital,
        gjeld: gjeld,
        totalEksponering: eksponering,
        ltv: ltvProsent
      });
      
      // Neste år: egenkapitalen vokser med avkastning på total eksponering minus rentekostnader
      const avkastning = eksponering * (reinvesteringAvkastning / 100);
      const rentekostnad = gjeld * (totalRente / 100);
      egenkapital = egenkapital + avkastning - rentekostnad;
    }
    
    return {
      arligData,
      maksGjeld,
      totalEksponering,
      ltv: L * 100,
      egenkapital: C
    };
  }, [portefoljeBeregning, aktivaklasse, aktivaklasser, portefoljeMode, totalRente, reinvesteringAvkastning, tidshorisont]);

  const beregninger = useMemo(() => {
    const { totalVerdi, faktiskLTV, faktiskLanebelop } = portefoljeBeregning;
    const initieltLan = faktiskLanebelop;
    const rentekostnadArlig = initieltLan * (totalRente / 100);
    
    if (faktiskLTV === 0 || initieltLan === 0 || totalVerdi === 0) {
      return {
        initieltLan: 0, rentekostnadArlig: 0, totalRentekostnad: 0,
        arligData: [], sluttPortefolje: totalVerdi, effektivLTV: 0, faktiskLTV
      };
    }
    
    if (modus === 'kontantuttak') {
      // KORRIGERT LOGIKK:
      // - Kontantuttak tas ut én gang ved start og er "ute" (brukes til annet)
      // - Pantet (fondet) forblir investert og utvikler seg med avkastning
      // - Rentekostnader trekkes fra panteverdien (belastes kontoen)
      // - Netto panteverdi = Brutto panteverdi - Akkumulert rentekostnad
      
      const kontantUttak = initieltLan; // Dette beløpet tas ut og er "ute"
      const arligData = [];
      
      let bruttoPantVerdi = totalVerdi; // Starter med opprinnelig pant
      let akkumulertRente = 0;
      
      // Start
      arligData.push({
        ar: 0,
        label: 'Start',
        bruttoPantVerdi: totalVerdi,
        avkastning: 0,
        rentekostnad: 0,
        akkumulertRente: 0,
        nettoPantVerdi: totalVerdi,
        kontantUttak: kontantUttak,
        gjeld: initieltLan,
        effektivLTV: (initieltLan / totalVerdi) * 100
      });
      
      for (let ar = 1; ar <= tidshorisont; ar++) {
        // Avkastning på brutto panteverdi
        const avkastning = bruttoPantVerdi * (reinvesteringAvkastning / 100);
        bruttoPantVerdi += avkastning;
        
        // Rentekostnad på lånet (trekkes fra pant/konto)
        const rentekostnad = initieltLan * (totalRente / 100);
        akkumulertRente += rentekostnad;
        
        // Netto panteverdi = Brutto - akkumulerte rentekostnader
        const nettoPantVerdi = bruttoPantVerdi - akkumulertRente;
        
        // Effektiv LTV basert på brutto panteverdi
        const effektivLTV = (initieltLan / bruttoPantVerdi) * 100;
        
        arligData.push({
          ar,
          label: `År ${ar}`,
          bruttoPantVerdi,
          avkastning,
          rentekostnad,
          akkumulertRente,
          nettoPantVerdi,
          kontantUttak, // Forblir konstant - er "ute"
          gjeld: initieltLan, // Lånet forblir konstant (ingen nedbetaling)
          effektivLTV
        });
      }
      
      const sisteAr = arligData[arligData.length - 1];
      const totalAvkastning = sisteAr.bruttoPantVerdi - totalVerdi;
      const totalRentekostnad = sisteAr.akkumulertRente;
      const nettoResultat = totalAvkastning - totalRentekostnad; // Hva du sitter igjen med i pantet etter renter
      
      return {
        initieltLan,
        kontantUttak,
        rentekostnadArlig,
        totalRentekostnad,
        arligData,
        faktiskLTV,
        // Sluttresultater
        sluttBruttoPant: sisteAr.bruttoPantVerdi,
        sluttNettoPant: sisteAr.nettoPantVerdi,
        totalAvkastning,
        nettoResultat,
        sluttEffektivLTV: sisteAr.effektivLTV,
        // Total formue = Netto pant + kontantuttak (som er brukt til annet)
        totalFormue: sisteAr.nettoPantVerdi + kontantUttak
      };
    } else {
      // Reinvestering - uendret logikk
      let totalEksponering = totalVerdi + initieltLan;
      let totalLan = initieltLan;
      
      const arligData = [];
      let forrigePortefolje = totalEksponering;
      let portefoljeUtenLan = totalVerdi;
      let akkumulertRentekostnad = 0;
      
      arligData.push({
        ar: 0, label: 'Start',
        portefoljeVerdi: totalEksponering,
        portefoljeUtenLan: totalVerdi,
        avkastning: 0, rentekostnad: 0, akkumulertRentekostnad: 0,
        nettoGevinst: 0, akkumulertNettoGevinst: 0,
        totalLan, effektivLTV: (totalLan / totalEksponering) * 100
      });
      
      for (let ar = 1; ar <= tidshorisont; ar++) {
        const avkastning = forrigePortefolje * (reinvesteringAvkastning / 100);
        const avkastningUtenLan = portefoljeUtenLan * (reinvesteringAvkastning / 100);
        const rentekostnad = totalLan * (totalRente / 100);
        akkumulertRentekostnad += rentekostnad;
        const nyPortefoljeVerdi = forrigePortefolje + avkastning;
        const nyPortefoljeUtenLan = portefoljeUtenLan + avkastningUtenLan;
        const nettoGevinst = avkastning - rentekostnad;
        const arligEffektivLTV = (totalLan / nyPortefoljeVerdi) * 100;
        
        arligData.push({
          ar, label: `År ${ar}`,
          portefoljeVerdi: nyPortefoljeVerdi,
          portefoljeUtenLan: nyPortefoljeUtenLan,
          avkastning, rentekostnad, akkumulertRentekostnad,
          nettoGevinst,
          akkumulertNettoGevinst: arligData[arligData.length - 1].akkumulertNettoGevinst + nettoGevinst,
          totalLan, effektivLTV: arligEffektivLTV
        });
        
        forrigePortefolje = nyPortefoljeVerdi;
        portefoljeUtenLan = nyPortefoljeUtenLan;
      }
      
      const sisteAr = arligData[arligData.length - 1];
      const totalAvkastning = sisteAr.portefoljeVerdi - totalEksponering;
      const totalRentekostnad = akkumulertRentekostnad;
      const nettoGevinst = totalAvkastning - totalRentekostnad;
      const avkastningUtenLan = sisteAr.portefoljeUtenLan - totalVerdi;
      const merverdi = nettoGevinst - avkastningUtenLan;
      
      return {
        initieltLan, totalEksponering, totalAvkastning, totalRentekostnad,
        nettoGevinst, avkastningUtenLan, merverdi, arligData,
        sluttPortefolje: sisteAr.portefoljeVerdi,
        effektivLTV: sisteAr.effektivLTV, faktiskLTV, rentekostnadArlig
      };
    }
  }, [portefoljeBeregning, totalRente, reinvesteringAvkastning, tidshorisont, modus]);

  const formatNOK = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0 kr';
    return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatNOKShort = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  const formatProsent = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0,0%';
    return `${value.toFixed(1)}%`;
  };

  const updatePortefolje = (key, value) => {
    setPortefolje(prev => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));
  };

  const ltvOverMaks = ltv > portefoljeBeregning.vektetMaksLTV;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: colors.white, border: `1px solid ${colors.mediumGray}`, borderRadius: '8px', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: colors.primary }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span style={{ fontWeight: '500' }}>{formatNOK(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const PensumLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
        <path d="M20 15 L20 85 L35 85 L35 60 L55 60 C75 60 85 50 85 37.5 C85 25 75 15 55 15 L20 15 Z M35 28 L52 28 C62 28 70 32 70 37.5 C70 43 62 47 52 47 L35 47 L35 28 Z" fill="#5B8DB8"/>
      </svg>
      <div style={{ borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: '12px', height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '2px' }}>PENSUM</div>
        <div style={{ fontSize: '9px', letterSpacing: '1.5px', opacity: 0.85 }}>ASSET MANAGEMENT</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.lightGray, fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: colors.textDark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; background: #e0e5eb; outline: none; margin: 14px 0; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${colors.primary}; cursor: pointer; border: 3px solid ${colors.white}; box-shadow: 0 2px 6px rgba(30, 58, 95, 0.3); }
        input[type="number"] { background: ${colors.white}; border: 1px solid #d0d7e0; border-radius: 6px; padding: 10px 12px; color: ${colors.textDark}; font-family: 'Open Sans', sans-serif; font-size: 14px; width: 100%; }
        input[type="number"]:focus { outline: none; border-color: ${colors.primary}; box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1); }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .pensum-card { background: ${colors.white}; border-radius: 8px; padding: 24px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); border: 1px solid rgba(0, 0, 0, 0.04); }
        .pensum-header { background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%); color: ${colors.white}; padding: 20px 40px; margin-bottom: 24px; }
        .result-box { background: ${colors.lightGray}; border-radius: 6px; padding: 14px 16px; border-left: 4px solid ${colors.primary}; }
        .result-box.highlight { border-left-color: ${colors.accent}; background: linear-gradient(135deg, rgba(201, 162, 39, 0.08) 0%, rgba(201, 162, 39, 0.02) 100%); }
        .result-box.danger { border-left-color: ${colors.danger}; background: linear-gradient(135deg, rgba(179, 58, 58, 0.08) 0%, rgba(179, 58, 58, 0.02) 100%); }
        .result-box.success { border-left-color: ${colors.success}; background: linear-gradient(135deg, rgba(46, 125, 74, 0.08) 0%, rgba(46, 125, 74, 0.02) 100%); }
        .btn-modus { padding: 10px 18px; border: 2px solid ${colors.primary}; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s ease; }
        .btn-modus.active { background: ${colors.primary}; color: ${colors.white}; }
        .btn-modus.inactive { background: ${colors.white}; color: ${colors.primary}; }
        .btn-modus.inactive:hover { background: ${colors.lightGray}; }
        .valuta-btn { padding: 10px 12px; border: 2px solid #d0d7e0; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; background: ${colors.white}; display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .valuta-btn:hover { border-color: ${colors.primary}; }
        .valuta-btn.selected { border-color: ${colors.primary}; background: rgba(30, 58, 95, 0.05); }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
        .data-table th { background: ${colors.primary}; color: ${colors.white}; padding: 10px 10px; text-align: right; font-weight: 600; font-size: 10px; text-transform: uppercase; }
        .data-table th:first-child { text-align: left; border-radius: 6px 0 0 0; }
        .data-table th:last-child { border-radius: 0 6px 0 0; }
        .data-table td { padding: 9px 10px; text-align: right; border-bottom: 1px solid ${colors.mediumGray}; }
        .data-table td:first-child { text-align: left; font-weight: 500; }
        .data-table tr:hover td { background: ${colors.lightGray}; }
        .positive { color: ${colors.success}; font-weight: 500; }
        .negative { color: ${colors.danger}; font-weight: 500; }
        .section-title { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600; color: ${colors.primary}; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid ${colors.mediumGray}; }
        .label-text { font-size: 12px; color: ${colors.textMuted}; font-weight: 500; }
        .value-text { font-size: 12px; font-weight: 600; color: ${colors.primary}; }
        .portfolio-input { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid ${colors.mediumGray}; }
        .portfolio-input:last-child { border-bottom: none; }
        .portfolio-bar { height: 6px; border-radius: 3px; background: ${colors.mediumGray}; flex: 1; overflow: hidden; }
        .portfolio-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
        .toggle-switch { position: relative; width: 40px; height: 22px; background: ${colors.mediumGray}; border-radius: 11px; cursor: pointer; transition: background 0.3s ease; }
        .toggle-switch.active { background: ${colors.success}; }
        .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle-switch.active::after { transform: translateX(18px); }
        .warning-box { background: #fef9e7; border: 1px solid ${colors.warning}; border-radius: 6px; padding: 12px 16px; margin-top: 14px; }
        .danger-box { background: #fdf2f2; border: 1px solid ${colors.danger}; border-radius: 6px; padding: 12px 16px; margin-top: 14px; }
        .info-box { background: #e8f4fc; border: 1px solid #4a9fd4; border-radius: 6px; padding: 12px 16px; margin-top: 14px; }
      `}</style>
      
      {/* Header */}
      <div className="pensum-header">
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PensumLogo />
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Verdipapirbelåning Kalkulator
            </h1>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>Beregn opplåning, reinvestering og kontantuttak</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px 40px' }}>
        {/* Modus-velger - 3 knapper */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <button className={`btn-modus ${modus === 'reinvestering' ? 'active' : 'inactive'}`} onClick={() => setModus('reinvestering')}>
            📈 Reinvestering
          </button>
          <button className={`btn-modus ${modus === 'kontantuttak' ? 'active' : 'inactive'}`} onClick={() => setModus('kontantuttak')}>
            💵 Kontantuttak
          </button>
          <button className={`btn-modus ${modus === 'maksbelaning' ? 'active' : 'inactive'}`} onClick={() => setModus('maksbelaning')}>
            🚀 Maks belåning
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Inndata-panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Porteføljesammensetning */}
            <div className="pensum-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 className="section-title" style={{ margin: 0, padding: 0, border: 'none' }}>Egenkapital (EK)</h2>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['enkel', 'sammensetning'].map(mode => (
                    <button key={mode} onClick={() => setPortefoljeMode(mode)}
                      style={{
                        padding: '5px 10px', fontSize: '10px',
                        border: `1px solid ${portefoljeMode === mode ? colors.primary : '#d0d7e0'}`,
                        background: portefoljeMode === mode ? colors.primary : colors.white,
                        color: portefoljeMode === mode ? colors.white : colors.textMuted,
                        borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
                      }}
                    >
                      {mode === 'enkel' ? 'Enkel' : 'Sammensatt'}
                    </button>
                  ))}
                </div>
              </div>

              {portefoljeMode === 'enkel' ? (
                <>
                  <div style={{ marginBottom: '14px', padding: '8px 10px', background: colors.lightGray, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '500' }}>Enkeltaksjer diversifisert?</div>
                      <div style={{ fontSize: '9px', color: colors.textMuted }}>{enkeltaksjerDiversifisert ? '60% LTV' : '20% LTV'}</div>
                    </div>
                    <div className={`toggle-switch ${enkeltaksjerDiversifisert ? 'active' : ''}`} onClick={() => setEnkeltaksjerDiversifisert(!enkeltaksjerDiversifisert)} />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="label-text" style={{ display: 'block', marginBottom: '6px' }}>Aktivaklasse</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      {Object.entries(aktivaklasser).map(([key, value]) => (
                        <button key={key} onClick={() => setAktivaklasse(key)}
                          style={{
                            padding: '6px 4px', border: `2px solid ${aktivaklasse === key ? value.farge : '#d0d7e0'}`,
                            borderRadius: '5px', background: aktivaklasse === key ? `${value.farge}10` : colors.white,
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px'
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: '500' }}>{value.navn}</span>
                          <span style={{ fontSize: '9px', color: colors.textMuted }}>{value.maksLTV}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="label-text">Egenkapital</span>
                      <span className="value-text">{formatNOK(portefoljeVerdi)}</span>
                    </label>
                    <input type="number" value={portefoljeVerdi} onChange={(e) => setPortefoljeVerdi(Number(e.target.value) || 0)} step={100000} min={0} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '10px', padding: '8px 10px', background: `${colors.primaryLight}10`, borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${colors.primaryLight}30` }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '500' }}>Enkeltaksjer diversifisert?</div>
                      <div style={{ fontSize: '9px', color: colors.textMuted }}>{enkeltaksjerDiversifisert ? '60%' : '20%'} LTV</div>
                    </div>
                    <div className={`toggle-switch ${enkeltaksjerDiversifisert ? 'active' : ''}`} onClick={() => setEnkeltaksjerDiversifisert(!enkeltaksjerDiversifisert)} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    {Object.entries(aktivaklasser).map(([key, value]) => {
                      const verdi = portefolje[key];
                      const andel = portefoljeBeregning.totalVerdi > 0 ? (verdi / portefoljeBeregning.totalVerdi) * 100 : 0;
                      return (
                        <div key={key} className="portfolio-input">
                          <div style={{ width: '90px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '500' }}>{value.navn}</div>
                            <div style={{ fontSize: '9px', color: colors.textMuted }}>{value.maksLTV}%</div>
                          </div>
                          <input type="number" value={verdi || ''} onChange={(e) => updatePortefolje(key, e.target.value)} placeholder="0" style={{ width: '100px', fontSize: '12px', padding: '8px 10px' }} step={100000} />
                          <div className="portfolio-bar">
                            <div className="portfolio-bar-fill" style={{ width: `${andel}%`, background: value.farge }} />
                          </div>
                          <div style={{ width: '35px', textAlign: 'right', fontSize: '10px', color: colors.textMuted }}>{andel.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{ background: colors.lightGray, padding: '10px 12px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>Total egenkapital</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.primary }}>{formatNOK(portefoljeBeregning.totalVerdi)}</span>
                  </div>
                  
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: `${colors.accent}10`, borderRadius: '5px', border: `1px solid ${colors.accent}40` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>Vektet maks LTV</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: colors.accent }}>{formatProsent(portefoljeBeregning.vektetMaksLTV)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lånerente */}
            <div className="pensum-card">
              <h2 className="section-title">Lånerente</h2>
              
              <div style={{ marginBottom: '14px' }}>
                <label className="label-text" style={{ display: 'block', marginBottom: '6px' }}>Valuta / Baserente</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {Object.entries(baserenter).map(([key, value]) => (
                    <button key={key} className={`valuta-btn ${valuta === key ? 'selected' : ''}`} onClick={() => setValuta(key)}>
                      <span style={{ fontSize: '12px' }}>{key}</span>
                      <span style={{ fontSize: '9px', color: colors.textMuted }}>{value.rate.toFixed(2)}%</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="label-text">Rentepåslag</span>
                  <span className="value-text">+{rentepaaslag.toFixed(2)}%</span>
                </label>
                <input type="range" min="0" max="3" step="0.05" value={rentepaaslag} onChange={(e) => setRentepaaslag(Number(e.target.value))} />
              </div>
              
              <div style={{ background: colors.lightGray, padding: '12px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>Total lånerente</div>
                  <div style={{ fontSize: '9px', color: colors.textMuted }}>{valgtValuta.rate.toFixed(2)}% + {rentepaaslag.toFixed(2)}%</div>
                </div>
                <span style={{ fontSize: '18px', fontWeight: '700', color: colors.danger }}>{totalRente.toFixed(2)}%</span>
              </div>
            </div>

            {/* Parametere */}
            <div className="pensum-card">
              <h2 className="section-title">Parametere</h2>
              
              {modus !== 'maksbelaning' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span className="label-text">Belåningsgrad (LTV)</span>
                    <span className="value-text" style={{ color: ltvOverMaks ? colors.danger : colors.primary }}>
                      {ltv}%{ltvOverMaks && <span style={{ fontWeight: '400', fontSize: '10px' }}> → {portefoljeBeregning.vektetMaksLTV.toFixed(0)}%</span>}
                    </span>
                  </label>
                  <input type="range" min="0" max="100" value={ltv} onChange={(e) => setLtv(Number(e.target.value))} />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="label-text">Forventet avkastning (p.a.)</span>
                  <span className="value-text" style={{ color: colors.success }}>{reinvesteringAvkastning}%</span>
                </label>
                <input type="range" min="0" max="20" step="0.5" value={reinvesteringAvkastning} onChange={(e) => setReinvesteringAvkastning(Number(e.target.value))} />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span className="label-text">Tidshorisont</span>
                  <span className="value-text">{tidshorisont} år</span>
                </label>
                <input type="range" min="1" max="20" value={tidshorisont} onChange={(e) => setTidshorisont(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Resultater */}
          <div>
            {/* REINVESTERING */}
            {modus === 'reinvestering' && (
              <div className="pensum-card" style={{ marginBottom: '16px' }}>
                <h2 className="section-title">📈 Reinvesteringsanalyse</h2>
                <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '14px', padding: '8px 12px', background: colors.lightGray, borderRadius: '5px' }}>
                  Låner {formatProsent(beregninger.faktiskLTV)} av pantet ({formatNOK(beregninger.initieltLan)}) og reinvesterer i samme aktiva. Simulering over {tidshorisont} år.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                  <div className="result-box">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Lånebeløp</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>{formatNOK(beregninger.initieltLan)}</div>
                  </div>
                  <div className="result-box highlight">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Total eksponering</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.accent }}>{formatNOK(beregninger.totalEksponering)}</div>
                  </div>
                  <div className="result-box danger">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Rentekostnad ({tidshorisont} år)</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.danger }}>{formatNOK(beregninger.totalRentekostnad)}</div>
                  </div>
                  <div className="result-box success">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Portefølje år {tidshorisont}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.success }}>{formatNOK(beregninger.sluttPortefolje)}</div>
                  </div>
                </div>

                {beregninger.initieltLan > 0 && (
                  <div style={{ background: colors.lightGray, borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>Nettoresultat over {tidshorisont} år</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Uten belåning</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textMuted }}>{formatNOK(beregninger.avkastningUtenLan)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Med belåning (netto)</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{formatNOK(beregninger.nettoGevinst)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Merverdi</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: beregninger.merverdi > 0 ? colors.success : colors.danger }}>
                          {beregninger.merverdi > 0 ? '+' : ''}{formatNOK(beregninger.merverdi)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Graf */}
                {beregninger.arligData.length > 0 && (
                  <div style={{ height: '240px', marginBottom: '14px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={beregninger.arligData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.mediumGray} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: colors.textMuted }} />
                        <YAxis tickFormatter={formatNOKShort} tick={{ fontSize: 9, fill: colors.textMuted }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Area type="monotone" dataKey="portefoljeVerdi" name="Med belåning" stroke={colors.primary} strokeWidth={2} fill="url(#colorPort)" />
                        <Line type="monotone" dataKey="portefoljeUtenLan" name="Uten belåning" stroke={colors.textMuted} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey="totalLan" name="Lån" stroke={colors.danger} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Tabell toggle */}
                <button onClick={() => setVisDetaljer(!visDetaljer)} style={{ background: 'none', border: `1px solid ${colors.primary}`, borderRadius: '4px', padding: '6px 12px', color: colors.primary, cursor: 'pointer', fontSize: '10px', fontWeight: '600', marginBottom: visDetaljer ? '10px' : 0 }}>
                  {visDetaljer ? '▼ Skjul tabell' : '▶ Vis tabell'}
                </button>

                {visDetaljer && beregninger.arligData.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>År</th><th>Portefølje</th><th>Avkastning</th><th>Rentekost.</th><th>Akk. rente</th><th>Netto</th><th>LTV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beregninger.arligData.filter(d => d.ar > 0).map(d => (
                          <tr key={d.ar}>
                            <td>{d.label}</td>
                            <td>{formatNOK(d.portefoljeVerdi)}</td>
                            <td className="positive">+{formatNOK(d.avkastning)}</td>
                            <td className="negative">−{formatNOK(d.rentekostnad)}</td>
                            <td className="negative">−{formatNOK(d.akkumulertRentekostnad)}</td>
                            <td className={d.nettoGevinst >= 0 ? 'positive' : 'negative'}>{d.nettoGevinst >= 0 ? '+' : ''}{formatNOK(d.nettoGevinst)}</td>
                            <td>{formatProsent(d.effektivLTV)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* KONTANTUTTAK */}
            {modus === 'kontantuttak' && (
              <div className="pensum-card" style={{ marginBottom: '16px' }}>
                <h2 className="section-title">💵 Kontantuttaksanalyse</h2>
                <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '14px', padding: '8px 12px', background: colors.lightGray, borderRadius: '5px' }}>
                  Tar ut {formatNOK(beregninger.kontantUttak)} kontant (brukes til annet). Pantet på {formatNOK(portefoljeBeregning.totalVerdi)} forblir investert. 
                  Rentekostnader trekkes fra pantekontoen. Simulering over {tidshorisont} år.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                  <div className="result-box highlight">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Kontantuttak</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.accent }}>{formatNOK(beregninger.kontantUttak)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>Tatt ut ved start</div>
                  </div>
                  <div className="result-box success">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Brutto pant år {tidshorisont}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.success }}>{formatNOK(beregninger.sluttBruttoPant)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>+{formatNOK(beregninger.totalAvkastning)} avkastning</div>
                  </div>
                  <div className="result-box danger">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Rentekostnad ({tidshorisont} år)</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.danger }}>{formatNOK(beregninger.totalRentekostnad)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>{formatNOK(beregninger.rentekostnadArlig)}/år</div>
                  </div>
                  <div className="result-box">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Netto pant år {tidshorisont}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>{formatNOK(beregninger.sluttNettoPant)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>Etter rentekostnader</div>
                  </div>
                </div>

                {beregninger.initieltLan > 0 && (
                  <div style={{ background: colors.lightGray, borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>Oppsummering etter {tidshorisont} år</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Kontant (ute)</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: colors.accent }}>{formatNOK(beregninger.kontantUttak)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Avkastning pant</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: colors.success }}>+{formatNOK(beregninger.totalAvkastning)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Rentekostnader</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: colors.danger }}>−{formatNOK(beregninger.totalRentekostnad)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>Netto gevinst pant</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: beregninger.nettoResultat > 0 ? colors.success : colors.danger }}>
                          {beregninger.nettoResultat > 0 ? '+' : ''}{formatNOK(beregninger.nettoResultat)}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px dashed ${colors.mediumGray}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>Total formue (netto pant + kontant)</span>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>{formatNOK(beregninger.totalFormue)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Graf */}
                {beregninger.arligData.length > 0 && (
                  <div style={{ height: '240px', marginBottom: '14px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={beregninger.arligData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPant" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.success} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.mediumGray} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: colors.textMuted }} />
                        <YAxis tickFormatter={formatNOKShort} tick={{ fontSize: 9, fill: colors.textMuted }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Area type="monotone" dataKey="bruttoPantVerdi" name="Brutto pant" stroke={colors.success} strokeWidth={2} fill="url(#colorPant)" />
                        <Line type="monotone" dataKey="nettoPantVerdi" name="Netto pant" stroke={colors.primary} strokeWidth={2} dot={false} />
                        <Bar dataKey="akkumulertRente" name="Akk. rentekost." fill={colors.danger} opacity={0.5} radius={[2, 2, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <button onClick={() => setVisDetaljer(!visDetaljer)} style={{ background: 'none', border: `1px solid ${colors.primary}`, borderRadius: '4px', padding: '6px 12px', color: colors.primary, cursor: 'pointer', fontSize: '10px', fontWeight: '600', marginBottom: visDetaljer ? '10px' : 0 }}>
                  {visDetaljer ? '▼ Skjul tabell' : '▶ Vis tabell'}
                </button>

                {visDetaljer && beregninger.arligData.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>År</th><th>Brutto pant</th><th>Avkastning</th><th>Rentekost.</th><th>Akk. rente</th><th>Netto pant</th><th>Eff. LTV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beregninger.arligData.filter(d => d.ar > 0).map(d => (
                          <tr key={d.ar}>
                            <td>{d.label}</td>
                            <td>{formatNOK(d.bruttoPantVerdi)}</td>
                            <td className="positive">+{formatNOK(d.avkastning)}</td>
                            <td className="negative">−{formatNOK(d.rentekostnad)}</td>
                            <td className="negative">−{formatNOK(d.akkumulertRente)}</td>
                            <td style={{ fontWeight: '500' }}>{formatNOK(d.nettoPantVerdi)}</td>
                            <td>{formatProsent(d.effektivLTV)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Investeringsscenario */}
                {beregninger.initieltLan > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => setVisInvesteringsscenario(!visInvesteringsscenario)}
                      style={{
                        width: '100%', padding: '12px 16px', 
                        background: visInvesteringsscenario ? `${colors.accent}15` : colors.lightGray,
                        border: `2px solid ${visInvesteringsscenario ? colors.accent : colors.mediumGray}`,
                        borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'Open Sans', fontSize: '13px', fontWeight: '600', color: colors.primary
                      }}
                    >
                      <span>🏠 Investeringsscenario: Hva om kontantuttaket investeres?</span>
                      <span style={{ fontSize: '18px' }}>{visInvesteringsscenario ? '−' : '+'}</span>
                    </button>
                    
                    {visInvesteringsscenario && (() => {
                      // Beregn investeringsscenario
                      const kontant = beregninger.kontantUttak;
                      const invAvk = investeringAvkastning / 100;
                      const sluttVerdiInvestering = kontant * Math.pow(1 + invAvk, tidshorisont);
                      const avkastningInvestering = sluttVerdiInvestering - kontant;
                      
                      // Total formue med investering
                      const totalFormueMedInvestering = beregninger.sluttNettoPant + sluttVerdiInvestering;
                      const totalFormueUtenInvestering = beregninger.totalFormue; // netto pant + kontant (ubrukt)
                      const merverdiInvestering = totalFormueMedInvestering - totalFormueUtenInvestering;
                      
                      // Årlig data for investering
                      const investeringData = [];
                      let invVerdi = kontant;
                      for (let ar = 0; ar <= tidshorisont; ar++) {
                        investeringData.push({
                          ar,
                          label: ar === 0 ? 'Start' : `År ${ar}`,
                          investering: invVerdi,
                          pant: beregninger.arligData[ar]?.nettoPantVerdi || 0,
                          totalFormue: invVerdi + (beregninger.arligData[ar]?.nettoPantVerdi || 0)
                        });
                        if (ar < tidshorisont) {
                          invVerdi = invVerdi * (1 + invAvk);
                        }
                      }
                      
                      return (
                        <div style={{ marginTop: '12px', padding: '16px', background: `${colors.accent}08`, borderRadius: '8px', border: `1px solid ${colors.accent}30` }}>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: colors.primary, marginBottom: '10px' }}>
                              Velg investeringstype og forventet avkastning
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                              <button
                                onClick={() => { setInvesteringstype('eiendom'); setInvesteringAvkastning(12); }}
                                style={{
                                  flex: 1, padding: '10px', border: `2px solid ${investeringstype === 'eiendom' ? colors.accent : colors.mediumGray}`,
                                  borderRadius: '6px', background: investeringstype === 'eiendom' ? `${colors.accent}15` : colors.white,
                                  cursor: 'pointer', textAlign: 'center'
                                }}
                              >
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>🏠</div>
                                <div style={{ fontSize: '11px', fontWeight: '600' }}>Eiendom</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted }}>Typisk 8-15% p.a.</div>
                              </button>
                              <button
                                onClick={() => { setInvesteringstype('pe'); setInvesteringAvkastning(15); }}
                                style={{
                                  flex: 1, padding: '10px', border: `2px solid ${investeringstype === 'pe' ? colors.accent : colors.mediumGray}`,
                                  borderRadius: '6px', background: investeringstype === 'pe' ? `${colors.accent}15` : colors.white,
                                  cursor: 'pointer', textAlign: 'center'
                                }}
                              >
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>📈</div>
                                <div style={{ fontSize: '11px', fontWeight: '600' }}>Private Equity</div>
                                <div style={{ fontSize: '9px', color: colors.textMuted }}>Typisk 12-20% p.a.</div>
                              </button>
                            </div>
                            
                            <div>
                              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Forventet avkastning {investeringstype === 'eiendom' ? 'eiendom' : 'PE'}</span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: colors.accent }}>{investeringAvkastning}%</span>
                              </label>
                              <input 
                                type="range" min="5" max="25" step="0.5" 
                                value={investeringAvkastning} 
                                onChange={(e) => setInvesteringAvkastning(Number(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ background: colors.white, padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '2px' }}>INVESTERT BELØP</div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: colors.primary }}>{formatNOK(kontant)}</div>
                            </div>
                            <div style={{ background: colors.white, padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '2px' }}>VERDI ETTER {tidshorisont} ÅR</div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: colors.success }}>{formatNOK(sluttVerdiInvestering)}</div>
                            </div>
                            <div style={{ background: colors.white, padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '2px' }}>AVKASTNING</div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: colors.success }}>+{formatNOK(avkastningInvestering)}</div>
                            </div>
                          </div>
                          
                          <div style={{ background: colors.white, padding: '14px', borderRadius: '6px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, marginBottom: '10px' }}>TOTAL FORMUE ETTER {tidshorisont} ÅR</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div>
                                <div style={{ fontSize: '10px', color: colors.textMuted }}>Netto pant (fond)</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>{formatNOK(beregninger.sluttNettoPant)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: colors.textMuted }}>{investeringstype === 'eiendom' ? 'Eiendomsverdi' : 'PE-verdi'}</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.accent }}>{formatNOK(sluttVerdiInvestering)}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `2px solid ${colors.accent}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700' }}>Total formue</span>
                                <span style={{ fontSize: '20px', fontWeight: '700', color: colors.accent }}>{formatNOK(totalFormueMedInvestering)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ fontSize: '10px', color: colors.textMuted }}>vs. kontant ubrukt ({formatNOK(totalFormueUtenInvestering)})</span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: merverdiInvestering > 0 ? colors.success : colors.danger }}>
                                  {merverdiInvestering > 0 ? '+' : ''}{formatNOK(merverdiInvestering)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mini-tabell */}
                          <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: '10px' }}>
                              <thead>
                                <tr>
                                  <th>År</th>
                                  <th>Netto pant</th>
                                  <th>{investeringstype === 'eiendom' ? 'Eiendom' : 'PE'}</th>
                                  <th>Total formue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {investeringData.map(d => (
                                  <tr key={d.ar}>
                                    <td>{d.label}</td>
                                    <td>{formatNOK(d.pant)}</td>
                                    <td style={{ color: colors.accent }}>{formatNOK(d.investering)}</td>
                                    <td style={{ fontWeight: '600' }}>{formatNOK(d.totalFormue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div style={{ marginTop: '12px', padding: '10px', background: '#fef9e7', borderRadius: '6px', fontSize: '10px', color: colors.textMuted }}>
                            <strong>⚠️ Merk:</strong> {investeringstype === 'eiendom' 
                              ? 'Eiendomsavkastning inkluderer typisk leieinntekter og verdistigning. Tallene tar ikke hensyn til vedlikehold, skatt, eller illikviditet.' 
                              : 'PE-avkastning er ofte J-kurve-formet (negativ først, positiv senere). Tallene er forenklede og tar ikke hensyn til kapitalkall, distribusjoner, eller illikviditet.'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* MAKS BELÅNING MED REINVESTERING */}
            {modus === 'maksbelaning' && (
              <div className="pensum-card" style={{ marginBottom: '16px' }}>
                <h2 className="section-title">🚀 Maks belåning med reinvestering</h2>
                <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '14px', padding: '10px 14px', background: colors.lightGray, borderRadius: '5px', lineHeight: '1.5' }}>
                  <strong>Konsept:</strong> Du låner maks LTV, kjøper samme type aktiva, legger det nye kjøpet inn i pant, og kan dermed låne enda mer. 
                  Dette gjentas til gjeld og pant balanserer seg ved maks LTV.<br/><br/>
                  <strong>Formel:</strong> Maks gjeld = (LTV / (1−LTV)) × Egenkapital<br/>
                  <strong>Eksempel:</strong> Ved {formatProsent(maksBelaningBeregning.ltv)} LTV og {formatNOK(portefoljeBeregning.totalVerdi)} egenkapital → Maks gjeld = {formatNOK(maksBelaningBeregning.maksGjeld)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div className="result-box">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Egenkapital (startpant)</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.primary }}>{formatNOK(portefoljeBeregning.totalVerdi)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>Det du faktisk eier</div>
                  </div>
                  <div className="result-box highlight">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Maks gjeld</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.accent }}>{formatNOK(maksBelaningBeregning.maksGjeld)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>Ved {formatProsent(maksBelaningBeregning.ltv)} LTV</div>
                  </div>
                  <div className="result-box success">
                    <div style={{ fontSize: '9px', color: colors.textMuted, marginBottom: '3px', textTransform: 'uppercase' }}>Total eksponering</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.success }}>{formatNOK(maksBelaningBeregning.totalEksponering)}</div>
                    <div style={{ fontSize: '9px', color: colors.textMuted }}>EK + Gjeld</div>
                  </div>
                </div>

                {/* Tabell - År for år utvikling */}
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: colors.primary, marginBottom: '10px' }}>
                  Utvikling over tid (ved {reinvesteringAvkastning}% avkastning, {totalRente.toFixed(1)}% rente)
                </h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>År</th>
                        <th>Egenkapital</th>
                        <th>Gjeld</th>
                        <th>Total eksponering</th>
                        <th style={{ width: '70px' }}>LTV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maksBelaningBeregning.arligData.map(d => (
                        <tr key={d.ar}>
                          <td>{d.label}</td>
                          <td style={{ color: colors.primary, fontWeight: '500' }}>{formatNOK(d.egenkapital)}</td>
                          <td style={{ color: colors.danger }}>{formatNOK(d.gjeld)}</td>
                          <td style={{ color: colors.success, fontWeight: '500' }}>{formatNOK(d.totalEksponering)}</td>
                          <td>{formatProsent(d.ltv)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="warning-box" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span>⚠️</span>
                    <div style={{ fontSize: '11px', color: colors.textMuted, lineHeight: '1.5' }}>
                      <strong>Viktig:</strong> Dette er teoretisk maksimum. I praksis begrenses belåning av kredittramme, interne limits, konsentrasjonsgrenser og risikokrav. 
                      Høy belåning medfører betydelig risiko ved markedsnedgang (margin call).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LTV-oversikt */}
            <div className="pensum-card">
              <h3 className="section-title" style={{ marginBottom: '10px' }}>Maks LTV per aktivaklasse</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {Object.entries(aktivaklasser).map(([key, value]) => (
                  <div key={key} style={{ textAlign: 'center', padding: '8px 4px', background: colors.lightGray, borderRadius: '5px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: value.farge }}>{value.maksLTV}%</div>
                    <div style={{ fontSize: '8px', color: colors.textMuted }}>{value.navn}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '9px', color: colors.textMuted, fontStyle: 'italic' }}>
                * Enkeltaksjer: 20% konsentrert / 60% diversifisert (maks 20% per aksje)
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '12px 14px', background: colors.white, borderRadius: '6px', fontSize: '9px', color: colors.textMuted, lineHeight: '1.4', border: `1px solid ${colors.mediumGray}` }}>
              <strong>Forutsetninger:</strong> Konstant LTV (ingen rebalansering), lineær avkastning, ingen skatt/gebyrer/valutaeffekter. 
              Baserenter er veiledende. Kontakt Pensum Asset Management for fullstendig analyse.
            </div>
          </div>
        </div>

        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: `1px solid ${colors.mediumGray}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: colors.textMuted, flexWrap: 'wrap', gap: '10px' }}>
          <div>© {new Date().getFullYear()} Pensum Asset Management AS</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Frøyas gate 15, 0273 Oslo</span>
            <span>+47 23 89 68 44</span>
            <span>post@pensumgroup.no</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PensumVerdipapirbelaning;
