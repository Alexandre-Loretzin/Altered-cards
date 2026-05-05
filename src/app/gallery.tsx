'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CardData {
  id: string;
  family: string;
  product: string;
  faction: string;
  slot: number;
  rarity: string;
  image: Record<string, string>;
}

interface CardsJSON {
  cards: CardData[];
  hasJpgDir: boolean;
  fetchedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FACTIONS: Record<string, { name: string; color: string }> = {
  AX: { name: 'Axiom', color: '#3b82f6' },
  BR: { name: 'Bravos', color: '#ef4444' },
  LY: { name: 'Lyra', color: '#eab308' },
  MU: { name: 'Muna', color: '#22c55e' },
  OR: { name: 'Ordis', color: '#a855f7' },
  YZ: { name: 'Yzmir', color: '#6b7280' },
};

const RARITIES: Record<string, { label: string; short: string; color: string }> = {
  C: { label: 'Commune', short: 'C', color: '#9ca3af' },
  R1: { label: 'Rare', short: 'R', color: '#f59e0b' },
  R2: { label: 'Rare Hors-Faction', short: 'RF', color: '#ec4899' },
  HERO: { label: 'Héro', short: 'H', color: '#8b5cf6' },
};

const LANGUAGES = [
  { code: 'fr_FR', label: 'FR', flag: '🇫🇷' },
  { code: 'en_US', label: 'EN', flag: '🇬🇧' },
  { code: 'es_ES', label: 'ES', flag: '🇪🇸' },
  { code: 'de_DE', label: 'DE', flag: '🇩🇪' },
  { code: 'it_IT', label: 'IT', flag: '🇮🇹' },
];

const BASE_URL =
  'https://raw.githubusercontent.com/AlteredEquinox/cards-nonunique/main/assets/FUGUE/CARDS';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function imgUrl(id: string, lang: string, file: string, jpgDir: boolean) {
  // id is like ALT_FUGUE_A_AX_146_C — strip rarity suffix for folder path
  const folder = id.replace(/_(?:C|R1|R2|HERO)$/, '');
  return jpgDir
    ? `${BASE_URL}/${folder}/JPG/${lang}/${file}`
    : `${BASE_URL}/${folder}/${lang}/${file}`;
}

function bestLang(card: CardData, wanted: string): string {
  if (card.image[wanted]) return wanted;
  return Object.keys(card.image)[0] ?? wanted;
}

/* ------------------------------------------------------------------ */
/*  Gallery                                                            */
/* ------------------------------------------------------------------ */

export function Gallery({ data }: { data: CardsJSON }) {
  const [faction, setFaction] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  const [rarity, setRarity] = useState<string | null>(null);
  const [lang, setLang] = useState('fr_FR');
  const [search, setSearch] = useState('');
  const [openCard, setOpenCard] = useState<CardData | null>(null);

  /* ---- derived ---- */
  const availableLangs = useMemo(() => {
    const s = new Set<string>();
    data.cards.forEach((c) => Object.keys(c.image).forEach((l) => s.add(l)));
    return LANGUAGES.filter((l) => s.has(l.code));
  }, [data.cards]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.cards.filter((c) => {
      if (faction && c.faction !== faction) return false;
      if (product && c.product !== product) return false;
      if (rarity && c.rarity !== rarity) return false;
      if (q && !c.id.toLowerCase().includes(q) && !c.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.cards, faction, product, rarity, search]);

  /* ---- group by family for display ---- */
  const families = useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const card of filtered) {
      const key = `${card.family}_${card.product}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [filtered]);

  /* ---- modal helpers ---- */
  const siblings = useMemo(() => {
    if (!openCard) return [];
    const key = `${openCard.family}_${openCard.product}`;
    return families.get(key) ?? [openCard];
  }, [openCard, families]);

  const open = (card: CardData) => {
    setOpenCard(card);
  };
  const close = () => setOpenCard(null);

  /* ---- keyboard ---- */
  useEffect(() => {
    if (!openCard) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') {
        const idx = siblings.findIndex((c) => c.id === openCard.id);
        if (idx < siblings.length - 1) setOpenCard(siblings[idx + 1]);
      }
      if (e.key === 'ArrowLeft') {
        const idx = siblings.findIndex((c) => c.id === openCard.id);
        if (idx > 0) setOpenCard(siblings[idx - 1]);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  /* ---- render ---- */
  return (
    <div className="min-h-screen">
      {/* ====================== HEADER ====================== */}
      <header className="sticky top-0 z-40 bg-[#050507]/80 backdrop-blur-xl border-b border-white/[.07]">
        <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight select-none">
              <span className="text-white/50">ALTERED</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                FUGUE
              </span>
            </h1>
            <span className="text-xs sm:text-sm text-white/30 tabular-nums">
              {filtered.length}&nbsp;/&nbsp;{data.cards.length} cartes
            </span>
          </div>

          {/* Language pills */}
          <div className="flex flex-wrap gap-1.5">
            {availableLangs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  lang === l.code
                    ? 'bg-white text-gray-900 shadow-md shadow-white/10'
                    : 'bg-white/[.07] text-white/50 hover:bg-white/[.12] hover:text-white/70'
                }`}
              >
                {l.flag}&ensp;{l.label}
              </button>
            ))}
          </div>

          {/* Faction pills */}
          <div className="flex flex-wrap gap-1.5">
            <Pill active={!faction} onClick={() => setFaction(null)}>
              Toutes
            </Pill>
            {Object.entries(FACTIONS).map(([code, f]) => (
              <Pill
                key={code}
                active={faction === code}
                color={f.color}
                onClick={() => setFaction(faction === code ? null : code)}
              >
                {f.name}
              </Pill>
            ))}
          </div>

          {/* Rarity pills */}
          <div className="flex flex-wrap gap-1.5">
            <Pill active={!rarity} onClick={() => setRarity(null)}>
              Toutes raretés
            </Pill>
            {Object.entries(RARITIES).map(([code, r]) => (
              <Pill
                key={code}
                active={rarity === code}
                color={r.color}
                onClick={() => setRarity(rarity === code ? null : code)}
              >
                {r.label}
              </Pill>
            ))}
          </div>

          {/* Product toggle + search */}
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden border border-white/[.08] shrink-0">
              {['A+B', 'A', 'B'].map((label) => {
                const val = label === 'A+B' ? null : label;
                return (
                  <button
                    key={label}
                    onClick={() => setProduct(product === val ? null : val)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                      product === val
                        ? 'bg-white/15 text-white'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Rechercher une carte…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-white/[.06] border border-white/[.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
        </div>
      </header>

      {/* ====================== GRID ====================== */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <p className="text-center py-24 text-white/25 text-sm">Aucune carte trouvée</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {filtered.map((card) => (
              <CardThumb
                key={card.id}
                card={card}
                lang={lang}
                hasJpgDir={data.hasJpgDir}
                onClick={() => open(card)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ====================== MODAL ====================== */}
      {openCard && (
        <Modal
          card={openCard}
          siblings={siblings}
          lang={lang}
          hasJpgDir={data.hasJpgDir}
          onSelect={setOpenCard}
          onClose={close}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Pill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
        active
          ? 'text-white shadow-md'
          : 'bg-white/[.07] text-white/50 hover:bg-white/[.12] hover:text-white/70'
      }`}
      style={active ? { backgroundColor: color ?? '#fff', color: color ? '#fff' : '#111' } : {}}
    >
      {children}
    </button>
  );
}

/* ---------- Card thumbnail ---------- */

function CardThumb({
  card,
  lang,
  hasJpgDir,
  onClick,
}: {
  card: CardData;
  lang: string;
  hasJpgDir: boolean;
  onClick: () => void;
}) {
  const l = bestLang(card, lang);
  const file = card.image[l];
  const src = file ? imgUrl(card.id, l, file, hasJpgDir) : null;
  const faction = FACTIONS[card.faction];
  const rarityInfo = RARITIES[card.rarity];

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-white/[.03] border border-white/[.06] hover:border-white/20 transition-all duration-300 hover:scale-[1.04] hover:shadow-xl hover:shadow-black/40 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      style={{ aspectRatio: '745 / 1040' }}
    >
      {/* skeleton */}
      {!loaded && !error && <div className="absolute inset-0 card-skeleton" />}

      {src && !error ? (
        <img
          src={src}
          alt={card.id}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/15 text-[10px]">
          {card.id.replace('ALT_FUGUE_', '')}
        </div>
      )}

      {/* Rarity badge */}
      {rarityInfo && (
        <span
          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md"
          style={{ backgroundColor: rarityInfo.color }}
        >
          {rarityInfo.short}
        </span>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: faction?.color }} />
          <span className="text-[11px] font-semibold text-white/90 truncate">
            {faction?.name} · {card.product}{card.slot}
          </span>
        </div>
        <span className="text-[10px] text-white/40 mt-0.5 block">
          {rarityInfo?.label}
        </span>
      </div>

      {/* Faction accent line */}
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: faction?.color }}
      />
    </button>
  );
}

/* ---------- Modal ---------- */

function Modal({
  card,
  siblings,
  lang,
  hasJpgDir,
  onSelect,
  onClose,
}: {
  card: CardData;
  siblings: CardData[];
  lang: string;
  hasJpgDir: boolean;
  onSelect: (c: CardData) => void;
  onClose: () => void;
}) {
  const faction = FACTIONS[card.faction];
  const rarityInfo = RARITIES[card.rarity];
  const backdropRef = useRef<HTMLDivElement>(null);
  const l = bestLang(card, lang);
  const file = card.image[l];
  const src = file ? imgUrl(card.id, l, file, hasJpgDir) : '';
  const vi = siblings.findIndex((c) => c.id === card.id);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative max-w-md w-full">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/40 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[.08]">
          <img
            src={src}
            alt={card.id}
            className="w-full"
            style={{ aspectRatio: '745 / 1040' }}
          />

          {/* Nav arrows */}
          {siblings.length > 1 && (
            <>
              <NavBtn
                dir="left"
                disabled={vi <= 0}
                onClick={() => vi > 0 && onSelect(siblings[vi - 1])}
              />
              <NavBtn
                dir="right"
                disabled={vi >= siblings.length - 1}
                onClick={() => vi < siblings.length - 1 && onSelect(siblings[vi + 1])}
              />
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 text-center space-y-2">
          <h2 className="text-base font-bold text-white tracking-wide">
            {card.family} · {card.product}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
              style={{ backgroundColor: faction?.color }}
            >
              {faction?.name}
            </span>
            {rarityInfo && (
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                style={{ backgroundColor: rarityInfo.color }}
              >
                {rarityInfo.label}
              </span>
            )}
          </div>

          {/* Variant dots */}
          {siblings.length > 1 && (
            <div className="flex justify-center gap-1.5 pt-1">
              {siblings.map((s) => {
                const ri = RARITIES[s.rarity];
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    title={ri?.label}
                    className={`w-3 h-3 rounded-full transition-all border-2 ${
                      s.id === card.id ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: ri?.color ?? '#666' }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 ${
        dir === 'left' ? 'left-2' : 'right-2'
      } w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white text-lg disabled:opacity-20 hover:bg-black/70 transition-all`}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  );
}
