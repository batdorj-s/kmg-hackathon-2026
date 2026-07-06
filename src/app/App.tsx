import { useState, useEffect, useRef, createContext, useContext, Component } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import imgLogoWhite from "../imports/ConvenienceStoreApp/7b55f6acb463e894cdce1c9f059b2cb0057e78f8.png";
import csSvg from "../imports/ConvenienceStoreApp/svg-9r7nhenckt";
import navSvg from "../imports/NavigationIconBar/svg-o89qfq2y3f";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import {
  Home, Gamepad2, ShoppingBag, Gift, User,
  Zap, ChevronRight, Bell, MapPin, Clock,
  CheckCircle, Lock, RotateCcw, Search,
  QrCode, Trophy, Crown, Medal, Star,
  Package, CreditCard, Store, Settings,
  Headphones, Pencil, Wallet, Sparkles,
  Heart, Tag, Plus, ListChecks, Ticket,
  Sun, Sunset, Moon, Coffee, Flame,
  Target, Cake, ArrowRight, Minus,
  Croissant, Cookie, Donut, LayoutGrid, X, Wheat, Trash2,
  Brain, Share2, HelpCircle, Shuffle, Lightbulb, Dot,
  LogOut, ChevronLeft, Truck,
} from "lucide-react";
import type { User as ApiUser } from "../lib/api";
import { createUser, getLeaderboard, saveGameScore, addXp, updateLastActive, subscribeLeaderboard } from "../lib/api";
import { NicknameModal } from "../components/NicknameModal";
import CakeViewer3D from "../components/CakeViewer3D";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const H = {
  primary:   "#0E5C37",
  secondary: "#18472D",
  bg:        "#F4EFD8",
  card:      "#FAFAF8",
  text:      "#2F2F2F",
  muted:     "#6B6B5A",
  accent:    "#D6CFA8",
  peach:     "#F7D8CB",
  pink:      "#E94D72",
  gold:      "#F6B623",
  border:    "rgba(14,92,55,0.09)",
};
const fontSans    = "var(--font-sans)";
const fontDisplay = "var(--font-display)";
const LOGO_WHITE  = "https://cdn.greensoft.mn/uploads/site/1200/site_config/logo/f1d85076f4b88405078528a89614ec9ac8094dd3.png";

// ─── Design System — single source of truth for cross-screen consistency ───────
// Every screen AND every full-screen game takeover reads these, so the header sits at the
// SAME Y and the transition Home → Game feels seamless (no header "jump"). Never hard-code
// safe-area math per screen — always use these tokens.
const SAFE_TOP    = "calc(env(safe-area-inset-top, 50px) + 24px)";   // Dynamic Island / status bar + header breathing room
const SAFE_BOTTOM = "calc(env(safe-area-inset-bottom, 0px) + 16px)"; // Home indicator + floating dock gap
// Other system rules (implemented via Tailwind so they read the same everywhere):
//   horizontal padding = px-5 (20px) · primary card radius = rounded-3xl (24px) · section gap = 24–32px

// ─── Shadow Tokens — single elevation scale for every card and button ──
const SHADOW_CARD  = "0 2px 8px rgba(14,92,55,0.07)";   // resting cards
const SHADOW_FLOAT = "0 4px 16px rgba(14,92,55,0.10)";  // hover / featured
const SHADOW_CTA   = "0 6px 20px rgba(14,92,55,0.28)";  // primary buttons
const SHADOW_MODAL = "0 12px 32px rgba(14,92,55,0.18)"; // modals / overlays
const SHADOW_TOP   = "0 -6px 24px rgba(14,92,55,0.08)"; // bottom bars (upward)

const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ─── Global App Store (localStorage-persisted client state) ────────────────────
// Single source of truth for everything the user accumulates: points, XP, cart, favourites,
// claimed coupons, read notifications and the daily spin. Survives reloads. The Supabase layer
// (user/leaderboard) stays as-is; this powers the client-visible loyalty loop so games, cart
// and coupons all feel real without depending on a live backend.
// ── Business types (state layer) ──
type CartItem = { pid: number; qty: number; temp?: "hot" | "cool" };
type PlacedOrder = {
  id: string; date: string; items: CartItem[];
  subtotal: number; discount: number; pointsUsed: number; total: number; earned: number;
  store: string; pickup: string; payment: string; coupon: number | null; status: number; placedAt: number;  // status 0..4, unix ms
};
type OrderInput = { subtotal: number; discount: number; pointsUsed: number; total: number; store: string; pickup: string; payment: string; coupon: number | null };
type OrderNotif = { id: number; title: string; body: string; timestamp: number; orderId: string };
type StoreState = {
  points: number; xp: number; cart: CartItem[]; orders: PlacedOrder[];
  favorites: number[]; usedCoupons: number[]; redeemed: number[]; notifRead: number[];
  spinDate: string | null; spinsUsed: number;
  orderNotifs: OrderNotif[]; nextNotifId: number;
  savedItems: CartItem[];
};
const STORE_KEY = "tlj-store-v3";   // bumped: cart is now line items + placed orders
const SPINS_PER_DAY = 3;
const EARN_RATE = 100;              // 1 Upoint per ₮100 spent
const todayStr = () => new Date().toISOString().slice(0, 10);
const DEFAULT_STORE: StoreState = {
  points: 2840, xp: 1240, cart: [], orders: [],
  favorites: [], usedCoupons: [3], redeemed: [], notifRead: [3, 4],
  spinDate: null, spinsUsed: 0,
  orderNotifs: [], nextNotifId: 5,
  savedItems: [],
};
const loadStore = (): StoreState => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const merged = { ...DEFAULT_STORE, ...(raw ? JSON.parse(raw) : {}) };
    // Recover gracefully from corrupt / older-shape persisted data.
    if (!Array.isArray(merged.cart))   merged.cart = [];
    if (!Array.isArray(merged.orders)) merged.orders = [];
    if (!Array.isArray(merged.savedItems)) merged.savedItems = [];
    return merged;
  } catch { return DEFAULT_STORE; }
};
// ── Pure business logic (kept out of components; PRODUCTS resolved at call time) ──
const productPrice = (pid: number) => PRODUCTS.find((p) => p.id === pid)?.price ?? 0;
const cartSubtotal = (cart: CartItem[]) => (Array.isArray(cart) ? cart.reduce((s, it) => s + productPrice(it.pid) * it.qty, 0) : 0);
const cartCountOf  = (cart: CartItem[]) => (Array.isArray(cart) ? cart.reduce((s, it) => s + it.qty, 0) : 0);
const earnedFor    = (total: number) => Math.round(total / EARN_RATE);

type StoreApi = StoreState & {
  spinsLeft: number; cartCount: number; cartTotal: number;
  addReward: (r: { xp?: number; points?: number }) => void;
  addToCart: (pid: number, qty?: number, temp?: "hot" | "cool") => void;
  setQty: (pid: number, qty: number) => void;
  removeItem: (pid: number) => void;
  clearCart: () => void;
  saveForLater: (pid: number) => void;
  moveToCart: (pid: number) => void;
  removeSaved: (pid: number) => void;
  placeOrder: (o: OrderInput) => PlacedOrder;            // atomically: order + rewards + points + coupon
  advanceOrder: (id: string) => void;                    // progress the status tracker
  toggleFav: (id: number) => void;
  useCoupon: (id: number) => void;                       // mark a wallet coupon as used
  redeemReward: (id: number, cost: number) => boolean;   // spend points → false if insufficient
  markAllRead: (ids: number[]) => void;
  useSpin: () => boolean;   // returns false if no spins left today
};
const StoreCtx = createContext<StoreApi | null>(null);
const useStore = (): StoreApi => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
};

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<StoreState>(loadStore);
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ } }, [s]);

  // Auto-advance order statuses + generate notifications.
  useEffect(() => {
    const id = setInterval(() => {
      setS((p) => {
        const now = Date.now();
        let changed = false;
        let notifs = p.orderNotifs;
        let nid = p.nextNotifId;
        const orders = p.orders.map((o) => {
          if (o.status >= 4) return o;
          let cumulative = 0;
          for (let i = 0; i < ORDER_STEP_DURATIONS.length && i <= o.status; i++) cumulative += ORDER_STEP_DURATIONS[i];
          if (now - o.placedAt >= cumulative) {
            changed = true;
            const target = Math.min(4, o.status + 1);
            const msgs: Record<number, { title: string; body: string }> = {
              1: { title: "Захиалга бэлтгэгдэж эхэллээ", body: `#${o.id}` },
              2: { title: "Захиалга жигнэгдэж байна", body: `#${o.id}` },
              3: { title: "Чаналр шалгалтанд орлоо", body: `#${o.id}` },
              4: { title: "Захиалга авахад бэлэн!", body: `#${o.id} · Авахаар ирээрэй` },
            };
            const msg = msgs[target];
            if (msg) {
              notifs = [...notifs, { id: nid, title: msg.title, body: msg.body, timestamp: now, orderId: o.id }];
              nid++;
            }
            return { ...o, status: target };
          }
          return o;
        });
        return changed ? { ...p, orders, orderNotifs: notifs, nextNotifId: nid } : p;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fresh   = s.spinDate === todayStr() ? s.spinsUsed : 0;   // reset spins each calendar day
  const spinsLeft = Math.max(0, SPINS_PER_DAY - fresh);

  const api: StoreApi = {
    ...s, spinsLeft, cartCount: cartCountOf(s.cart), cartTotal: cartSubtotal(s.cart),
    addReward:  (r) => setS((p) => ({ ...p, xp: p.xp + (r.xp || 0), points: p.points + (r.points || 0) })),
    addToCart:  (pid, qty = 1, temp) => setS((p) => {
      const i = p.cart.findIndex((c) => c.pid === pid);
      if (i >= 0) { const cart = p.cart.slice(); cart[i] = { ...cart[i], qty: cart[i].qty + qty }; return { ...p, cart }; }
      return { ...p, cart: [...p.cart, { pid, qty, temp }] };
    }),
    setQty:     (pid, qty) => setS((p) => ({ ...p, cart: qty <= 0 ? p.cart.filter((c) => c.pid !== pid) : p.cart.map((c) => (c.pid === pid ? { ...c, qty } : c)) })),
    removeItem: (pid) => setS((p) => ({ ...p, cart: p.cart.filter((c) => c.pid !== pid) })),
    clearCart:  () => setS((p) => ({ ...p, cart: [] })),
    saveForLater: (pid) => setS((p) => {
      const item = p.cart.find((c) => c.pid === pid);
      if (!item) return p;
      return { ...p, cart: p.cart.filter((c) => c.pid !== pid), savedItems: [...p.savedItems.filter((s) => s.pid !== pid), item] };
    }),
    moveToCart: (pid) => setS((p) => {
      const item = p.savedItems.find((s) => s.pid === pid);
      if (!item) return p;
      return { ...p, savedItems: p.savedItems.filter((s) => s.pid !== pid), cart: [...p.cart, item] };
    }),
    removeSaved: (pid) => setS((p) => ({ ...p, savedItems: p.savedItems.filter((s) => s.pid !== pid) })),
    placeOrder: (o) => {
      const id = "TLJ-" + (10500 + s.orders.length + 1);
      const earned = earnedFor(o.total);
      const order: PlacedOrder = { id, date: todayStr().replace(/-/g, "."), items: s.cart, ...o, earned, status: 0, placedAt: Date.now() };
      setS((p) => {
        const notif: OrderNotif = { id: p.nextNotifId, title: "Захиалга баталгаажлаа", body: `#${id} · ${o.store}`, timestamp: Date.now(), orderId: id };
        return {
          ...p,
          orders: [order, ...p.orders],
          cart: [],
          points: Math.max(0, p.points - o.pointsUsed) + earned,
          xp: p.xp + 20,
          usedCoupons: o.coupon && !p.usedCoupons.includes(o.coupon) ? [...p.usedCoupons, o.coupon] : p.usedCoupons,
          orderNotifs: [notif, ...p.orderNotifs],
          nextNotifId: p.nextNotifId + 1,
        };
      });
      return order;
    },
    advanceOrder: (id) => setS((p) => {
      const target = Math.min(4, (p.orders.find((o) => o.id === id)?.status ?? 0) + 1);
      const msgs: Record<number, { title: string; body: string }> = {
        1: { title: "Захиалга бэлтгэгдэж эхэллээ", body: `#${id}` },
        2: { title: "Захиалга жигнэгдэж байна", body: `#${id}` },
        3: { title: "Чаналр шалгалтанд орлоо", body: `#${id}` },
        4: { title: "Захиалга авахад бэлэн!", body: `#${id} · Авахаар ирээрэй` },
      };
      const msg = msgs[target];
      const notif = msg ? { id: p.nextNotifId, title: msg.title, body: msg.body, timestamp: Date.now(), orderId: id } : null;
      return {
        ...p,
        orders: p.orders.map((o) => (o.id === id ? { ...o, status: target } : o)),
        ...(notif ? { orderNotifs: [notif, ...p.orderNotifs], nextNotifId: p.nextNotifId + 1 } : {}),
      };
    }),
    toggleFav:  (id) => setS((p) => ({ ...p, favorites: p.favorites.includes(id) ? p.favorites.filter((x) => x !== id) : [...p.favorites, id] })),
    useCoupon:  (id) => setS((p) => (p.usedCoupons.includes(id) ? p : { ...p, usedCoupons: [...p.usedCoupons, id] })),
    redeemReward: (id, cost) => {                         // synchronous check → reliable return value
      if (s.points < cost || s.redeemed.includes(id)) return false;
      setS((p) => ({ ...p, points: p.points - cost, redeemed: [...p.redeemed, id] }));
      return true;
    },
    markAllRead:(ids) => setS((p) => ({ ...p, notifRead: Array.from(new Set([...p.notifRead, ...ids])) })),
    useSpin:    () => {
      const usedToday = s.spinDate === todayStr() ? s.spinsUsed : 0;
      if (usedToday >= SPINS_PER_DAY) return false;
      setS((p) => ({ ...p, spinDate: todayStr(), spinsUsed: (p.spinDate === todayStr() ? p.spinsUsed : 0) + 1 }));
      return true;
    },
  };
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

// ─── Navigation stack (push/pop full-screen destinations over the tabs) ─────────
// A tiny router: every Home tap pushes a fully-designed screen that slides in from the
// right (iOS push) and returns via the back button. No dead ends.
type NavName =
  | "qr" | "points" | "coupons" | "couponDetail" | "orders" | "order" | "membership"
  | "rewardsProgress" | "settings" | "achievement" | "search" | "branches"
  | "cart" | "checkout" | "success";
type NavEntry = { name: NavName; params?: any };
type NavApi = { stack: NavEntry[]; push: (name: NavName, params?: any) => void; pop: () => void; reset: () => void; };
const NavCtx = createContext<NavApi | null>(null);
const useNav = (): NavApi => {
  const c = useContext(NavCtx);
  if (!c) throw new Error("useNav must be used within <NavProvider>");
  return c;
};
function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<NavEntry[]>([]);
  const api: NavApi = {
    stack,
    push: (name, params) => setStack((s) => [...s, { name, params }]),
    pop:  () => setStack((s) => s.slice(0, -1)),
    reset: () => setStack([]),
  };
  // Hardware/browser back closes the top screen instead of leaving the app.
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length ? s.slice(0, -1) : s));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return <NavCtx.Provider value={api}>{children}</NavCtx.Provider>;
}

// ─── Animation Variants ───────────────────────────────────────────────────────
// Emil Kowalski easing — custom curves carry more "punch" than CSS defaults.
// Strong ease-out: fast start = instant feedback on enter; settles gently.
const ease       = [0.23, 1,    0.32, 1]  as const;  // enter / UI transitions
const easeOut    = [0.16, 1,    0.30, 1]  as const;  // progress bars & reveals
const easeDrawer = [0.32, 0.72, 0,    1]  as const;  // iOS-like drawer curve (Ionic)
// Motion system — one duration scale + one easing set + named spring presets.
// Reference these instead of ad-hoc values so every surface shares the same rhythm.
const DUR = { fast: 0.16, base: 0.26, slow: 0.4 } as const;
// Exits reuse the strong ease-out `ease` (never ease-in on UI, which would delay the first
// frame). Asymmetry comes from shorter exit *durations*, not from an accelerate curve.

// Tab screens are position:absolute / inset:0. ANY x-translation shifts the whole screen
// sideways mid-transition — clipping content on one edge and exposing the cream background on
// the other (the "profile slid left" artifact). A pure opacity crossfade has zero positional
// artifact, reads as clean/instant, and matches native iOS tab bars (which don't slide).
// Tabs are switched tens of times/day → this is the "reduce frequent animation" move (Emil).
const slideVariants = {
  enter:  { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18, ease } },
  exit:   { opacity: 0, transition: { duration: 0.12, ease } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
};

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.10 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.38, ease } },
};

const staggerItemX = {
  hidden: { opacity: 0, x: 20 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.34, ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show:   { opacity: 1, scale: 1,    transition: { duration: 0.36, ease } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1, name: "Тирамису Хайрцаг",   price: 55000, img: "https://cdn.greensoft.mn/cache/images/8/5/5/f/9/855f9bdf2f0607553c8cd6f4144aa2d08199d4d9.jpg", tag: "Бестселлер", cat: "dessert" },
  { id: 2, name: "Матча Тирамису",      price: 55000, img: "https://cdn.greensoft.mn/cache/images/0/0/0/2/7/0002711c4bebc1f8d8a3c8e7b9689af50caca2fe.jpg", tag: "Шинэ",      cat: "dessert" },
  { id: 3, name: "Күүки & Чийз Мусс",  price: 55000, img: "https://cdn.greensoft.mn/cache/images/f/2/f/0/2/f2f02f4971d5948bb137b31f4096f1bb9d5191b3.jpg", tag: "Шинэ",      cat: "cake",    glbUrl: "/models/cinnamon.glb" },
  { id: 4, name: "Тоорын Хатан Хаан",  price: 80000, img: "https://cdn.greensoft.mn/cache/images/1/4/6/2/8/146281eb439a686ac332ca587d5c2fc9b9339276.jpg", tag: "Онцлох",   cat: "cake"    },
  { id: 5, name: "Ягаан Цэцэгт Бялуу", price: 70000, img: "https://cdn.greensoft.mn/cache/images/e/1/6/b/0/e16b02756890f9b9e374a75698225cacbd5f42e7.jpg", tag: "Бялуу",    cat: "cake",    glbUrl: "/models/strawberry.glb" },
  { id: 6, name: "Улирлын Мусс Бялуу", price: 62000, img: "https://cdn.greensoft.mn/cache/images/a/8/7/4/b/a874be360bc334edd9f3e555de35bda9e1923c5d.jpg", tag: "Онцлох",   cat: "cake"    },
  { id: 7, name: "Сүүн Кремтэй Бялуу", price: 18000, img: "https://cdn.greensoft.mn/cache/images/a/1/f/b/2/a1fb2556281ed781c9a670040a6b82c0599f63ad.jpg", tag: "Бялуу",    cat: "cake"    },
  { id: 8, name: "Артизан Багет",       price: 7500,  img: "https://cdn.greensoft.mn/cache/images/9/0/c/7/0/90c703d57b3073b7b5bb0e0045aa77ff84b83d7d.jpg", tag: "Талх",     cat: "bread"   },
  { id: 9, name: "Цэцэрлэгийн Салат",  price: 12500, img: "https://cdn.greensoft.mn/cache/images/d/1/3/1/f/d131f105dd22eebeb3551f4601cf192870db26a9.jpg", tag: "Салат",    cat: "salad"   },
];
const CATS = [
  { id: "all",     label: "Бүгд",    Icon: Sparkles   },
  { id: "cake",    label: "Бялуу",   Icon: Cake       },
  { id: "bread",   label: "Талх",    Icon: ShoppingBag },
  { id: "dessert", label: "Дессерт", Icon: Star       },
  { id: "salad",   label: "Салат",   Icon: Zap        },
  { id: "coffee",  label: "Кофе",    Icon: Coffee     },
  { id: "gift",    label: "Бэлэг",   Icon: Gift       },
];
const CAT_COLORS: Record<string, string> = {
  cake:    H.primary,
  bread:   "#8B6914",
  dessert: H.pink,
  salad:   "#4A8C5C",
  coffee:  "#6F4E37",
  gift:    H.gold,
};
const MISSIONS = [
  { id: 1, text: "Өнөөдөр нэвтрэх",        xp: 10, done: true  },
  { id: 2, text: "1 бүтээгдэхүүн захиалах", xp: 50, done: false },
  { id: 3, text: "Найздаа share хийх",      xp: 30, done: false },
  { id: 4, text: "Тоглоом тоглох",          xp: 20, done: true  },
];
const COUPONS = [
  { id: 1, title: "20% хөнгөлөлт",   sub: "Бялуу бүх нэр төрөлд",  expiry: "2026.07.31", color: H.pink,      terms: "Нэг удаагийн захиалгад хүчинтэй. Бусад урамшууллтай хамт хэрэглэх боломжгүй." },
  { id: 2, title: "Үнэгүй Тирамису", sub: "₮50,000+ захиалгад",    expiry: "2026.07.20", color: H.primary,   terms: "₮50,000-с дээш захиалгад. Зөвхөн Тирамису Хайрцаг бүтээгдэхүүнд." },
  { id: 3, title: "Хүргэлт үнэгүй",  sub: "Дараагийн захиалгад",   expiry: "2026.07.25", color: H.gold,      terms: "Хот доторх хүргэлтэд, нэг удаа хүчинтэй." },
  { id: 4, title: "15% хөнгөлөлт",   sub: "Кофе бүх нэр төрөлд",   expiry: "2026.06.20", color: H.secondary, terms: "Кофены нэр төрөлд. Хугацаа дууссан." },
];
// Redeemable rewards — spend Upoint to add a coupon to the wallet.
const REWARDS = [
  { id: 101, title: "Үнэгүй Кофе",     sub: "Аль ч салбарт",      cost: 500,  color: H.primary,   Icon: Coffee },
  { id: 102, title: "20% хөнгөлөлт",   sub: "Дараагийн захиалга", cost: 800,  color: H.pink,      Icon: Tag },
  { id: 103, title: "Хүргэлт үнэгүй",  sub: "1 удаагийн эрх",     cost: 300,  color: H.gold,      Icon: Truck },
  { id: 104, title: "Үнэгүй Тирамису", sub: "Бестселлер амттан",  cost: 2000, color: H.secondary, Icon: Cake },
];
// Coupon lifecycle: used > expired > available. `todayStr()` = ISO, expiry "2026.07.31" → string-comparable.
const isExpired = (expiry: string) => expiry.replace(/\./g, "-") < todayStr();
type CouponT = typeof COUPONS[0];
const couponStatus = (c: CouponT, usedCoupons: number[]): "used" | "expired" | "available" =>
  usedCoupons.includes(c.id) ? "used" : isExpired(c.expiry) ? "expired" : "available";
// Redeemed rewards become wallet coupons alongside the promotional ones.
const walletCoupons = (redeemed: number[]): CouponT[] => [
  ...COUPONS,
  ...REWARDS.filter((r) => redeemed.includes(r.id)).map((r) => ({
    id: r.id, title: r.title, sub: r.sub, expiry: "2026.12.31", color: r.color, terms: `${r.title} — шагналаар авсан купон.`,
  })),
];
const WHEEL_PRIZES = [
  { label: "Үнэгүй",  color: H.primary  },
  { label: "+100pt",  color: H.secondary },
  { label: "20% off", color: "#1A6B42"   },
  { label: "15% off", color: H.secondary },
  { label: "+50pt",   color: H.primary   },
  { label: "+200pt",  color: "#1E7A4A"   },
  { label: "30% off", color: H.secondary },
  { label: "Дараа",   color: "#4A7C5F"   },
];
const GAMES = [
  { id: "block",   title: "Block Bakery",  sub: "Талх өрж цэвэрлэ",  Icon: LayoutGrid, reward: "→ Coupon", color: "#FBE7B0", live: true  },
  { id: "quiz",    title: "Weekend Quiz",  sub: "7 хоног бүр шинэ",  Icon: Brain,      reward: "→ Coupon",  color: "#E8F4F0", live: true  },
  { id: "connect", title: "Connections",   sub: "4 ангилал ол",      Icon: LayoutGrid, reward: "→ Badge",   color: "#EDF0F8", live: true  },
  { id: "merge",   title: "Merge Bakery",  sub: "Нэгтгэж хөгжүүл",   Icon: Sparkles,   reward: "→ Cake",    color: "#F0EDD8", live: true  },
];
const NEWS = [
  { title: "Улаангом хотод 26 дахь салбар нээлээ",  img: "https://cdn.greensoft.mn/uploads/site/1200/photos/block/20260105135027_019e87e843b4bb6b0efa3732cfdcffea.png", date: "2026.01.05" },
  { title: "United Mall-д 25 дахь салбар нээгдлээ", img: "https://cdn.greensoft.mn/uploads/site/1200/photos/block/20260105135029_3c99456f6e15a42d1d21c8942c670ce8.png", date: "2025.12.20" },
];
const ACHIEVEMENTS = [
  { Icon: Cake,   label: "Бялуу Дурлагч",    done: true  },
  { Icon: Coffee, label: "Кофе Экспэрт",     done: true  },
  { Icon: Flame,  label: "7 хоног дараалан",  done: false },
  { Icon: Crown,  label: "VIP гишүүн",       done: false },
  { Icon: Star,   label: "100 захиалга",      done: false },
  { Icon: Target, label: "Тоглоомч",         done: true  },
];
const MENU_ITEMS = [
  { Icon: Package,    label: "Миний захиалгууд",  sub: "3 идэвхтэй",           badge: "3"    },
  { Icon: MapPin,     label: "Хүргэлтийн хаяг",   sub: "2 хаяг хадгалсан"                   },
  { Icon: CreditCard, label: "Төлбөрийн арга",    sub: "QPay · SocialPay"                    },
  { Icon: Gift,       label: "Upoint лояалти",     sub: "2,840 оноо байна"                    },
  { Icon: Store,      label: "Салбарын мэдээлэл", sub: "26 салбар · Улаанбаатар"             },
  { Icon: Bell,       label: "Мэдэгдэл",           sub: "Идэвхтэй"                            },
  { Icon: Moon,       label: "Харанхуй горим",     sub: "Удахгүй нэмэгдэнэ",    badge: "Soon" },
  { Icon: Settings,   label: "Тохиргоо",           sub: ""                                    },
  { Icon: Headphones, label: "Тусламж",            sub: "Холбоо барих"                        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₮${n.toLocaleString()}`;

function CoverImg({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  return err
    ? <div className="absolute inset-0 flex items-center justify-center" style={{ background: H.accent }}>
        <Cake size={28} color={H.muted} strokeWidth={1.4} />
      </div>
    : <img src={src} alt={alt} onError={() => setErr(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
}

/** Animated number counter */
function CountUp({ to, prefix = "" }: { to: number; prefix?: string }) {
  const mv  = useMotionValue(0);
  const sp  = useSpring(mv, { stiffness: 60, damping: 18, mass: 0.8 });
  const val = useTransform(sp, (v) => `${prefix}${Math.round(v).toLocaleString()}`);
  useEffect(() => { mv.set(to); }, [mv, to]);
  return <motion.span>{val}</motion.span>;
}

/** Countdown seconds to a future timestamp */
function CountDown({ to }: { to: number }) {
  const [s, setS] = useState(() => Math.max(0, Math.round((to - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => { const r = Math.max(0, Math.round((to - Date.now()) / 1000)); setS(r); if (r <= 0) clearInterval(id); }, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (s <= 0) return null;
  return <span className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>{s} сек үлдлээ</span>;
}

/** Animated progress bar */
function ProgressBar({ pct, color, delay = 0.3 }: { pct: number; color: string; delay?: number }) {
  return (
    <div className="h-2 rounded-full overflow-hidden w-full" style={{ background: "rgba(255,255,255,0.15)" }}>
      <motion.div className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.1, delay, ease: easeOut }} />
    </div>
  );
}

function SH({ title, onAll }: { title: string; onAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{title}</h2>
      {onAll && <button className="text-[12px] font-medium" style={{ color: H.primary, fontFamily: fontSans }} onClick={onAll}>Бүгдийг харах</button>}
    </div>
  );
}

// ─── App Header ──────────────────────────────────────────────────────────────
type Tab = "home" | "game" | "shop" | "rewards" | "profile";

const SCREEN_TITLES: Record<Tab, string> = {
  home:    "Нүүр",
  game:    "Тоглоом",
  shop:    "Дэлгүүр",
  rewards: "Урамшуулал",
  profile: "Профайл",
};

const NOTIFICATIONS = [
  { id: 1, title: "Таны оноо нэмэгдлээ!",      body: "+50 Upoint · Тирамису захиалга",   time: "2 мин",   read: false, Icon: Star     },
  { id: 2, title: "Шинэ купон ирлээ",           body: "20% хөнгөлөлт · Бялуу бүх нэр",   time: "1 цаг",   read: false, Icon: Ticket   },
  { id: 3, title: "Хүрд эргүүлэх эрх",          body: "Өнөөдрийн 3 эрх хүлээж байна",    time: "3 цаг",   read: true,  Icon: RotateCcw },
  { id: 4, title: "United Mall салбар нээлээ",  body: "Шинэ байршил · Улаанбаатар",       time: "1 өдөр",  read: true,  Icon: Store    },
];

const relativeTime = (ts: number) => {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "хэдхэн";
  if (min < 60) return `${min} мин`;
  const hr = Math.round(min / 60);
  return `${hr} цаг`;
};

function NotificationBtn() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const store  = useStore();
  const nav = useNav();
  const isRead = (n: { id: number }) => store.notifRead.includes(n.id);
  const allNotifs = [
    ...NOTIFICATIONS,
    ...store.orderNotifs.map((n) => ({ ...n, Icon: Package, time: relativeTime(n.timestamp) })),
  ].sort((a, b) => {
    const ta = "timestamp" in a ? (a as any).timestamp : 0;
    const tb = "timestamp" in b ? (b as any).timestamp : 0;
    return tb - ta;
  });
  const unread = allNotifs.filter((n) => !isRead(n)).length;

  const handleTap = (n: typeof allNotifs[number]) => {
    if ("orderId" in n && n.orderId) {
      setOpen(false);
      setTimeout(() => nav.push("order", n.orderId), 100);
    }
  };

  return (
    <>
      <motion.button
        className="relative size-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen(true)}>
        <Bell size={15} color="white" strokeWidth={1.8} />
        {unread > 0 && (
          <motion.span
            className="absolute top-[7px] right-[7px] size-[7px] rounded-full"
            style={{ background: H.pink, border: "1.5px solid white" }}
            animate={reduce ? undefined : { scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.4 }} />
        )}
      </motion.button>

      {/* Notification drawer — portalled to document.body to escape AppHeader's CSS transform context */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end"
            style={{ background: "rgba(0,0,0,0.40)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}>
            <motion.div className="w-full rounded-t-3xl overflow-hidden"
              style={{ background: H.bg, maxHeight: "75dvh" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: H.accent }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: `1px solid ${H.border}` }}>
                <div>
                  <h2 className="text-[16px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Мэдэгдэл</h2>
                  {unread > 0 && (
                    <p className="text-[12px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>
                      {unread} уншаагүй мэдэгдэл
                    </p>
                  )}
                </div>
                <motion.button
                  className="text-[12px] font-medium px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(14,92,55,0.08)", color: H.primary, fontFamily: fontSans, opacity: unread ? 1 : 0.5 }}
                  onClick={() => store.markAllRead(allNotifs.map((n) => n.id))}
                  whileTap={{ scale: 0.93 }}>
                  Бүгдийг уншсан
                </motion.button>
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: "56dvh", scrollbarWidth: "none" }}>
                {allNotifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Bell size={36} color={H.accent} strokeWidth={1.2} />
                    <p style={{ fontFamily: fontSans, color: H.muted, fontSize: 13 }}>Мэдэгдэл байхгүй байна</p>
                    <p style={{ fontFamily: fontSans, color: H.muted, fontSize: 12 }}>Тоглоом тоглоорой</p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show">
                    {allNotifs.map((n, i) => (
                      <motion.div key={n.id} variants={staggerItem}
                        className="flex items-start gap-3 px-5 py-4"
                        style={{ borderBottom: i < allNotifs.length - 1 ? `1px solid ${H.border}` : "none",
                          background: isRead(n) ? "transparent" : "rgba(14,92,55,0.035)" }}
                        onClick={() => handleTap(n)}>
                        {/* Icon badge */}
                        <div className="size-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: isRead(n) ? H.accent + "40" : `rgba(14,92,55,0.10)` }}>
                          {"Icon" in n ? <n.Icon size={18} color={isRead(n) ? H.muted : H.primary} strokeWidth={1.8} /> : <Package size={18} color={isRead(n) ? H.muted : H.primary} strokeWidth={1.8} /> }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold leading-snug"
                              style={{ fontFamily: fontDisplay, color: isRead(n) ? H.muted : H.text }}>{n.title}</p>
                            {!isRead(n) && (
                              <div className="size-2 rounded-full flex-shrink-0 mt-1.5"
                                style={{ background: H.primary }} />
                            )}
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>{n.body}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock size={10} color={H.muted} />
                            <span className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>{"time" in n ? `${n.time} өмнө` : ""}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Bottom safe area padding */}
              <div style={{ height: "env(safe-area-inset-bottom, 16px)", minHeight: 16 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

// ─── Figma SVG icon helpers (from ConvenienceStoreApp import) ─────────────────
function HeaderIconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 15.995 15.995" fill="none">
      <path d={csSvg.p3857e380} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      <path d={csSvg.pc0ca400}  stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
    </svg>
  );
}
function HeaderIconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 14.9926 14.9926" fill="none">
      <path d={csSvg.p14664a02}                      stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.12" />
      <path d="M1.87408 3.74815H13.1185"              stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.12" />
      <path d={csSvg.p1491c580}                      stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.12" />
    </svg>
  );
}

function AppHeader({ tab, cartCount, onNav }: { tab: Tab; cartCount: number; onNav: (t: Tab) => void }) {
  const nav = useNav();
  return (
    <motion.div
      className="flex-shrink-0 relative flex flex-col"
      style={{
        backgroundImage: `linear-gradient(177.348deg, ${H.secondary} 8.49%, ${H.primary} 91.51%)`,
        zIndex: 10,
        // Absorbs the Dynamic Island / notch safe area, then adds generous breathing room
        // above and below the bar so it reads balanced like a native iOS nav bar.
        paddingTop: SAFE_TOP,
        paddingBottom: 10,
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.40, ease: [0.25, 0.46, 0.45, 0.94] }}>

      {/* Decorative circle */}
      <div className="absolute top-0 right-[-32px] size-[140px] rounded-full opacity-[0.07] bg-white pointer-events-none" />

      {/* ── Header bar: profile | logo | actions — 56px tall ── */}
      <div className="flex items-center px-4" style={{ height: 56 }}>

        {/* Left: user / avatar → Profile */}
        <motion.button aria-label="Профайл"
          className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.15)", border: "0.705px solid rgba(255,255,255,0.20)" }}
          onClick={() => onNav("profile")}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}>
          <HeaderIconUser />
        </motion.button>

        {/* Center: TLJ logo (ImageTousLesJours) — absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <img
            src={imgLogoWhite}
            alt="Tous Les Jours"
            style={{ height: 20, objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* Right: notification bell + filter (Figma: AppHeader1 = Button1 + Button2) */}
        <div className="flex items-center gap-2 ml-auto">
          <NotificationBtn />

          <motion.button aria-label="Сагс"
            className="relative size-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "0.705px solid rgba(255,255,255,0.20)" }}
            onClick={() => nav.push("cart")}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}>
            <HeaderIconFilter />
            {cartCount > 0 && (
              <motion.span
                className="absolute -top-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: H.pink, color: "white", fontFamily: fontSans }}
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}>
              {cartCount}
            </motion.span>
          )}
        </motion.button>
        </div>

        {/* Screen title label (Figma: Text1 — small uppercase cream, centered) */}
        <AnimatePresence mode="wait">
          <motion.span key={tab}
            className="absolute bottom-[6px] left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-[1.067px]"
            style={{ color: "rgba(244,239,216,0.45)", fontFamily: fontSans, whiteSpace: "nowrap" }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}>
            {SCREEN_TITLES[tab]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Liquid Glass Tab Bar ─────────────────────────────────────────────────────
const TAB_ORDER: Tab[] = ["home", "game", "shop", "rewards", "profile"];

const NAV = [
  { tab: "home"    as Tab, Icon: Home,        label: "Нүүр"       },
  { tab: "game"    as Tab, Icon: Gamepad2,    label: "Тоглоом"    },
  { tab: "shop"    as Tab, Icon: ShoppingBag, label: "Дэлгүүр"   },
  { tab: "rewards" as Tab, Icon: Gift,        label: "Урамшуулал" },
  { tab: "profile" as Tab, Icon: User,        label: "Профайл"    },
];

// Liquid Glass visual constants — neutral white glass, no brand-color tint
const GLASS = {
  bg:          "rgba(255,255,255,0.14)",
  border:      "rgba(255,255,255,0.32)",
  shadow:      "0 16px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.10)",
  activeBg:    "rgba(255,255,255,0.22)",
  activeBorder:"rgba(255,255,255,0.45)",
};

// White SVG icons from the Figma NavigationIconBar import
function NavIconHome({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
      <path d={navSvg.p35114900} fill={active ? H.primary : H.muted} />
    </svg>
  );
}
function NavIconProfile({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
      <path d={navSvg.p11307380} fill={active ? H.primary : H.muted} />
    </svg>
  );
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    /* Floating anchor — sits at the bottom of the app container */
    <div
      style={{
        position:    "absolute",
        bottom:      SAFE_BOTTOM,
        left:        0,
        right:       0,
        display:     "flex",
        justifyContent: "center",
        zIndex:      50,
        pointerEvents: "none",
      }}>

      {/* ── Liquid Glass Pill ── */}
      <motion.div
        style={{
          pointerEvents:        "auto",
          display:              "flex",
          alignItems:           "center",
          height:               72,
          paddingLeft:          16,
          paddingRight:         16,
          borderRadius:         9999,
          background:           GLASS.bg,
          backdropFilter:       "blur(52px) saturate(200%)",
          WebkitBackdropFilter: "blur(52px) saturate(200%)",
          border:               `1px solid ${GLASS.border}`,
          boxShadow:            GLASS.shadow,
          overflow:             "visible",
          gap:                  4,
        }}
        initial={{ y: 32, opacity: 0, scale: 0.94 }}
        animate={{ y: 0,  opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.15 }}>

        {/* Top specular highlight — mimics light hitting glass */}
        <div
          style={{
            position:      "absolute",
            top:           1,
            left:          "15%",
            right:         "15%",
            height:        1,
            borderRadius:  9999,
            background:    "linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)",
            pointerEvents: "none",
          }} />

        {/* Soft inner reflection arc — bottom of pill */}
        <div
          style={{
            position:     "absolute",
            bottom:       1,
            left:         "20%",
            right:        "20%",
            height:       1,
            borderRadius: 9999,
            background:   "rgba(255,255,255,0.18)",
            pointerEvents:"none",
          }} />


        {NAV.map(({ tab, Icon, label }) => {
          const on     = active === tab;
          const isShop = tab === "shop";

          if (isShop) {
            return (
              <motion.button
                key={tab}
                onClick={() => onChange(tab)}
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  width:          60,
                  position:       "relative",
                  background:     "none",
                  border:         "none",
                  cursor:         "pointer",
                  padding:        0,
                }}
                whileTap={{ scale: 0.86 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}>

                {/* Raised circle — floats 20 px above pill top */}
                <motion.div
                  style={{
                    position:    "absolute",
                    top:         -32,
                    width:       56,
                    height:      56,
                    borderRadius: 9999,
                    background:  `linear-gradient(145deg, #1A7A45, ${H.secondary})`,
                    boxShadow:   `0 8px 24px rgba(14,92,55,0.48), 0 2px 8px rgba(0,0,0,0.16), inset 0 1.5px 0 rgba(255,255,255,0.28)`,
                    border:      "2.5px solid rgba(255,255,255,0.32)",
                    display:     "flex",
                    alignItems:  "center",
                    justifyContent: "center",
                  }}
                  animate={{ scale: on ? 1.10 : 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}>
                  <Icon size={24} color="white" strokeWidth={1.8} />
                </motion.div>

                {/* Label below */}
                <span
                  style={{
                    fontSize:   10,
                    fontWeight: 600,
                    fontFamily: fontSans,
                      color:      H.text,
                    marginTop:  32,
                    lineHeight: 1,
                  }}>
                  {label}
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab}
              onClick={() => onChange(tab)}
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            4,
                minWidth:       56,
                height:         56,
                borderRadius:   9999,
                position:       "relative",
                background:     "none",
                border:         "none",
                cursor:         "pointer",
                padding:        "0 6px",
              }}
              whileTap={{ scale: 0.86 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}>

              {/* Sliding active pill — shared layoutId for smooth morphing */}
              {on && (
                <motion.div
                  layoutId="liquidPill"
                  style={{
                    position:     "absolute",
                    inset:        "4px 0",
                    borderRadius: 9999,
                    background:   GLASS.activeBg,
                    border:       `1px solid ${GLASS.activeBorder}`,
                    boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <motion.div
                style={{ position: "relative", zIndex: 1 }}
                animate={{ scale: on ? 1.05 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                {tab === "home"    ? <NavIconHome    active={on} /> :
                 tab === "profile" ? <NavIconProfile active={on} /> :
                 <Icon size={20} color={on ? H.primary : H.muted} strokeWidth={on ? 2.1 : 1.6} />}
              </motion.div>

              <span
                style={{
                  position:   "relative",
                  zIndex:     1,
                  fontSize:   10,
                  fontWeight: on ? 600 : 400,
                  fontFamily: fontSans,
                  color:      on ? H.primary : H.muted,
                  opacity:    1,
                  lineHeight: 1,
                  textShadow: "0 0 8px rgba(255,255,255,0.6)",
                }}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── Product Detail — full-screen page (Figma reference: IPhone1415ProMax2/3) ──
type Product = typeof PRODUCTS[0];

function ProductDetailSheet({
  product, onClose, onAdd,
}: { product: Product | null; onClose: () => void; onAdd: (pid: number, qty: number, temp?: "hot" | "cool") => void }) {
  const [qty,     setQty]     = useState(1);
  const [temp,    setTemp]    = useState<"hot" | "cool">("cool");
  const [fav,     setFav]     = useState(false);
  const [adding,  setAdding]  = useState(false);
  const [show3d,  setShow3d]  = useState(false);

  const handleAdd = () => {
    if (!product) return;
    setAdding(true);
    onAdd(product.id, qty, product.cat === "coffee" ? temp : undefined);
    setTimeout(() => { setAdding(false); onClose(); }, 900);
  };

  const related = PRODUCTS.filter((p) => product && p.id !== product.id).slice(0, 4);

  return createPortal(
    <AnimatePresence>
      {product && (
        <motion.div className="fixed inset-0 z-50 flex flex-col"
          style={{ background: H.bg }}
          initial={{ x: "100%" }}
          animate={{ x: 0,      transition: { duration: 0.42, ease: easeDrawer } }}
          exit={{    x: "100%", transition: { duration: 0.26, ease } }}>

          {/* ── Green hero section ── */}
          <div className="relative overflow-hidden flex-shrink-0"
            style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)`, paddingBottom: 64 }}>

            {/* Decorative circles */}
            <div className="absolute right-[-40px] top-[-40px] size-48 rounded-full opacity-[0.08] bg-white pointer-events-none" />
            <div className="absolute left-[-60px] bottom-[20px] size-40 rounded-full opacity-[0.06] bg-white pointer-events-none" />

            {/* Top bar: back + heart */}
            <div className="flex items-center gap-3 px-4 pt-14 pb-4">
              {/* Back */}
              <motion.button
                className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", border: "0.705px solid rgba(255,255,255,0.22)" }}
                onClick={onClose} whileTap={{ scale: 0.86 }}>
                <ArrowRight size={17} color="white" strokeWidth={2.2} style={{ transform: "rotate(180deg)" }} />
              </motion.button>

              {/* Center title */}
              <div className="flex-1 flex flex-col items-center min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[1.1px]"
                  style={{ color: "rgba(244,239,216,0.50)", fontFamily: fontSans }}>
                  Бүтээгдэхүүн
                </p>
                <p className="text-[15px] font-bold leading-snug text-white text-center truncate w-full"
                  style={{ fontFamily: fontDisplay }}>
                  {product.name}
                </p>
              </div>

              {/* Favourite */}
              <motion.button
                className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", border: "0.705px solid rgba(255,255,255,0.22)" }}
                onClick={() => setFav((f) => !f)} whileTap={{ scale: 0.86 }}>
                <Heart size={15} color="white" fill={fav ? "white" : "transparent"} strokeWidth={2} />
              </motion.button>
            </div>

            {/* Text + product image side by side */}
            <div className="px-6 flex items-end justify-between">
              <div className="flex-1">
                <p className="text-[13px] mb-1" style={{ color: "rgba(244,239,216,0.65)", fontFamily: fontSans }}>
                  {(() => { const c = CATS.find(x => x.id === product.cat); if (!c) return null; const cc = CAT_COLORS[product.cat] || "#fff"; return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 4, background: "rgba(255,255,255,0.15)" }}><c.Icon size={9} color="rgba(255,255,255,0.8)" strokeWidth={2.5} /></span><span style={{ color: "rgba(255,255,255,0.8)" }}>{c.label}</span></span>; })()}
                  {product.tag}
                </p>
                <h1 className="text-[28px] font-bold leading-tight text-white mb-1"
                  style={{ fontFamily: fontDisplay }}>{product.name}</h1>
                <p className="text-[34px] font-bold leading-none text-white mt-2"
                  style={{ fontFamily: fontDisplay }}>{fmt(product.price)}</p>
              </div>
              {/* Floating product image — overlaps into white section */}
              <div className="relative flex-shrink-0" style={{ width: 160, height: 180, marginBottom: -64 }}>
                <img
                  src={product.img}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                  style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          </div>

          {/* ── White content panel ── */}
          <div className="flex-1 overflow-y-auto rounded-t-[24px] -mt-6 relative"
            style={{ background: H.card, scrollbarWidth: "none" }}>
            <motion.div className="px-5 pt-6 pb-32"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, ease, delay: 0.12 }}>

              {/* Name + description */}
              <h2 className="text-[20px] font-bold mb-1" style={{ fontFamily: fontDisplay, color: H.text }}>
                {product.name}
              </h2>
              <p className="text-[12px] leading-relaxed mb-4" style={{ fontFamily: fontSans, color: H.muted }}>
                Шинэхэн гар аргаар бэлтгэсэн, өдөр бүр нийлүүлэгддэг TOUS les JOURS-ын
                онцлох бүтээгдэхүүн. Хамгийн чанартай орц найрлагаар бэлтгэгддэг.
              </p>

              {/* 3D viewer button */}
              {product.glbUrl && (
                <motion.button onClick={() => setShow3d(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-white text-[12px] font-semibold"
                  style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                  3D харах
                </motion.button>
              )}

              {/* Star rating */}
              <div className="flex items-center gap-1.5 mb-5">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} size={16}
                    color={H.primary}
                    fill={i <= 4 ? H.primary : "transparent"}
                    strokeWidth={1.8}
                  />
                ))}
                <span className="text-[12px] ml-1" style={{ fontFamily: fontSans, color: H.muted }}>4/5</span>
              </div>

              {/* Upoint hint */}
              <div className="flex items-center gap-1.5 mb-5">
                <Star size={11} color={H.gold} fill={H.gold} />
                <span className="text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>
                  Захиалгаас <span style={{ color: H.gold, fontWeight: 700 }}>+{Math.round(product.price / 100)} Upoint</span> цуглуулна
                </span>
              </div>

              {/* Temperature selector — drinks only (meaningless for cakes/bread) */}
              {product.cat === "coffee" && (
                <div className="mb-6">
                  <p className="text-[13px] font-semibold mb-2" style={{ fontFamily: fontDisplay, color: H.text }}>Температур</p>
                  <div className="flex gap-3">
                    {(["hot", "cool"] as const).map((t) => {
                      const on = temp === t;
                      return (
                        <motion.button key={t}
                          className="size-14 rounded-xl flex flex-col items-center justify-center gap-1"
                          style={{
                            background: on ? H.primary : H.card,
                            border: `1.5px solid ${on ? H.primary : H.border}`,
                            boxShadow: on ? "0 4px 12px rgba(14,92,55,0.22)" : "none",
                          }}
                          onClick={() => setTemp(t)}
                          aria-label={t === "hot" ? "Халуун" : "Хүйтэн"}
                          whileTap={{ scale: 0.92 }}>
                          {t === "hot"
                            ? <Flame size={18} color={on ? "white" : H.muted} strokeWidth={1.8} />
                            : <Zap   size={18} color={on ? "white" : H.muted} strokeWidth={1.8} />}
                          <span className="text-[10px] font-semibold"
                            style={{ fontFamily: fontSans, color: on ? "white" : H.muted }}>
                            {t === "hot" ? "Халуун" : "Хүйтэн"}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommend section */}
              <p className="text-[15px] font-bold mb-3" style={{ fontFamily: fontDisplay, color: H.primary }}>
                Санал болгох
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {related.map((p) => (
                  <motion.button key={p.id}
                    className="flex-shrink-0 w-[120px] rounded-2xl overflow-hidden relative flex flex-col justify-end"
                    style={{ height: 148, background: `linear-gradient(160deg, ${H.secondary}, ${H.primary})` }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {}}>
                    {/* Decorative blob */}
                    <div className="absolute top-0 right-0 size-16 rounded-full opacity-[0.10] bg-white pointer-events-none" />
                    {/* Product image */}
                    <div className="absolute inset-x-2 top-2 bottom-10 overflow-hidden rounded-xl">
                      <img src={p.img} alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    {/* Name */}
                    <p className="relative z-10 text-[12px] font-bold text-white text-center px-2 pb-3 leading-tight"
                      style={{ fontFamily: fontDisplay }}>{p.name}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Fixed order bar: header (total + stepper) → primary CTA ── */}
          <div className="flex-shrink-0 flex flex-col"
            style={{
              background: H.card,
              borderTop: `1px solid ${H.border}`,
              paddingBottom: SAFE_BOTTOM,
              boxShadow: SHADOW_TOP,
            }}>

            {/* Order header — total price (live) + quantity stepper */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ fontFamily: fontSans, color: H.muted }}>
                  Нийт төлбөр
                </p>
                <p className="text-[24px] font-bold leading-tight"
                  style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(product.price * qty)}
                </p>
              </div>

              {/* Quantity stepper — − [n] + (conventional order, grouped as a pill) */}
              <div className="flex items-center gap-1 rounded-full p-1"
                style={{ background: H.bg, border: `1px solid ${H.border}` }}>
                <motion.button aria-label="Тоо хасах"
                  className="size-9 rounded-full flex items-center justify-center"
                  style={{ background: H.card, border: `1px solid ${H.border}` }}
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  whileTap={{ scale: 0.9 }}>
                  <Minus size={16} color={qty <= 1 ? H.accent : H.text} strokeWidth={2.5} />
                </motion.button>
                <span className="w-8 text-center text-[17px] font-bold"
                  style={{ fontFamily: fontSans, color: H.text, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
                <motion.button aria-label="Тоо нэмэх"
                  className="size-9 rounded-full flex items-center justify-center"
                  style={{ background: H.primary }}
                  onClick={() => setQty((n) => n + 1)}
                  whileTap={{ scale: 0.9 }}>
                  <Plus size={16} color="white" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>

            {/* Primary CTA — full width, carries the running total */}
            <div className="px-5">
              <motion.button
                className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
                style={{
                  background: adding
                    ? H.primary
                    : `linear-gradient(135deg, ${H.secondary}, ${H.primary})`,
                  fontFamily: fontDisplay,
                  boxShadow: SHADOW_CTA,
                }}
                onClick={handleAdd}
                aria-label="Сагсанд нэмэх"
                whileTap={{ scale: 0.97 }}>
                <AnimatePresence mode="wait">
                  {adding ? (
                    <motion.span key="done" className="flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      <CheckCircle size={20} color="white" strokeWidth={2.2} /> Нэмэгдлээ
                    </motion.span>
                  ) : (
                    <motion.span key="add" className="flex items-center gap-2"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <ShoppingBag size={18} color="white" strokeWidth={2} />
                      Сагсанд нэмэх · {fmt(product.price * qty)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
      {product?.glbUrl && show3d && (
        <motion.div className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: H.bg }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.24, ease } }}
          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16, ease } }}>
          <div className="flex items-center justify-between px-4 pt-14 pb-2 flex-shrink-0">
            <motion.button className="size-9 rounded-full flex items-center justify-center"
              style={{ background: H.primary }}
              onClick={() => setShow3d(false)}
              whileTap={{ scale: 0.86 }}>
              <X size={16} color="white" strokeWidth={2.5} />
            </motion.button>
            <span className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>
              {product.name}
            </span>
            <div className="size-9" />
          </div>
          <div className="flex-1 px-4 pb-4">
            <CakeViewer3D
              glbUrl={product.glbUrl}
              name={product.name}
              basePrice={product.price}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ onNav, onAddToCart, missions, onComplete, user }: {
  onNav: (t: Tab) => void;
  onAddToCart: (pid: number, qty?: number) => void;
  missions: typeof MISSIONS;
  onComplete: (id: number) => void;
  user?: ApiUser | null;
}) {
  const reduce    = useReducedMotion();
  const store     = useStore();
  const nav       = useNav();
  const pts       = store.points;   // backend when signed in, else local wallet
  const hour      = new Date().getHours();
  const GreetIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
  const greetText = hour < 12 ? "Өглөөний мэнд" : hour < 18 ? "Өдрийн мэнд" : "Оройн мэнд";
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const tier = pts >= 5000 ? "Алт" : pts >= 2000 ? "Мөнгө" : "Хүрэл";
  const nextTier = tier === "Хүрэл" ? "Мөнгө" : tier === "Мөнгө" ? "Алт" : null;
  const nextTierPts = tier === "Хүрэл" ? 2000 : tier === "Мөнгө" ? 5000 : 0;
  const pct = nextTier ? Math.min(100, (pts / nextTierPts) * 100) : 100;

  // ── Section 1: Hero — greeting + BIG points (Visual Hierarchy: points = largest element) ──
  // ── Section 2: QR scan card — 1 tap from home (3-second rule) ──
  // ── Section 3: 4 large quick-action buttons (Fitts's Law) ──
  // ── Section 4: Reward Loop strip — today's coupon + progress ──
  // ── Section 5: Daily missions (Gamification — 3 items max, Hick's Law) ──
  // ── Section 6: Products + Game CTA (Order Again + Dopamine) ──
  // Total: 6 sections (Hick's Law ≤ 8)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: H.bg, scrollbarWidth: "none", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>

      {/* ─── SECTION 1: Hero — greeting + largest-number-on-screen points ─── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 55%, #1A7A45 100%)`, paddingBottom: 88 }}>
        <div className="absolute -top-16 -right-16 size-52 rounded-full opacity-[0.06] bg-white pointer-events-none" />
        <div className="absolute top-20 -left-10 size-32 rounded-full opacity-[0.05] bg-white pointer-events-none" />

        <div className="relative px-5 pt-6">
          {/* Greeting (Personalization) */}
          <motion.div className="flex items-center gap-2 mb-4"
            initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38, ease }}>
            <GreetIcon size={13} color="rgba(244,239,216,0.65)" strokeWidth={1.6} />
            <p className="text-[13px]" style={{ color: "rgba(244,239,216,0.65)", fontFamily: fontSans }}>{greetText}</p>
          </motion.div>

          {/* BIG points — Visual Hierarchy Rule #10: points = biggest number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.46, delay: 0.08, ease }}>
            <div onClick={() => nav.push("points")} style={{ cursor: "pointer" }}>
              <p className="text-[11px] uppercase tracking-widest mb-1"
                style={{ color: "rgba(244,239,216,0.50)", fontFamily: fontSans }}>Upoint оноо · {user?.name || "Та"}</p>
              <p className="text-[56px] font-bold leading-none text-white"
                style={{ fontFamily: fontDisplay, letterSpacing: "-1px" }}>
                <CountUp to={pts} />
              </p>
            </div>

            {/* Tier badge + next tier nudge */}
            <div className="flex items-center gap-2 mt-2 mb-4">
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: H.gold }} onClick={() => nav.push("membership")}>
                <Medal size={11} color={H.secondary} strokeWidth={2.2} />
                <span className="text-[11px] font-bold" style={{ color: H.secondary, fontFamily: fontSans }}>{tier}</span>
              </button>
              {nextTier && (
                <span className="text-[12px]" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>
                  {nextTier} шат хүртэл <span style={{ color: H.gold, fontWeight: 700 }}>{(nextTierPts - pts).toLocaleString()}</span> дутуу
                </span>
              )}
            </div>

            {/* Tier progress bar — Reward Psychology #19 */}
            {nextTier && (
              <>
                <div className="mb-1" onClick={() => nav.push("rewardsProgress")} style={{ cursor: "pointer" }}>
                  <ProgressBar pct={pct} color={`linear-gradient(90deg, ${H.gold}, #FFD766)`} delay={0.4} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "rgba(244,239,216,0.40)", fontFamily: fontSans }}>{tier}</span>
                  <span className="text-[10px]" style={{ color: "rgba(244,239,216,0.40)", fontFamily: fontSans }}>{Math.round(pct)}% → {nextTier}</span>
                  <span className="text-[10px]" style={{ color: "rgba(244,239,216,0.40)", fontFamily: fontSans }}>{nextTier}</span>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* ─── SECTION 2: QR Scan — 1 tap from Home (3-second rule + Fitts's Law) ─── */}
      <motion.div className="px-5 -mt-8 mb-5"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.44, delay: 0.16, ease }}
        style={{ position: "relative", zIndex: 10 }}>
        <motion.button
          onClick={() => nav.push("qr")}
          className="w-full rounded-3xl overflow-hidden flex items-center gap-4 p-4"
          style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_FLOAT }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}>
          {/* QR mini preview */}
          <div className="size-14 rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})` }}>
            <QrCode size={28} color="white" strokeWidth={1.6} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>QR уншуулах</p>
            <p className="text-[12px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>
              Кассанд уншуулж оноо цуглуул · TLJ-{user?.id || 2840}
            </p>
          </div>
          {/* Pulse dot = system status (Nielsen #1) */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <motion.div className="size-3 rounded-full"
              style={{ background: H.primary }}
              animate={reduce ? undefined : { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }} />
            <ChevronRight size={14} color={H.muted} />
          </div>
        </motion.button>
      </motion.div>

      {/* ─── SECTION 3: 4 large quick-action buttons (Fitts's Law — largest touch targets) ─── */}
      <motion.div className="px-5 mb-6"
        variants={staggerContainer} initial="hidden" animate="show">
        <motion.div className="grid grid-cols-4 gap-3" variants={staggerContainer}>
          {([
            { Icon: ShoppingBag, label: "Захиалах",  action: () => onNav("shop"),        bg: H.pink,    fg: "white"     },
            { Icon: Ticket,      label: "Купон",     action: () => nav.push("coupons"),  bg: H.gold,    fg: H.secondary },
            { Icon: Gamepad2,    label: "Тоглоом",   action: () => onNav("game"),        bg: H.primary, fg: "white"     },
            { Icon: MapPin,      label: "Салбар",    action: () => nav.push("branches"), bg: H.secondary,fg: "white"    },
          ] as { Icon: React.ElementType; label: string; action: () => void; bg: string; fg: string }[]).map((a) => (
            <motion.button key={a.label} onClick={a.action} variants={staggerItem}
              className="flex flex-col items-center gap-2.5 py-4 rounded-2xl"
              style={{ background: H.card, border: `1px solid ${H.border}` }}
              whileTap={{ scale: 0.87 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}>
              <div className="size-12 rounded-2xl flex items-center justify-center"
                style={{ background: a.bg, boxShadow: `0 4px 14px ${a.bg}50` }}>
                <a.Icon size={22} color={a.fg} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: H.text, fontFamily: fontSans }}>{a.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* ─── SECTION 4: Reward Loop — coupon + promo (Reward Loop #15, Dopamine #20) ─── */}
      <div className="mb-6">
        <div className="px-5 mb-3">
          <SH title="Өнөөдрийн Санал" onAll={() => nav.push("coupons")} />
        </div>
        <motion.div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}
          variants={staggerContainer} initial="hidden" animate="show">
          {/* Active coupons — reward loop entry point */}
          {COUPONS.filter((c) => couponStatus(c, store.usedCoupons) === "available").map((c) => (
            <motion.div key={c.id} variants={staggerItemX}
              className="flex-shrink-0 w-[192px] rounded-2xl overflow-hidden"
              style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_CARD }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}>
              <div className="h-1.5 w-full" style={{ background: c.color }} />
              <div className="p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="size-8 rounded-xl flex items-center justify-center"
                    style={{ background: c.color + "18" }}>
                    <Ticket size={15} color={c.color} strokeWidth={1.8} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ fontFamily: fontDisplay, color: H.text }}>{c.title}</p>
                </div>
                <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{c.sub}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1">
                    <Clock size={10} color={H.muted} />
                    <span className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>{c.expiry}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                    style={{ background: c.color, fontFamily: fontSans }}>Ашиглах</span>
                </div>
              </div>
            </motion.div>
          ))}
          {/* Promo banner as card in same row */}
          <motion.div variants={staggerItemX}
            className="flex-shrink-0 w-[192px] rounded-2xl overflow-hidden relative"
            style={{ height: 148 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}>
            <CoverImg src="https://cdn.greensoft.mn/uploads/site/1200/photos/block/20260105135032_896d56912b534c1519806d4ba3ef5417.png" alt="promo" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(14,92,55,0.90) 100%)" }} />
            <div className="absolute bottom-0 p-3">
              <div className="flex items-center gap-1 mb-1">
                <Zap size={9} color="white" fill="white" />
                <span className="text-[9px] font-bold text-white" style={{ fontFamily: fontSans }}>ОНЦЛОХ</span>
              </div>
              <p className="text-white font-bold text-[13px] leading-snug" style={{ fontFamily: fontDisplay }}>Treasure Box</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(244,239,216,0.75)", fontFamily: fontSans }}>₮55,000</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── SECTION 5: Daily Missions — max 3 items (Hick's Law, Gamification #14) ─── */}
      <div className="px-5 mb-6">
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.10 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks size={16} color={H.primary} strokeWidth={2} />
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>Өдрийн Даалгавар</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: H.gold, color: H.secondary, fontFamily: fontSans }}>2/3</span>
            </div>
            <button className="text-[12px] font-medium" style={{ color: H.primary, fontFamily: fontSans }} onClick={() => nav.push("rewardsProgress")}>Бүгд</button>
          </div>
        </motion.div>
        {/* Only 3 missions (Hick's Law — limit choices) */}
        <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="show">
          {MISSIONS.slice(0, 3).map((m) => (
            <motion.div key={m.id} variants={staggerItem}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: m.done ? "rgba(14,92,55,0.07)" : H.card, border: `1px solid ${m.done ? "rgba(14,92,55,0.12)" : H.border}` }}>
              <motion.div
                initial={m.done ? { scale: 0.4, opacity: 0 } : {}}
                animate={m.done ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 400, delay: 0.2 }}>
                {m.done
                  ? <CheckCircle size={18} color={H.primary} strokeWidth={2} />
                  : <div className="size-[18px] rounded-full border-2 flex-shrink-0" style={{ borderColor: H.accent }} />}
              </motion.div>
              <p className="flex-1 text-[13px] font-medium"
                style={{ color: m.done ? H.muted : H.text, fontFamily: fontSans, textDecoration: m.done ? "line-through" : "none" }}>
                {m.text}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: m.done ? "rgba(14,92,55,0.08)" : "rgba(246,182,35,0.15)", color: m.done ? H.primary : H.gold, fontFamily: fontSans }}>
                +{m.xp} XP
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ─── SECTION 6: Products + Game CTA (Order Again + Dopamine Design) ─── */}
      <div className="mb-5">
        <motion.div className="px-5 mb-3" variants={fadeUp} initial="hidden" animate="show">
          <SH title="Онцлох бүтээгдэхүүн" onAll={() => onNav("shop")} />
        </motion.div>
        <motion.div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}
          variants={staggerContainer} initial="hidden" animate="show">
          {PRODUCTS.slice(0, 5).map((p) => (
            <motion.div key={p.id} variants={staggerItemX}
              className="flex-shrink-0 w-[128px] rounded-2xl overflow-hidden cursor-pointer"
              style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_CARD }}
              whileHover={canHover ? { y: -3, boxShadow: SHADOW_FLOAT } : {}}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={() => setSelectedProduct(p)}>
              <div className="relative w-full" style={{ paddingTop: "75%" }}>
                <CoverImg src={p.img} alt={p.name} />
                {/* "View" hint overlay */}
                <div className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.80)" }}>
                  <ChevronRight size={11} color={H.primary} strokeWidth={2.5} />
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold leading-snug line-clamp-2"
                  style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] font-bold" style={{ color: H.primary, fontFamily: fontSans }}>{fmt(p.price)}</span>
                  <motion.button className="size-5 rounded-full flex items-center justify-center"
                    style={{ background: H.primary }}
                    onClick={(e) => { e.stopPropagation(); onAddToCart(p.id); }}
                    whileTap={{ scale: 0.82 }}>
                    <Plus size={11} color="white" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Game CTA — Dopamine Design #20 */}
      <motion.div className="px-5 mb-8" variants={fadeUp} initial="hidden" animate="show">
        <motion.button onClick={() => onNav("game")}
          className="w-full rounded-3xl p-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${H.secondary} 0%, ${H.primary} 100%)`, boxShadow: SHADOW_CTA }}
          whileHover={canHover ? { scale: 1.02, boxShadow: "0 10px 32px rgba(14,92,55,0.36)" } : {}}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 22 }}>
          <motion.div className="size-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
            animate={reduce ? undefined : { rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}>
            <RotateCcw size={22} color="white" strokeWidth={2} />
          </motion.div>
          <div className="flex-1 text-left">
            <p className="font-bold text-white text-[15px]" style={{ fontFamily: fontDisplay }}>Хүрд эргүүлэх</p>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(244,239,216,0.65)", fontFamily: fontSans }}>
              3 эрх хүлээж байна · ₮10,000 тутам 1 эрх
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <Zap size={12} color={H.gold} fill={H.gold} />
            <span className="text-[11px] font-bold text-white" style={{ fontFamily: fontSans }}>3</span>
          </div>
        </motion.button>
      </motion.div>

      {/* Product detail sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={(pid, qty) => { onAddToCart(pid, qty); setSelectedProduct(null); }}
      />
    </div>
  );
}

// ─── Bakery Block Puzzle (brand-themed Block Blast) ───────────────────────────
// Every block is a TLJ product. Clearing rows/columns feeds the loyalty loop:
//   500 → 5 XP · 1000 → 20 Point · 2000 → Coffee Coupon · 3000 → Spin Ticket
// This is the reference template; other bakery games reuse the same reward gcycle.
const BLOCK_TYPES = [
  { Icon: Croissant, color: "#B57A16", bg: "#F6D98A" },
  { Icon: Cake,      color: "#C23A5C", bg: "#F6C6D3" },
  { Icon: Coffee,    color: "#6B4326", bg: "#DCC6B2" },
  { Icon: Cookie,    color: "#9A6327", bg: "#EAD3B4" },
  { Icon: Donut,     color: "#C24E82", bg: "#F4CBDF" },
];
const SHAPES: number[][][] = [
  [[0,0]],
  [[0,0],[0,1]],            [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]],      [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[1,0],[1,1]],      [[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0]],[[0,0],[1,0],[1,1],[1,2]],
  [[0,1],[1,0],[1,1],[1,2]],[[0,0],[0,1],[1,1],[1,2]],
];
const GAME_REWARDS = [
  { score: 500,  label: "5 XP",          Icon: Zap    },
  { score: 1000, label: "20 Point",      Icon: Star   },
  { score: 2000, label: "Coffee Coupon", Icon: Coffee },
  { score: 3000, label: "Spin Ticket",   Icon: Ticket },
];

type BPiece = { id: number; shape: number[][]; type: number };
let bPieceSeq = 0;
const randPiece = (): BPiece => ({
  id: ++bPieceSeq,
  shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  type: Math.floor(Math.random() * BLOCK_TYPES.length),
});
const emptyBoard = (): (number | null)[][] => Array.from({ length: 8 }, () => Array(8).fill(null));
const canPlace = (bd: (number | null)[][], shape: number[][], r: number, c: number) =>
  shape.every(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr][cc] === null;
  });
const canPlaceAnywhere = (bd: (number | null)[][], shape: number[][]) => {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (canPlace(bd, shape, r, c)) return true;
  return false;
};
const shapeBounds = (shape: number[][]) => ({
  rows: Math.max(...shape.map((s) => s[0])) + 1,
  cols: Math.max(...shape.map((s) => s[1])) + 1,
});

function BlockPuzzleGame({ open, onClose, onScore }: { open: boolean; onClose: () => void; onScore?: (score: number, xp: number, upoints: number) => void }) {
  const reduce = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<(number | null)[][]>(emptyBoard);
  const [tray,  setTray]  = useState<BPiece[]>(() => [randPiece(), randPiece(), randPiece()]);
  const [sel,   setSel]   = useState(0);
  const [score, setScore] = useState(0);
  const [best,  setBest]  = useState(0);
  const [combo, setCombo] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [toast, setToast]   = useState<{ label: string; Icon: typeof Zap } | null>(null);
  const [hover, setHover]   = useState<{ r: number; c: number } | null>(null);
  const [over,  setOver]    = useState(false);
  const [scored, setScored] = useState(false);

  useEffect(() => { if (over && onScore && !scored) { setScored(true); onScore(score, Math.floor(score / 10), 0); } }, [over, score, onScore, scored]);

  const reset = () => {
    setBoard(emptyBoard()); setTray([randPiece(), randPiece(), randPiece()]);
    setSel(0); setScore(0); setCombo(0); setEarned([]); setToast(null); setHover(null); setOver(false); setScored(false);
  };

  const place = (r: number, c: number) => {
    const piece = tray[sel];
    if (over || !piece || !canPlace(board, piece.shape, r, c)) return;
    const nb = board.map((row) => row.slice());
    piece.shape.forEach(([dr, dc]) => { nb[r + dr][c + dc] = piece.type; });

    const fullRows: number[] = [], fullCols: number[] = [];
    for (let i = 0; i < 8; i++) if (nb[i].every((x) => x !== null)) fullRows.push(i);
    for (let j = 0; j < 8; j++) { let f = true; for (let i = 0; i < 8; i++) if (nb[i][j] === null) { f = false; break; } if (f) fullCols.push(j); }
    const lines = fullRows.length + fullCols.length;

    let nt = tray.filter((_, i) => i !== sel);
    if (nt.length === 0) nt = [randPiece(), randPiece(), randPiece()];
    setTray(nt); setSel(0); setHover(null);

    if (lines > 0) {
      fullRows.forEach((i) => { for (let j = 0; j < 8; j++) nb[i][j] = -1; });
      fullCols.forEach((j) => { for (let i = 0; i < 8; i++) nb[i][j] = -1; });
      setBoard(nb);
      const nc = combo + 1; setCombo(nc);
      setScore((s) => s + piece.shape.length + lines * 100 + (nc > 1 ? nc * 20 : 0));
      setTimeout(() => setBoard((bd) => bd.map((row) => row.map((x) => (x === -1 ? null : x)))), 200);
    } else {
      setBoard(nb); setCombo(0); setScore((s) => s + piece.shape.length);
    }
  };

  // Reward milestones — one toast per newly-crossed threshold
  useEffect(() => {
    const rw = GAME_REWARDS.find((m) => score >= m.score && !earned.includes(m.label));
    if (rw) { setEarned((e) => [...e, rw.label]); setToast({ label: rw.label, Icon: rw.Icon }); }
  }, [score]);           // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  // Game over — no tray piece fits (skip while a clear-flash is settling)
  useEffect(() => {
    if (over || board.some((row) => row.some((x) => x === -1))) return;
    if (tray.length && tray.every((p) => !canPlaceAnywhere(board, p.shape))) {
      setBest((b) => Math.max(b, score)); setOver(true);
    }
  }, [board, tray]);     // eslint-disable-line react-hooks/exhaustive-deps

  const nextReward = GAME_REWARDS.find((m) => !earned.includes(m.label));
  const ghost = new Set<string>();
  if (hover && tray[sel] && canPlace(board, tray[sel].shape, hover.r, hover.c))
    tray[sel].shape.forEach(([dr, dc]) => ghost.add(`${hover.r + dr}-${hover.c + dc}`));

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: H.bg }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast, ease }}>

          {/* ── Header ── */}
          <div className="flex-shrink-0 relative"
            style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)`,
              paddingTop: SAFE_TOP }}>
            <div className="flex items-center gap-3 px-4 pb-4">
              <motion.button aria-label="Хаах"
                className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", border: "0.7px solid rgba(255,255,255,0.22)" }}
                onClick={onClose} whileTap={{ scale: 0.9 }}>
                <X size={17} color="white" strokeWidth={2.2} />
              </motion.button>
              <div className="flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[1.1px]" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>Block Bakery</p>
                <p className="text-[22px] font-bold leading-none text-white" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{score.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(244,239,216,0.45)", fontFamily: fontSans }}>Рекорд</p>
                <p className="text-[15px] font-bold text-white" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{Math.max(best, score).toLocaleString()}</p>
              </div>
            </div>

            {/* Reward ladder */}
            <div className="px-4 pb-3 flex items-center gap-1.5">
              {GAME_REWARDS.map((m) => {
                const got = earned.includes(m.label);
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.16)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (score / m.score) * 100)}%`, background: got ? H.gold : "rgba(246,182,35,0.7)", transition: "width 0.4s ease" }} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <m.Icon size={9} color={got ? H.gold : "rgba(244,239,216,0.5)"} strokeWidth={2} />
                      <span className="text-[8px] font-semibold" style={{ color: got ? H.gold : "rgba(244,239,216,0.5)", fontFamily: fontSans }}>{m.score >= 1000 ? `${m.score / 1000}k` : m.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Board ── */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5"
            style={{ paddingBottom: SAFE_BOTTOM }}>

            <div ref={boardRef} className="rounded-2xl p-1.5"
              style={{ background: H.card, border: `1px solid ${H.border}`, width: "min(86vw, 360px)",
                boxShadow: "0 8px 30px rgba(14,92,55,0.10)", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3 }}>
              {board.map((row, r) => row.map((v, c) => {
                const g = ghost.has(`${r}-${c}`);
                const filled = v !== null && v >= 0;
                const flash  = v === -1;
                const bt = filled ? BLOCK_TYPES[v as number] : null;
                return (
                  <button key={`${r}-${c}`} data-pos={`${r}-${c}`}
                    onClick={() => place(r, c)}
                    onMouseEnter={() => setHover({ r, c })}
                    onMouseLeave={() => setHover((h) => (h && h.r === r && h.c === c ? null : h))}
                    className="relative rounded-md flex items-center justify-center"
                    style={{
                      aspectRatio: "1 / 1",
                      background: flash ? H.gold : bt ? bt.bg : g ? (BLOCK_TYPES[tray[sel].type].bg + "cc") : "rgba(14,92,55,0.045)",
                      border: g && !filled ? `1.5px solid ${BLOCK_TYPES[tray[sel].type].color}` : "none",
                      transition: "background 0.15s ease",
                    }}>
                    {bt && <bt.Icon size={15} color={bt.color} strokeWidth={2} />}
                  </button>
                );
              }))}
            </div>

            {/* Hint */}
            <p className="text-[11px] text-center" style={{ color: H.muted, fontFamily: fontSans }}>
              Хэсгээ сонгоод самбар дээр дарж байрлуул · Мөр/багана дүүргэвэл цэвэрлэгдэнэ
            </p>

            {/* ── Tray (3 pieces) ── */}
            <div className="flex items-center justify-center gap-3 w-full">
              {tray.map((p, i) => {
                const b = shapeBounds(p.shape);
                const on = i === sel;
                const bt = BLOCK_TYPES[p.type];
                return (
                  <motion.button key={p.id}
                    onClick={() => setSel(i)}
                    drag
                    onDragStart={() => { setSel(i); setHover(null); }}
                    onDrag={(_, info) => {
                      const el = document.elementFromPoint(info.point.x, info.point.y);
                      const cellEl = el?.closest("[data-pos]");
                      if (cellEl) {
                        const [r, c] = cellEl.getAttribute("data-pos")!.split("-").map(Number);
                        setHover({ r, c });
                      } else {
                        setHover(null);
                      }
                    }}
                    onDragEnd={(_, info) => {
                      const el = document.elementFromPoint(info.point.x, info.point.y);
                      const cellEl = el?.closest("[data-pos]");
                      if (cellEl) {
                        const [r, c] = cellEl.getAttribute("data-pos")!.split("-").map(Number);
                        place(r, c);
                      }
                      setHover(null);
                    }}
                    whileDrag={{ scale: 1.08, zIndex: 20, boxShadow: SHADOW_FLOAT, cursor: "grabbing" }}
                    className="rounded-2xl p-3 flex items-center justify-center"
                    style={{ background: on ? bt.bg : H.card, border: `2px solid ${on ? bt.color : H.border}`,
                      minWidth: 84, minHeight: 84, boxShadow: on ? `0 6px 18px ${bt.color}33` : "none" }}
                    animate={{ scale: on ? 1.04 : 1 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${b.cols}, 1fr)`, gap: 3 }}>
                      {Array.from({ length: b.rows * b.cols }).map((_, k) => {
                        const rr = Math.floor(k / b.cols), cc = k % b.cols;
                        const fill = p.shape.some(([dr, dc]) => dr === rr && dc === cc);
                        return <div key={k} style={{ width: 15, height: 15, borderRadius: 4,
                          background: fill ? bt.color : "transparent" }} />;
                      })}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Reward toast ── */}
          <AnimatePresence>
            {toast && (
              <motion.div className="fixed left-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{ top: `calc(${SAFE_TOP} + 60px)`, background: H.card,
                  border: `1px solid ${H.gold}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", x: "-50%" }}
                initial={{ opacity: 0, y: reduce ? 0 : -16, scale: reduce ? 1 : 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 22 }}>
                <div className="size-8 rounded-full flex items-center justify-center" style={{ background: "rgba(246,182,35,0.15)" }}>
                  <toast.Icon size={16} color={H.gold} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{toast.label} нээгдлээ!</p>
                  <p className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>Лояалти дансанд бүртгэгдэнэ</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Game over ── */}
          <AnimatePresence>
            {over && (
              <motion.div className="fixed inset-0 z-[65] flex items-center justify-center px-8"
                style={{ background: "rgba(0,0,0,0.55)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="w-full rounded-3xl p-6 text-center"
                  style={{ background: H.card }}
                  initial={{ scale: reduce ? 1 : 0.9, opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                  <div className="size-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(14,92,55,0.08)" }}>
                    <Trophy size={26} color={H.gold} fill={H.gold} />
                  </div>
                  <p className="text-[20px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Тоглоом дууслаа</p>
                  <p className="text-[13px] mt-1" style={{ fontFamily: fontSans, color: H.muted }}>Оноо</p>
                  <p className="text-[40px] font-bold leading-none my-1" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{score.toLocaleString()}</p>
                  {earned.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 mb-1">
                      {earned.map((e) => (
                        <span key={e} className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(246,182,35,0.14)", color: "#9A7B12", fontFamily: fontSans }}>
                          <Sparkles size={11} color={H.gold} /> {e}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-5">
                    <motion.button onClick={onClose} whileTap={{ scale: 0.96 }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-[14px]"
                      style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Хаах</motion.button>
                    <motion.button onClick={reset} whileTap={{ scale: 0.96 }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-[14px] text-white"
                      style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>Дахин тоглох</motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Merge Bakery (premium merge game) ────────────────────────────────────────
// Single evolution line: merge two identical items → one item a level higher.
// L7 Signature Cake → Coupon · L9 Golden Masterpiece → Spin Ticket. Every merge = XP.
type MItem = { name: string; Icon: typeof Cake; color: string; bg: string };
const MERGE_ITEMS: (MItem | null)[] = [
  null,
  { name: "Гурил",              Icon: Wheat,     color: "#8A6D3B", bg: "#EFE3C8" },
  { name: "Зуурмаг",            Icon: Cookie,    color: "#9A6327", bg: "#EAD9BE" },
  { name: "Круассан",           Icon: Croissant, color: "#B57A16", bg: "#F6E1A8" },
  { name: "Шоко Круассан",      Icon: Croissant, color: "#5B3A29", bg: "#DFCBBB" },
  { name: "Премиум Талх",       Icon: Donut,     color: "#C06A2E", bg: "#F3D9BE" },
  { name: "Мини Кейк",          Icon: Cake,      color: "#D2749A", bg: "#F7DCE6" },
  { name: "Signature Cake",     Icon: Cake,      color: "#E94D72", bg: "#F8CFDB" },
  { name: "Баярын Бялуу",       Icon: Cake,      color: "#C23A5C", bg: "#F6C6D3" },
  { name: "Golden Masterpiece", Icon: Crown,     color: "#B8860B", bg: "#FBEBB0" },
];
const MAX_LEVEL = 9;
const MERGE_REWARDS = [
  { level: 5, label: "Премиум нээгдлээ", Icon: Sparkles as typeof Cake },
  { level: 7, label: "Coffee Coupon",    Icon: Ticket   as typeof Cake },
  { level: 9, label: "Golden · Spin Ticket", Icon: Crown as typeof Cake },
];
let mergeBurstKey = 0;
const spawnLevel = () => (Math.random() < 0.78 ? 1 : 2);
const initMergeBoard = () => {
  const b: (number | null)[] = Array(36).fill(null);
  const spots = [...Array(36).keys()].sort(() => Math.random() - 0.5).slice(0, 6);
  spots.forEach((s) => { b[s] = spawnLevel(); });
  return b;
};

function MergeBakeryGame({ open, onClose, onScore }: { open: boolean; onClose: () => void; onScore?: (score: number, xp: number, upoints: number) => void }) {
  const reduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<(number | null)[]>(initMergeBoard);
  const [sel,   setSel]   = useState<number | null>(null);
  const [xp,    setXp]    = useState(0);
  const [seen,  setSeen]  = useState<number[]>([1]);
  const [burst, setBurst] = useState<{ i: number; k: number } | null>(null);
  const [toast, setToast] = useState<{ label: string; Icon: typeof Cake } | null>(null);
  const [full,  setFull]  = useState(false);
  const [scored, setScored] = useState(false);

  useEffect(() => { if (full && onScore && !scored) { setScored(true); onScore(xp, xp, 0); } }, [full, xp, onScore, scored]);

  const reset = () => { setBoard(initMergeBoard()); setSel(null); setXp(0); setSeen([1]); setBurst(null); setToast(null); setFull(false); setScored(false); };

  const bake = () => {
    const empties = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
    if (empties.length === 0) return;
    const nb = [...board]; nb[empties[Math.floor(Math.random() * empties.length)]] = spawnLevel();
    setBoard(nb);
  };

  const tap = (i: number) => {
    const v = board[i];
    if (sel === null) { if (v !== null) setSel(i); return; }
    if (sel === i)    { setSel(null); return; }
    const sv = board[sel];
    if (v === null) {                                   // move
      const nb = [...board]; nb[i] = sv; nb[sel] = null; setBoard(nb); setSel(null); return;
    }
    if (v === sv && v < MAX_LEVEL) {                     // merge
      const nl = v + 1;
      const nb = [...board]; nb[i] = nl; nb[sel] = null; setBoard(nb); setSel(null);
      setXp((x) => x + (nl >= 5 ? nl * 2 : nl));
      setSeen((s) => (s.includes(nl) ? s : [...s, nl]));
      if (!reduce) setBurst({ i, k: ++mergeBurstKey });
      const rw = MERGE_REWARDS.find((r) => r.level === nl);
      if (rw) setToast({ label: rw.label, Icon: rw.Icon });
      return;
    }
    setSel(i);                                          // switch selection
  };

  const handleDragEnd = (sourceIdx: number, info: { point: { x: number; y: number } }) => {
    if (!info.point) { setSel(null); return; }
    const els = document.elementsFromPoint(info.point.x, info.point.y);
    const cellEl = els.find((el) => el.hasAttribute("data-cell"));
    if (!cellEl) { setSel(null); return; }
    const targetIdx = Number(cellEl.getAttribute("data-cell"));
    if (targetIdx === sourceIdx) { setSel(null); return; }

    const sv = board[sourceIdx];
    const tv = board[targetIdx];

    if (tv === null) {                                   // move
      const nb = [...board]; nb[targetIdx] = sv; nb[sourceIdx] = null; setBoard(nb); setSel(null); return;
    }
    if (tv === sv && tv < MAX_LEVEL) {                    // merge
      const nl = tv + 1;
      const nb = [...board]; nb[targetIdx] = nl; nb[sourceIdx] = null; setBoard(nb); setSel(null);
      setXp((x) => x + (nl >= 5 ? nl * 2 : nl));
      setSeen((s) => (s.includes(nl) ? s : [...s, nl]));
      if (!reduce) setBurst({ i: targetIdx, k: ++mergeBurstKey });
      const rw = MERGE_REWARDS.find((r) => r.level === nl);
      if (rw) setToast({ label: rw.label, Icon: rw.Icon });
      return;
    }
    setSel(null);                                        // different items — snap back
  };

  useEffect(() => { if (!burst) return; const t = setTimeout(() => setBurst(null), 550); return () => clearTimeout(t); }, [burst]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (board.some((c) => c === null)) { setFull(false); return; }
    const counts: Record<number, number> = {};
    let mergeable = false;
    board.forEach((c) => { if (c !== null && c < MAX_LEVEL) { counts[c] = (counts[c] || 0) + 1; if (counts[c] >= 2) mergeable = true; } });
    if (!mergeable) setFull(true);
  }, [board]);

  const highest = Math.max(...seen);
  const pct = Math.round((seen.length / MAX_LEVEL) * 100);
  const nextGoal = MERGE_ITEMS[Math.min(highest + 1, MAX_LEVEL)];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: H.bg }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast, ease }}>

          {/* ── Header ── */}
          <div className="flex-shrink-0 relative"
            style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)`,
              paddingTop: SAFE_TOP }}>
            <div className="flex items-center gap-3 px-4 pb-4">
              <motion.button aria-label="Хаах"
                className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", border: "0.7px solid rgba(255,255,255,0.22)" }}
                onClick={onClose} whileTap={{ scale: 0.9 }}>
                <X size={17} color="white" strokeWidth={2.2} />
              </motion.button>
              <div className="flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[1.1px]" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>Merge Bakery</p>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} color={H.gold} fill={H.gold} />
                  <p className="text-[22px] font-bold leading-none text-white" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{xp}</p>
                  <span className="text-[11px] mt-1" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>XP</span>
                </div>
              </div>
              {/* Collection */}
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(244,239,216,0.45)", fontFamily: fontSans }}>Цуглуулга</p>
                <p className="text-[15px] font-bold text-white" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{pct}%</p>
              </div>
            </div>

            {/* Collection dots — one per evolution level */}
            <div className="px-4 pb-3 flex items-center gap-1.5">
              {MERGE_ITEMS.slice(1).map((it, idx) => {
                const lvl = idx + 1, got = seen.includes(lvl);
                return (
                  <div key={lvl} className="flex-1 h-1.5 rounded-full"
                    style={{ background: got ? (lvl >= 7 ? H.gold : "rgba(255,255,255,0.85)") : "rgba(255,255,255,0.18)" }} />
                );
              })}
            </div>
          </div>

          {/* ── Board ── */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>

            <div ref={gridRef} style={{ width: "min(90vw, 384px)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {board.map((v, i) => {
                const it = v !== null ? MERGE_ITEMS[v] : null;
                const isSel = sel === i;
                return (
                  <motion.button key={i} data-cell={i}
                    onClick={() => tap(i)}
                    drag={v !== null}
                    dragConstraints={gridRef}
                    dragElastic={0.05}
                    onDragStart={() => setSel(i)}
                    onDragEnd={(_, info) => handleDragEnd(i, info)}
                    className="relative rounded-2xl flex items-center justify-center overflow-visible"
                    style={{
                      aspectRatio: "1 / 1",
                      background: it ? it.bg : "rgba(14,92,55,0.045)",
                      border: isSel ? `2px solid ${it?.color}` : it ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(14,92,55,0.06)",
                      boxShadow: isSel ? `0 10px 22px ${it?.color}44` : it ? "0 2px 6px rgba(14,92,55,0.06)" : "none",
                    }}
                    animate={{ scale: isSel ? 1.09 : 1 }}
                    whileDrag={v !== null ? { scale: 1.12, zIndex: 10, boxShadow: SHADOW_FLOAT } : undefined}
                    whileTap={v === null ? { scale: 0.94 } : undefined}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                    {it && (
                      <motion.div key={v} className="flex items-center justify-center"
                        initial={{ scale: reduce ? 1 : 1.35, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 440, damping: 20 }}>
                        <it.Icon size={26} color={it.color} strokeWidth={2}
                          fill={v! >= 7 ? it.color : "none"} fillOpacity={v! >= 7 ? 0.14 : 0} />
                        {v! >= 3 && (
                          <span className="absolute bottom-1 right-1.5 text-[8px] font-bold"
                            style={{ color: it.color, fontFamily: fontSans, opacity: 0.7 }}>{v}</span>
                        )}
                      </motion.div>
                    )}
                    {/* Merge sparkle burst */}
                    <AnimatePresence>
                      {burst?.i === i && (
                        <motion.div key={burst.k} className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <motion.div key={n} className="absolute"
                              initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                              animate={{ scale: 1, opacity: 0, x: Math.cos((n / 6) * 6.283) * 24, y: Math.sin((n / 6) * 6.283) * 24 }}
                              transition={{ duration: 0.5, ease }}>
                              <Sparkles size={11} color={H.gold} fill={H.gold} />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>

            {/* Next-goal hint */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: H.card, border: `1px solid ${H.border}` }}>
              {nextGoal && highest < MAX_LEVEL ? (
                <>
                  <nextGoal.Icon size={14} color={nextGoal.color} strokeWidth={2} />
                  <span className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>Дараагийн зорилго: <span style={{ color: H.text, fontWeight: 700 }}>{nextGoal.name}</span></span>
                </>
              ) : (
                <span className="text-[11px]" style={{ fontFamily: fontSans, color: H.primary, fontWeight: 700 }}>Бүх шатыг нээлээ! 🏆</span>
              )}
            </div>
          </div>

          {/* ── Magic Oven (generator) ── */}
          <div className="flex-shrink-0 px-5" style={{ paddingBottom: SAFE_BOTTOM }}>
            <motion.button onClick={bake}
              className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
              style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}
              whileTap={{ scale: 0.97 }}>
              <Sparkles size={18} color={H.gold} fill={H.gold} />
              Магик зуух · Гурил нэм
            </motion.button>
            <p className="text-[10px] text-center mt-2" style={{ fontFamily: fontSans, color: H.muted }}>
              Хэсэг сонгоод ижил хэсэг рүү нийлүүл → дээд зэрэглэл болно
            </p>
          </div>

          {/* ── Reward toast ── */}
          <AnimatePresence>
            {toast && (
              <motion.div className="fixed left-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{ top: `calc(${SAFE_TOP} + 60px)`, background: H.card, border: `1px solid ${H.gold}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", x: "-50%" }}
                initial={{ opacity: 0, y: reduce ? 0 : -16, scale: reduce ? 1 : 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 22 }}>
                <div className="size-8 rounded-full flex items-center justify-center" style={{ background: "rgba(246,182,35,0.15)" }}>
                  <toast.Icon size={16} color={H.gold} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{toast.label}</p>
                  <p className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>Лояалти дансанд бүртгэгдэнэ</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Board full (stuck) summary ── */}
          <AnimatePresence>
            {full && (
              <motion.div className="fixed inset-0 z-[65] flex items-center justify-center px-8"
                style={{ background: "rgba(0,0,0,0.55)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="w-full rounded-3xl p-6 text-center" style={{ background: H.card }}
                  initial={{ scale: reduce ? 1 : 0.9, opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                  <div className="size-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(14,92,55,0.08)" }}>
                    <Trophy size={26} color={H.gold} fill={H.gold} />
                  </div>
                  <p className="text-[20px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Самбар дүүрлээ</p>
                  <p className="text-[13px] mt-1 mb-3" style={{ fontFamily: fontSans, color: H.muted }}>
                    {xp} XP · Цуглуулга {pct}% · Дээд: {MERGE_ITEMS[highest]?.name}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <motion.button onClick={onClose} whileTap={{ scale: 0.96 }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-[14px]"
                      style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Хаах</motion.button>
                    <motion.button onClick={reset} whileTap={{ scale: 0.96 }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-[14px] text-white"
                      style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>Дахин эхлэх</motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Weekend Quiz (premium knowledge challenge) ───────────────────────────────
// Baasan 18:00 → Nyam 23:59. 5 random questions, 20s each, time + combo bonus.
// >80% → 50 Point · Perfect → Spin Ticket + Coupon. Every completion → +100 XP.
const QUIZ_POOL = [
  { cat: "TLJ",         q: "TOUS les JOURS гэдэг нэр ямар утгатай вэ?", opts: ["Every Day", "Fresh Bread", "Bakery House", "French Cafe"], correct: 0, exp: "Франц хэлээр «Tous les Jours» = «Өдөр бүр»." },
  { cat: "Coffee",      q: "Latte-д хамгийн их ордог орц юу вэ?",        opts: ["Milk", "Chocolate", "Butter", "Cream"],                  correct: 0, exp: "Латте нь халуун сүү + эспрессогоор голдуу хийгддэг." },
  { cat: "Bread",       q: "Круассан ямар улсаас гаралтай вэ?",          opts: ["Austria", "France", "Italy", "Belgium"],                 correct: 0, exp: "Круассан анх Австрийн «kipferl»-ээс үүссэн." },
  { cat: "Dessert",     q: "Cheesecake-ийн үндсэн орц юу вэ?",           opts: ["Cream Cheese", "Butter", "Yogurt", "Milk"],              correct: 0, exp: "Cheesecake нь cream cheese дээр суурилдаг." },
  { cat: "General",     q: "Ус, цайны дараа дэлхийд их уудаг халуун ундаа?", opts: ["Tea", "Coffee", "Cocoa", "Juice"],                   correct: 0, exp: "Цай бол дэлхийд хамгийн өргөн хэрэглэгддэг халуун ундаа." },
  { cat: "Bread",       q: "Багет ямар улсын бэлэг тэмдэг талх вэ?",     opts: ["France", "Germany", "Italy", "Spain"],                   correct: 0, exp: "Багет бол Францын сонгодог урт талх." },
  { cat: "Dessert",     q: "Тирамису ямар улсаас гаралтай вэ?",          opts: ["Italy", "France", "Greece", "Turkey"],                   correct: 0, exp: "Тирамису бол Италийн алдартай амттан." },
  { cat: "Ingredients", q: "Талх хөөлгөхөд ямар орц шаардлагатай вэ?",   opts: ["Yeast", "Sugar", "Salt", "Oil"],                         correct: 0, exp: "Мөөгөнцөр (yeast) талхыг исгэж зөөлөн болгодог." },
];
const QUIZ_COUNT = 5;
const Q_MS = 20000;
const shuffle = <T,>(a: T[]): T[] => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
type QQ = { cat: string; q: string; opts: string[]; correct: number; exp: string };
const buildQuiz = (): QQ[] =>
  shuffle(QUIZ_POOL).slice(0, QUIZ_COUNT).map((qq) => {
    const order = shuffle([0, 1, 2, 3]);
    return { ...qq, opts: order.map((i) => qq.opts[i]), correct: order.indexOf(qq.correct) };
  });

// Countdown lives in its own component so its 100ms ticks re-render ONLY the little circle —
// never the QuizGame drawer wrapper (which would fight the slide-in animation).
function QuizTimer({ active, paused, resetKey, onExpire, remainRef }: {
  active: boolean; paused: boolean; resetKey: number; onExpire: () => void; remainRef: { current: number };
}) {
  const reduce = useReducedMotion();
  const [remain, setRemain] = useState(Q_MS);
  const firedRef = useRef(false);
  useEffect(() => { setRemain(Q_MS); remainRef.current = Q_MS; firedRef.current = false; }, [resetKey]); // eslint-disable-line
  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(() => setRemain((r) => {
      const nr = Math.max(0, r - 100);
      remainRef.current = nr;
      if (nr <= 0 && !firedRef.current) { firedRef.current = true; clearInterval(id); onExpire(); }
      return nr;
    }), 100);
    return () => clearInterval(id);
  }, [active, paused, resetKey]); // eslint-disable-line
  const frac = remain / Q_MS;
  const color = frac > 0.5 ? H.primary : frac > 0.25 ? H.gold : H.pink;
  const R = 30, C = 2 * Math.PI * R;
  return (
    <motion.div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}
      animate={!reduce && remain <= 5000 && !paused ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ repeat: remain <= 5000 && !paused ? Infinity : 0, duration: 0.6 }}>
      <svg width="44" height="44" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(14,92,55,0.10)" strokeWidth="6" />
        <circle cx="34" cy="34" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 34 34)"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold"
        style={{ fontFamily: fontDisplay, color, fontVariantNumeric: "tabular-nums" }}>
        {Math.ceil(remain / 1000)}
      </span>
    </motion.div>
  );
}

function QuizGame({ open, onClose, onScore }: { open: boolean; onClose: () => void; onScore?: (score: number, xp: number, upoints: number) => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase]   = useState<"intro" | "playing" | "result">("intro");
  const [quiz,  setQuiz]    = useState<QQ[]>(buildQuiz);
  const [qIdx,  setQIdx]    = useState(0);
  const [sel,   setSel]     = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore]   = useState(0);
  const [right, setRight]   = useState(0);
  const [combo, setCombo]   = useState(0);
  const advRef    = useRef<ReturnType<typeof setTimeout>>();
  const remainRef = useRef(Q_MS);
  const [scored, setScored] = useState(false);

  useEffect(() => { if (phase === "result" && onScore && !scored) { setScored(true); onScore(score, 100, Math.floor(score / 10)); } }, [phase, score, onScore, scored]);

  const q = quiz[qIdx];

  const start = () => {
    setQuiz(buildQuiz()); setQIdx(0); setSel(null); setLocked(false);
    setScore(0); setRight(0); setCombo(0); setPhase("playing"); setScored(false);
  };

  const answer = (choice: number | null) => {
    if (locked || phase !== "playing") return;
    setLocked(true); setSel(choice);
    const correct = choice !== null && choice === q.correct;
    if (correct) {
      const secLeft = Math.ceil(remainRef.current / 1000);
      setScore((s) => s + 100 + secLeft * 2 + (combo >= 1 ? combo * 10 : 0));
      setRight((r) => r + 1); setCombo((c) => c + 1);
    } else setCombo(0);
    advRef.current = setTimeout(() => {
      if (qIdx < quiz.length - 1) { setQIdx((i) => i + 1); setSel(null); setLocked(false); }
      else setPhase("result");
    }, 2200);
  };

  useEffect(() => () => clearTimeout(advRef.current), []);
  useEffect(() => { if (open) { setPhase("intro"); clearTimeout(advRef.current); } }, [open]);

  const accuracy = Math.round((right / QUIZ_COUNT) * 100);
  const perfect  = right === QUIZ_COUNT;

  return createPortal(
    open ? (
        <motion.div className="fixed inset-0 z-[60] flex flex-col" style={{ background: H.bg }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast, ease }}>

          {/* ── INTRO ── */}
          {phase === "intro" && (
            <div className="flex-1 flex flex-col" style={{ paddingTop: SAFE_TOP }}>
              <div className="flex items-center px-4 h-12">
                <motion.button aria-label="Хаах" className="size-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(14,92,55,0.08)" }} onClick={onClose} whileTap={{ scale: 0.9 }}>
                  <X size={17} color={H.text} strokeWidth={2.2} />
                </motion.button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
                <motion.div className="size-20 rounded-3xl flex items-center justify-center mb-1"
                  style={{ background: `linear-gradient(145deg, ${H.secondary}, ${H.primary})`, boxShadow: SHADOW_MODAL }}
                  initial={{ scale: reduce ? 1 : 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <Brain size={38} color="white" strokeWidth={1.8} />
                </motion.div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(246,182,35,0.16)", color: "#9A7B12", fontFamily: fontSans }}>
                  <span className="size-1.5 rounded-full" style={{ background: H.gold }} /> Энэ амралт идэвхтэй
                </span>
                <h1 className="text-[28px] font-bold leading-tight" style={{ fontFamily: fontDisplay, color: H.text }}>Weekend Quiz</h1>
                <p className="text-[13px] leading-relaxed" style={{ fontFamily: fontSans, color: H.muted }}>
                  Баасан 18:00 – Ням 23:59 · {QUIZ_COUNT} асуулт · Асуулт тус бүр 20 сек.<br />Долоо хоног бүр шинэ асуулт.
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {[{ Icon: Zap, t: "+100 XP" }, { Icon: Star, t: "50 Point" }, { Icon: Ticket, t: "Coupon" }].map((r) => (
                    <div key={r.t} className="flex flex-col items-center gap-1">
                      <div className="size-10 rounded-2xl flex items-center justify-center" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                        <r.Icon size={18} color={H.gold} strokeWidth={2} />
                      </div>
                      <span className="text-[10px]" style={{ fontFamily: fontSans, color: H.muted }}>{r.t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
                <motion.button onClick={start} whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
                  style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}>
                  <Brain size={18} color="white" /> Эхлэх
                </motion.button>
              </div>
            </div>
          )}

          {/* ── PLAYING ── */}
          {phase === "playing" && q && (
            <div className="flex-1 flex flex-col" style={{ paddingTop: SAFE_TOP }}>
              {/* Top bar: progress + timer */}
              <div className="px-5 flex items-center gap-3 h-14">
                <motion.button aria-label="Хаах" className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(14,92,55,0.08)" }} onClick={onClose} whileTap={{ scale: 0.9 }}>
                  <X size={16} color={H.text} strokeWidth={2.2} />
                </motion.button>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold" style={{ fontFamily: fontSans, color: H.muted }}>Асуулт {qIdx + 1}/{quiz.length}</span>
                    <span className="text-[11px] font-bold" style={{ fontFamily: fontSans, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{score} оноо</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(14,92,55,0.10)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: H.primary }}
                      animate={{ width: `${((qIdx + (locked ? 1 : 0)) / quiz.length) * 100}%` }}
                      transition={{ duration: 0.3, ease }} />
                  </div>
                </div>
                {/* Circular timer — isolated child; its 100ms ticks never re-render the drawer */}
                <QuizTimer active={phase === "playing"} paused={locked} resetKey={qIdx}
                  onExpire={() => answer(null)} remainRef={remainRef} />
              </div>

              {/* Question card */}
              <div className="flex-1 px-5 pt-4 flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={qIdx}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease }}>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-block mb-3"
                      style={{ background: "rgba(14,92,55,0.08)", color: H.primary, fontFamily: fontSans }}>{q.cat}</span>
                    <h2 className="text-[22px] font-bold leading-snug mb-5" style={{ fontFamily: fontDisplay, color: H.text }}>{q.q}</h2>

                    <div className="flex flex-col gap-3">
                      {q.opts.map((opt, i) => {
                        const isCorrect = i === q.correct;
                        const state = !locked ? "idle" : isCorrect ? "correct" : i === sel ? "wrong" : "dim";
                        const bg = state === "correct" ? "rgba(14,92,55,0.10)" : state === "wrong" ? "rgba(233,77,114,0.10)" : H.card;
                        const bd = state === "correct" ? H.primary : state === "wrong" ? H.pink : H.border;
                        return (
                          <motion.button key={i} onClick={() => answer(i)} disabled={locked}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left"
                            style={{ background: bg, border: `1.5px solid ${bd}`, opacity: state === "dim" ? 0.5 : 1 }}
                            whileTap={!locked ? { scale: 0.98 } : {}}
                            animate={state === "wrong" && !reduce ? { x: [0, -7, 7, -5, 5, 0] } : {}}
                            transition={{ duration: 0.4 }}>
                            <div className="size-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                              style={{ background: state === "correct" ? H.primary : state === "wrong" ? H.pink : "rgba(14,92,55,0.07)",
                                color: state === "correct" || state === "wrong" ? "white" : H.muted, fontFamily: fontSans }}>
                              {state === "correct" ? <CheckCircle size={16} color="white" strokeWidth={2.4} />
                                : state === "wrong" ? <X size={15} color="white" strokeWidth={3} />
                                : String.fromCharCode(65 + i)}
                            </div>
                            <span className="text-[15px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{opt}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <AnimatePresence>
                      {locked && (
                        <motion.div className="mt-4 p-4 rounded-2xl flex items-start gap-2.5"
                          style={{ background: sel === q.correct ? "rgba(14,92,55,0.07)" : "rgba(246,182,35,0.10)", border: `1px solid ${sel === q.correct ? "rgba(14,92,55,0.15)" : "rgba(246,182,35,0.25)"}` }}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease }}>
                          {sel === q.correct
                            ? <CheckCircle size={18} color={H.primary} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                            : <Sparkles size={18} color={H.gold} strokeWidth={2} className="flex-shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>
                              {sel === q.correct ? "Зөв!" : `Зөв хариулт: ${q.opts[q.correct]}`}
                            </p>
                            <p className="text-[12px] mt-0.5 leading-relaxed" style={{ fontFamily: fontSans, color: H.muted }}>{q.exp}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {phase === "result" && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center"
              style={{ paddingTop: SAFE_TOP, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
              {/* Accuracy circle */}
              <motion.div className="relative mb-5" style={{ width: 140, height: 140 }}
                initial={{ scale: reduce ? 1 : 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(14,92,55,0.10)" strokeWidth="10" />
                  <motion.circle cx="70" cy="70" r="60" fill="none" stroke={perfect ? H.gold : H.primary} strokeWidth="10" strokeLinecap="round"
                    transform="rotate(-90 70 70)" strokeDasharray={2 * Math.PI * 60}
                    initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - accuracy / 100) }}
                    transition={{ duration: 1.1, delay: 0.2, ease: easeOut }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[34px] font-bold leading-none" style={{ fontFamily: fontDisplay, color: perfect ? "#B8860B" : H.primary }}>
                    <CountUp to={accuracy} />%
                  </span>
                  <span className="text-[11px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>оновчтой</span>
                </div>
              </motion.div>

              <h2 className="text-[24px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>
                {perfect ? "Төгс!" : accuracy >= 60 ? "Сайн байна!" : "Дахин оролдоорой"}
              </h2>
              <p className="text-[13px] mt-1 mb-4" style={{ fontFamily: fontSans, color: H.muted }}>
                {right}/{QUIZ_COUNT} зөв · <span style={{ color: H.primary, fontWeight: 700 }}>{score} оноо</span>
              </p>

              {/* Reward chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(246,182,35,0.14)", color: "#9A7B12", fontFamily: fontSans }}>
                  <Zap size={12} color={H.gold} fill={H.gold} /> +100 XP
                </span>
                {accuracy >= 80 && (
                  <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(14,92,55,0.08)", color: H.primary, fontFamily: fontSans }}>
                    <Star size={12} color={H.primary} fill={H.primary} /> 50 Point
                  </span>
                )}
                {perfect && (
                  <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(233,77,114,0.12)", color: H.pink, fontFamily: fontSans }}>
                    <Ticket size={12} color={H.pink} /> Spin Ticket + Coupon
                  </span>
                )}
              </div>

              <div className="w-full flex flex-col gap-3">
                <motion.button onClick={start} whileTap={{ scale: 0.97 }}
                  className="w-full h-13 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white"
                  style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA, height: 52 }}>
                  <RotateCcw size={17} color="white" /> Дахин тоглох
                </motion.button>
                <div className="flex gap-3">
                  <motion.button onClick={onClose} whileTap={{ scale: 0.96 }}
                    className="flex-1 rounded-full font-semibold text-[14px]" style={{ height: 48, border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Нүүр</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} aria-label="Хуваалцах"
                    className="rounded-full flex items-center justify-center" style={{ width: 48, height: 48, border: `1.5px solid ${H.border}` }}>
                    <Share2 size={17} color={H.text} strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
    ) : null,
    document.body
  );
}

// ─── Bakery Connections (NYT-Connections, brand-themed) ───────────────────────
// 16 cards → find 4 hidden groups of 4. 4 mistakes allowed. Daily-rotating puzzle.
// Perfect (0 mistakes) → Golden Badge · under 2:00 → Speed Bonus · complete → 100 XP.
const CONNECT_COLORS = ["#F6B623", "#0E5C37", "#E94D72", "#6B4226"]; // gold · green · pink · chocolate
const CONNECT_PUZZLES: { cat: string; items: string[] }[][] = [
  [
    { cat: "Талх",   items: ["Croissant", "Baguette", "Toast", "Pretzel"] },
    { cat: "Кофе",   items: ["Latte", "Americano", "Espresso", "Mocha"] },
    { cat: "Бялуу",  items: ["Tiramisu", "Cheesecake", "Red Velvet", "Mango Cake"] },
    { cat: "Орц",    items: ["Butter", "Milk", "Egg", "Flour"] },
  ],
  [
    { cat: "Өглөөний цэс", items: ["Croissant", "Americano", "Yogurt", "Orange Juice"] },
    { cat: "Chocolate",    items: ["Choco Cake", "Choco Cookie", "Choco Cross.", "Hot Choco"] },
    { cat: "Хаврын цэс",   items: ["Strawberry", "Mango Cake", "Lemon Tart", "Peach Tea"] },
    { cat: "Premium",      items: ["Signature", "Gold Member", "VIP Coupon", "Birthday Cake"] },
  ],
];

function ConnectionsGame({ open, onClose, onScore }: { open: boolean; onClose: () => void; onScore?: (score: number, xp: number, upoints: number) => void }) {
  const reduce = useReducedMotion();
  const [puzzle] = useState(() => CONNECT_PUZZLES[new Date().getDate() % CONNECT_PUZZLES.length]);
  const [cards, setCards]   = useState<string[]>(() => shuffle(puzzle.flatMap((g) => g.items)));
  const [sel,   setSel]     = useState<string[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [msg,   setMsg]     = useState<string | null>(null);
  const [shake, setShake]   = useState(0);
  const [secs,  setSecs]    = useState(0);
  const [phase, setPhase]   = useState<"play" | "win" | "lose">("play");
  const tRef = useRef<ReturnType<typeof setTimeout>>();
  const [scored, setScored] = useState(false);

  useEffect(() => { if (phase !== "play" && onScore && !scored) { setScored(true); onScore(secs, 100, mistakes === 0 ? 50 : 0); } }, [phase, secs, mistakes, onScore, scored]);

  const groupOf = (item: string) => puzzle.findIndex((g) => g.items.includes(item));

  const reset = () => {
    setCards(shuffle(puzzle.flatMap((g) => g.items)));
    setSel([]); setSolved([]); setMistakes(0); setMsg(null); setSecs(0); setPhase("play"); setScored(false);
  };
  useEffect(() => { if (open) reset(); clearTimeout(tRef.current); return () => clearTimeout(tRef.current); }, [open]); // eslint-disable-line
  useEffect(() => {
    if (!open || phase !== "play") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, phase]);

  const toggle = (item: string) => {
    if (phase !== "play") return;
    setMsg(null);
    setSel((s) => s.includes(item) ? s.filter((x) => x !== item) : s.length < 4 ? [...s, item] : s);
  };

  const submit = () => {
    if (sel.length !== 4 || phase !== "play") return;
    const gs = sel.map(groupOf);
    if (gs.every((g) => g === gs[0])) {
      const g = gs[0];
      setSolved((p) => [...p, g]);
      setCards((p) => p.filter((c) => !sel.includes(c)));
      setSel([]);
      if (solved.length + 1 === 4) tRef.current = setTimeout(() => setPhase("win"), 650);
    } else {
      const counts: Record<number, number> = {};
      gs.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
      setMsg(Math.max(...Object.values(counts)) === 3 ? "Ганц алдаатай!" : "Дахин бод…");
      setShake((k) => k + 1);
      const nm = mistakes + 1; setMistakes(nm);
      if (nm >= 4) tRef.current = setTimeout(() => setPhase("lose"), 650);
    }
  };

  const mm = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const perfect = mistakes === 0;

  return createPortal(
    open ? (
      <motion.div className="fixed inset-0 z-[60] flex flex-col" style={{ background: H.bg }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast, ease }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0" style={{ paddingTop: SAFE_TOP }}>
          <div className="flex items-center gap-3 px-5 pb-2">
            <motion.button aria-label="Хаах" className="size-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(14,92,55,0.08)" }} onClick={onClose} whileTap={{ scale: 0.9 }}>
              <X size={17} color={H.text} strokeWidth={2.2} />
            </motion.button>
            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[1.1px]" style={{ color: H.muted, fontFamily: fontSans }}>Өдрийн оньсого</p>
              <p className="text-[16px] font-bold leading-none" style={{ fontFamily: fontDisplay, color: H.text }}>Bakery Connections</p>
            </div>
            <span className="text-[15px] font-bold px-2.5 py-1 rounded-xl" style={{ background: H.card, color: H.primary, fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums", border: `1px solid ${H.border}` }}>{mm}</span>
          </div>
          {/* Hearts + hint text */}
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <Heart key={i} size={16} strokeWidth={2}
                  color={i < 4 - mistakes ? H.pink : H.accent}
                  fill={i < 4 - mistakes ? H.pink : "transparent"} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              {msg && (
                <motion.span key={msg + shake} className="text-[12px] font-bold" style={{ color: H.pink, fontFamily: fontSans }}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Solved banners + board ── */}
        <div className="flex-1 px-5 overflow-y-auto flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
          {/* Solved category banners */}
          {solved.map((g) => (
            <motion.div key={g} className="rounded-2xl px-4 py-2.5 text-center"
              style={{ background: CONNECT_COLORS[g] }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-white" style={{ fontFamily: fontDisplay }}>{puzzle[g].cat}</p>
              <p className="text-[11px] text-white/85" style={{ fontFamily: fontSans }}>{puzzle[g].items.join(" · ")}</p>
            </motion.div>
          ))}

          {/* Remaining cards grid — shakes as one unit on a wrong guess */}
          <motion.div className="grid grid-cols-4 gap-2" key={"grid"}
            animate={!reduce && shake ? { x: [0, -7, 7, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}>
            {cards.map((item) => {
              const on = sel.includes(item);
              return (
                <motion.button key={item} onClick={() => toggle(item)}
                  className="rounded-2xl flex items-center justify-center text-center px-1"
                  style={{
                    minHeight: 68,
                    background: on ? H.primary : H.card,
                    border: `1.5px solid ${on ? H.primary : H.border}`,
                    boxShadow: on ? "0 8px 18px rgba(14,92,55,0.28)" : "0 1px 4px rgba(14,92,55,0.05)",
                  }}
                  animate={{ y: on ? -3 : 0, scale: on ? 1.03 : 1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                  <span className="text-[11px] font-semibold leading-tight" style={{ fontFamily: fontSans, color: on ? "white" : H.text }}>{item}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* ── Controls ── */}
        <div className="flex-shrink-0 px-5 pt-3 flex flex-col gap-3" style={{ paddingBottom: SAFE_BOTTOM }}>
          <div className="flex items-center justify-center gap-3">
            <motion.button onClick={() => setCards((c) => shuffle(c))} whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold"
              style={{ background: H.card, border: `1px solid ${H.border}`, color: H.text, fontFamily: fontSans }}>
              <Shuffle size={14} color={H.primary} /> Холих
            </motion.button>
            <motion.button onClick={() => setSel([])} whileTap={{ scale: 0.94 }}
              className="px-4 py-2.5 rounded-full text-[13px] font-semibold"
              style={{ background: H.card, border: `1px solid ${H.border}`, color: H.muted, fontFamily: fontSans }}>
              Цэвэрлэх
            </motion.button>
          </div>
          <motion.button onClick={submit} disabled={sel.length !== 4}
            className="w-full h-13 rounded-full flex items-center justify-center font-bold text-[16px] text-white"
            style={{
              height: 52,
              background: sel.length === 4 ? `linear-gradient(135deg, ${H.secondary}, ${H.primary})` : H.accent,
              fontFamily: fontDisplay, boxShadow: sel.length === 4 ? SHADOW_CTA : "none",
            }}
            whileTap={sel.length === 4 ? { scale: 0.97 } : {}}>
            Шалгах ({sel.length}/4)
          </motion.button>
        </div>

        {/* ── Win / Lose overlay ── */}
        <AnimatePresence>
          {phase !== "play" && (
            <motion.div className="absolute inset-0 z-10 flex items-center justify-center px-8"
              style={{ background: "rgba(0,0,0,0.55)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="w-full rounded-3xl p-6 text-center" style={{ background: H.card }}
                initial={{ scale: reduce ? 1 : 0.9, opacity: 0, y: reduce ? 0 : 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                <div className="size-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: phase === "win" ? "rgba(246,182,35,0.15)" : "rgba(233,77,114,0.12)" }}>
                  {phase === "win" ? <Trophy size={26} color={H.gold} fill={H.gold} /> : <Heart size={24} color={H.pink} />}
                </div>
                <p className="text-[20px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>
                  {phase === "win" ? (perfect ? "Төгс шийдлээ!" : "Шийдлээ!") : "Дуусчихлаа"}
                </p>
                <p className="text-[13px] mt-1" style={{ fontFamily: fontSans, color: H.muted }}>
                  {phase === "win" ? `Хугацаа ${mm} · ${mistakes} алдаа` : "Бүх бүлгийг доор харуулав"}
                </p>

                {/* Lose → reveal all groups */}
                {phase === "lose" && (
                  <div className="flex flex-col gap-1.5 mt-3 text-left">
                    {puzzle.map((g, i) => (
                      <div key={i} className="rounded-xl px-3 py-1.5" style={{ background: CONNECT_COLORS[i] }}>
                        <p className="text-[10px] font-bold uppercase text-white" style={{ fontFamily: fontDisplay }}>{g.cat}</p>
                        <p className="text-[10px] text-white/85" style={{ fontFamily: fontSans }}>{g.items.join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Win → reward chips */}
                {phase === "win" && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(246,182,35,0.14)", color: "#9A7B12", fontFamily: fontSans }}>
                      <Zap size={12} color={H.gold} fill={H.gold} /> +100 XP
                    </span>
                    {perfect && (
                      <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(14,92,55,0.08)", color: H.primary, fontFamily: fontSans }}>
                        <Medal size={12} color={H.gold} fill={H.gold} /> Golden Badge · 50 Point
                      </span>
                    )}
                    {secs < 120 && (
                      <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(233,77,114,0.12)", color: H.pink, fontFamily: fontSans }}>
                        <Flame size={12} color={H.pink} /> Speed Bonus
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <motion.button onClick={onClose} whileTap={{ scale: 0.96 }}
                    className="flex-1 py-3 rounded-2xl font-semibold text-[14px]" style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Нүүр</motion.button>
                  <motion.button onClick={reset} whileTap={{ scale: 0.96 }}
                    className="flex-1 py-3 rounded-2xl font-semibold text-[14px] text-white" style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>Дахин</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    ) : null,
    document.body
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
function GameScreen({ user, leaderboard, onGameOver }: {
  user?: ApiUser | null;
  leaderboard: ApiUser[];
  onGameOver: (gameType: "block" | "merge" | "quiz" | "connect", score: number, xp: number, upoints: number) => void;
}) {
  const reduce = useReducedMotion();
  const store  = useStore();
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelSpin,  setWheelSpin]  = useState(false);
  const wheelSpins = store.spinsLeft;   // persisted daily spins (resets each calendar day)
  const [lastPrize,  setLastPrize]  = useState<string | null>(null);
  const [scratched,  setScratched]  = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const xpTotal = store.xp, xpMax = 2000;
  const level = Math.floor(xpTotal / 100) + 1;
  const title = level >= 30 ? "Бялуу Хаан" : level >= 20 ? "Бялуу Мастер" : level >= 10 ? "Мэргэжилтэн" : level >= 5 ? "Дуртай тоглогч" : "Эхлэгч";

  const spinWheel = () => {
    if (wheelSpin || !store.useSpin()) return;   // useSpin reserves today's spin (false if none left)
    setLastPrize(null);
    setWheelSpin(true);
    const extra = 1800 + Math.random() * 720;
    const newAngle = wheelAngle + extra;
    setWheelAngle(newAngle);
    setTimeout(() => {
      setWheelSpin(false);
      const seg = 360 / WHEEL_PRIZES.length;
      const norm = ((newAngle % 360) + 360) % 360;
      const idx = Math.floor(((360 - norm + seg / 2) % 360) / seg) % WHEEL_PRIZES.length;
      const label = WHEEL_PRIZES[idx].label;
      setLastPrize(label);
      const m = label.match(/\+(\d+)\s*pt/i);      // award point prizes straight into the wallet
      if (m) store.addReward({ points: parseInt(m[1], 10) });
    }, 2800);
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: H.bg, scrollbarWidth: "none", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>

      {/* XP Header */}
      <motion.div className="px-5 pt-5 pb-5"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)` }}
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.40, ease }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Zap size={16} color={H.gold} fill={H.gold} />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>Тоглогчийн түвшин</p>
              <p className="font-bold text-white text-[14px]" style={{ fontFamily: fontDisplay }}>Lv.{level} — {title}</p>
            </div>
          </div>
          <span className="text-[12px] font-bold" style={{ color: H.gold, fontFamily: fontSans }}>{xpTotal} XP</span>
        </div>
        <ProgressBar pct={(xpTotal / xpMax) * 100} color={`linear-gradient(90deg, ${H.gold}, #FFD766)`} delay={0.2} />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: "rgba(244,239,216,0.40)", fontFamily: fontSans }}>Lv.{level}</span>
          <span className="text-[10px]" style={{ color: "rgba(244,239,216,0.40)", fontFamily: fontSans }}>{xpMax - xpTotal} XP → Lv.{level + 1}</span>
        </div>
      </motion.div>

      {/* Spin Wheel */}
      <motion.div className="px-5 -mt-3 mb-5"
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.46, delay: 0.12, ease }}>
        <div className="rounded-3xl p-5 flex flex-col items-center"
          style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_FLOAT }}>
          <div className="flex items-center justify-between w-full mb-4">
            <div>
              <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Хүрд эргүүлэх</h3>
              <p className="text-[11px]" style={{ color: H.muted, fontFamily: fontSans }}>Өдөрт 3 хүртэл эрх</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: wheelSpins > 0 ? "rgba(246,182,35,0.12)" : "rgba(0,0,0,0.05)" }}>
              <Ticket size={12} color={wheelSpins > 0 ? H.gold : H.muted} />
              <span className="text-[12px] font-bold" style={{ color: wheelSpins > 0 ? H.gold : H.muted, fontFamily: fontSans }}>{wheelSpins} эрх</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center mb-4" style={{ width: 208, height: 208 }}>
            <div className="absolute z-20" style={{ top: -8, left: "50%", transform: "translateX(-50%)" }}>
              <motion.div animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}>
                <div className="w-0 h-0" style={{ borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `20px solid ${H.secondary}`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
              </motion.div>
            </div>
            <div className="rounded-full overflow-hidden absolute inset-0"
              style={{ transform: `rotate(${wheelAngle}deg)`, transition: wheelSpin ? "transform 2.8s cubic-bezier(0.17,0.67,0.12,1)" : "none", border: `5px solid ${H.primary}`, boxShadow: `0 0 0 3px white, 0 0 0 6px ${H.accent}` }}>
              {WHEEL_PRIZES.map((p, i) => {
                const seg = 360 / WHEEL_PRIZES.length;
                const tan = Math.tan((seg * Math.PI) / 360);
                return (
                  <div key={i} className="absolute inset-0 flex items-start justify-center"
                    style={{ paddingTop: 14, transform: `rotate(${i * seg + seg / 2}deg)`, transformOrigin: "50% 50%" }}>
                    <div className="absolute inset-0" style={{ background: p.color, clipPath: `polygon(50% 50%, ${50 - 50 * tan}% 0%, ${50 + 50 * tan}% 0%)` }} />
                    <span className="relative text-[9px] font-bold text-white z-10 text-center leading-tight"
                      style={{ fontFamily: fontSans, textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>{p.label}</span>
                  </div>
                );
              })}
            </div>
            <motion.div className="absolute z-10 size-11 rounded-full flex items-center justify-center"
              style={{ background: H.card, border: `4px solid ${H.primary}`, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
              animate={{ scale: wheelSpin ? [1, 1.15, 1] : 1 }}
              transition={{ repeat: wheelSpin ? Infinity : 0, duration: 0.5 }}>
              <Star size={18} color={H.gold} fill={H.gold} />
            </motion.div>
          </div>

          <AnimatePresence>
            {lastPrize && (
              <motion.div className="mb-3 w-full px-4 py-2.5 rounded-2xl flex items-center gap-2"
                style={{ background: "rgba(246,182,35,0.10)", border: "1px solid rgba(246,182,35,0.28)" }}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}>
                <Sparkles size={16} color={H.gold} />
                <p className="text-[13px] font-bold" style={{ color: H.secondary, fontFamily: fontDisplay }}>Та "{lastPrize}" хожлоо!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button onClick={spinWheel} disabled={wheelSpin || wheelSpins === 0}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white"
            style={{ background: wheelSpin || wheelSpins === 0 ? H.muted : `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: wheelSpin || wheelSpins === 0 ? "none" : SHADOW_CTA }}
            whileTap={{ scale: 0.96 }} whileHover={canHover && !wheelSpin && wheelSpins > 0 ? { scale: 1.02 } : {}}>
            {wheelSpin ? "Эргэж байна…" : wheelSpins === 0 ? "Эрх дууссан" : "Хүрд эргүүлэх"}
          </motion.button>
        </div>
      </motion.div>

      {/* Scratch Card */}
      <motion.div className="px-5 mb-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.40, delay: 0.18, ease }}>
        <div className="rounded-3xl p-5" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={16} color={H.primary} />
            <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Scratch Card</h3>
          </div>
          <motion.div className="relative rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer"
            style={{ height: 96, background: scratched ? "rgba(14,92,55,0.07)" : `linear-gradient(135deg, ${H.gold}, #FFE080)` }}
            onClick={() => setScratched(true)}
            whileTap={{ scale: 0.97 }}>
            <AnimatePresence mode="wait">
              {scratched ? (
                <motion.div key="revealed" className="text-center px-4"
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <p className="text-[28px] font-bold" style={{ color: H.primary, fontFamily: fontDisplay }}>+150 pt</p>
                  <p className="text-[11px]" style={{ color: H.muted, fontFamily: fontSans }}>Upoint дансанд нэмэгдлээ</p>
                </motion.div>
              ) : (
                <motion.div key="hidden" className="text-center pointer-events-none"
                  exit={{ opacity: 0, scale: 0.8 }}>
                  <RotateCcw size={22} color={H.secondary} />
                  <p className="text-[12px] font-semibold mt-2" style={{ color: H.secondary, fontFamily: fontSans }}>Товшиж шагналаа нэгдлүүл</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Mini Games */}
      <motion.div className="px-5 mb-5"
        initial="hidden" animate="show" variants={staggerContainer}>
        <motion.h3 variants={fadeUp} className="text-[15px] font-bold mb-3" style={{ fontFamily: fontDisplay, color: H.text }}>Мини Тоглоомууд</motion.h3>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g) => (
            <motion.button key={g.id} onClick={() => setActiveGame(g.id)}
              variants={staggerItem}
              className="rounded-2xl p-4 text-left flex flex-col gap-2.5"
              style={{ background: g.color, border: `1px solid ${H.border}` }}
              whileHover={canHover ? { y: -4, boxShadow: SHADOW_FLOAT } : {}}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}>
              <div className="flex items-start justify-between">
                <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.55)" }}>
                  <g.Icon size={18} color={H.primary} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.55)", color: H.text, fontFamily: fontSans }}>{g.reward}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-[13px]" style={{ fontFamily: fontDisplay, color: H.text }}>{g.title}</p>
                  {!g.live && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: H.muted, fontFamily: fontSans }}>Удахгүй</span>}
                </div>
                <p className="text-[11px]" style={{ color: H.muted, fontFamily: fontSans }}>{g.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Flagship playable games */}
        <BlockPuzzleGame  open={activeGame === "block"} onClose={() => setActiveGame(null)}
          onScore={(s, x, p) => onGameOver("block", s, x, p)} />
        <MergeBakeryGame  open={activeGame === "merge"} onClose={() => setActiveGame(null)}
          onScore={(s, x, p) => onGameOver("merge", s, x, p)} />
        <QuizGame         open={activeGame === "quiz"}    onClose={() => setActiveGame(null)}
          onScore={(s, x, p) => onGameOver("quiz", s, x, p)} />
        <ConnectionsGame  open={activeGame === "connect"} onClose={() => setActiveGame(null)}
          onScore={(s, x, p) => onGameOver("connect", s, x, p)} />

        {/* Coming-soon sheet for not-yet-live games (none currently) */}
        {createPortal(
          <AnimatePresence>
            {activeGame && !["block", "merge", "quiz", "connect"].includes(activeGame) && (
              <motion.div className="fixed inset-0 z-50 flex items-end"
                style={{ background: "rgba(0,0,0,0.45)" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setActiveGame(null)}>
                <motion.div className="w-full rounded-t-3xl p-6" style={{ background: H.card }}
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}>
                  <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: H.accent }} />
                  <p className="text-[18px] font-bold text-center mb-2" style={{ fontFamily: fontDisplay, color: H.text }}>
                    {GAMES.find((g) => g.id === activeGame)?.title}
                  </p>
                  <p className="text-[13px] text-center mb-5" style={{ color: H.muted, fontFamily: fontSans }}>Тоглоом тун удахгүй нэмэгдэнэ</p>
                  <motion.button onClick={() => setActiveGame(null)}
                    className="w-full py-3.5 rounded-2xl text-white font-semibold"
                    style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontSans }}
                    whileTap={{ scale: 0.97 }}>
                    Хаах
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </motion.div>

      {/* Missions & Leaderboard */}
      <motion.div className="px-5 mb-5" initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-3">
          <ListChecks size={16} color={H.primary} />
          <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Өдрийн Даалгавар</h3>
        </motion.div>
        <div className="space-y-2">
          {MISSIONS.map((m) => (
            <motion.div key={m.id} variants={staggerItem}
              className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
              style={{ background: H.card, border: `1px solid ${H.border}` }}>
              {m.done
                ? <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, delay: 0.1 }}>
                    <CheckCircle size={17} color={H.primary} strokeWidth={2} />
                  </motion.div>
                : <div className="size-[17px] rounded-full border-2 flex-shrink-0" style={{ borderColor: H.accent }} />}
              <p className="flex-1 text-[13px] font-medium"
                style={{ color: m.done ? H.muted : H.text, fontFamily: fontSans, textDecoration: m.done ? "line-through" : "none" }}>
                {m.text}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: m.done ? "rgba(14,92,55,0.08)" : "rgba(246,182,35,0.15)", color: m.done ? H.primary : H.gold, fontFamily: fontSans }}>
                +{m.xp} XP
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Leaderboard — Figma podium layout ── */}
      <motion.div className="mb-6" initial="hidden" animate="show" variants={staggerContainer}>

        {/* Podium header — dark green bg, top 3 avatars */}
        <motion.div variants={fadeUp} className="relative mx-5 rounded-3xl overflow-hidden mb-3"
          style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)`, paddingBottom: 28 }}>
          {/* title */}
          <div className="flex items-center justify-center gap-2 pt-4 pb-6">
            <Trophy size={15} color={H.gold} fill={H.gold} />
            <h3 className="text-[15px] font-bold text-white" style={{ fontFamily: fontDisplay }}>Тэргүүлэгчид</h3>
          </div>

          {/* Podium: 2nd | 1st | 3rd */}
          <div className="flex items-end justify-center gap-4 px-4">
            {/* 2nd place */}
            {leaderboard[1] && (() => { const l = leaderboard[1]; return (
              <motion.div variants={staggerItem} className="flex flex-col items-center gap-1.5 mb-2">
                <div className="relative">
                  <div className="size-[68px] rounded-full overflow-hidden border-[3px]"
                    style={{ borderColor: "rgba(255,255,255,0.30)" }}>
                    {l.avatar
                      ? <img src={l.avatar} alt={l.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><User size={28} color="white" /></div>}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: H.bg, color: H.secondary, fontFamily: fontSans }}>2</div>
                </div>
                <p className="text-white text-[12px] font-bold text-center" style={{ fontFamily: fontSans }}>{l.name}</p>
                <div className="flex items-center gap-1">
                  <Star size={10} color={H.gold} fill={H.gold} />
                  <span className="text-[11px] text-white" style={{ fontFamily: fontSans }}>{l.xp.toLocaleString()} pt</span>
                </div>
              </motion.div>
            ); })()}

            {/* 1st place — center, larger, elevated */}
            {leaderboard[0] && (() => { const l = leaderboard[0]; return (
              <motion.div variants={staggerItem} className="flex flex-col items-center gap-1.5 -mb-2">
                {/* Crown */}
                <Crown size={24} color={H.gold} fill={H.gold} />
                <div className="relative">
                  <div className="size-[84px] rounded-full overflow-hidden border-[3px]"
                    style={{ borderColor: H.gold, boxShadow: `0 0 0 2px rgba(246,182,35,0.30)` }}>
                    {l.avatar
                      ? <img src={l.avatar} alt={l.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><User size={34} color="white" /></div>}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{ background: H.gold, color: H.secondary, fontFamily: fontSans }}>1</div>
                </div>
                <p className="text-white text-[13px] font-bold text-center" style={{ fontFamily: fontSans }}>{l.name}</p>
                <div className="flex items-center gap-1">
                  <Star size={10} color={H.gold} fill={H.gold} />
                  <span className="text-[11px] text-white font-semibold" style={{ fontFamily: fontSans }}>{l.xp.toLocaleString()} pt</span>
                </div>
              </motion.div>
            ); })()}

            {/* 3rd place */}
            {leaderboard[2] && (() => { const l = leaderboard[2]; return (
              <motion.div variants={staggerItem} className="flex flex-col items-center gap-1.5 mb-2">
                <div className="relative">
                  <div className="size-[68px] rounded-full overflow-hidden border-[3px]"
                    style={{ borderColor: "rgba(255,255,255,0.30)" }}>
                    {l.avatar
                      ? <img src={l.avatar} alt={l.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><User size={28} color="white" /></div>}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: H.bg, color: H.secondary, fontFamily: fontSans }}>3</div>
                </div>
                <p className="text-white text-[12px] font-bold text-center" style={{ fontFamily: fontSans }}>{l.name}</p>
                <div className="flex items-center gap-1">
                  <Star size={10} color={H.gold} fill={H.gold} />
                  <span className="text-[11px] text-white" style={{ fontFamily: fontSans }}>{l.xp.toLocaleString()} pt</span>
                </div>
              </motion.div>
            ); })()}
          </div>
        </motion.div>

        {/* Ranked list 4–10 */}
        <div className="mx-5 rounded-3xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          {leaderboard.slice(3).map((l, i) => (
            <motion.div key={l.id} variants={staggerItem}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: l.id === (user?.id || 0) ? H.primary : "transparent",
                borderBottom: i < leaderboard.slice(3).length - 1 ? `1px solid ${H.border}` : "none",
              }}>
              {/* Rank number */}
              <span className="w-6 text-center text-[14px] font-bold flex-shrink-0"
                style={{ fontFamily: fontSans, color: l.id === (user?.id || 0) ? "white" : H.muted }}>{i + 4}</span>

              {/* Avatar */}
              <div className="size-8 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: `1.5px solid ${l.id === (user?.id || 0) ? "rgba(255,255,255,0.35)" : H.border}` }}>
                {l.avatar
                  ? <img src={l.avatar} alt={l.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                  : <div className="w-full h-full flex items-center justify-center"
                      style={{ background: l.id === (user?.id || 0) ? "rgba(255,255,255,0.25)" : H.bg }}>
                      <User size={14} color={l.id === (user?.id || 0) ? "white" : H.muted} />
                    </div>}
              </div>

              {/* Name */}
              <p className="flex-1 text-[13px] font-bold"
                style={{ fontFamily: fontSans, color: l.id === (user?.id || 0) ? "white" : H.text }}>{l.name}</p>

              {/* Points */}
              <span className="text-[13px] font-bold"
                style={{ color: l.id === (user?.id || 0) ? "white" : H.muted, fontFamily: fontSans }}>
                {l.xp.toLocaleString()} pt
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── SHOP SCREEN ──────────────────────────────────────────────────────────────
function ShopScreen({ onAddToCart }: { onAddToCart: (pid: number, qty?: number) => void }) {
  const store = useStore();
  const [cat, setCat]     = useState("all");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const favs = store.favorites;   // persisted favourites

  const filtered = PRODUCTS.filter(
    (p) => (cat === "all" || p.cat === cat) && (!query || p.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: H.bg, scrollbarWidth: "none", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>
      <motion.div className="px-5 pt-5 pb-4"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)` }}
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease }}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}>
          <Search size={15} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          <input className="flex-1 text-[13px] outline-none bg-transparent text-white"
            placeholder="Бүтээгдэхүүн хайх…" style={{ fontFamily: fontSans }}
            value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <motion.button onClick={() => setQuery("")} whileTap={{ scale: 0.85 }}>
              <Minus size={14} color="rgba(255,255,255,0.55)" />
            </motion.button>
          )}
        </div>
      </motion.div>

      <div className="px-5 py-3">
        <motion.div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}
          variants={staggerContainer} initial="hidden" animate="show">
          {CATS.map((c) => {
            const on = cat === c.id;
            return (
              <motion.button key={c.id} onClick={() => setCat(c.id)} variants={staggerItemX}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={{ background: on ? H.primary : H.card, border: `1px solid ${on ? H.primary : H.border}`, boxShadow: on ? "0 3px 10px rgba(14,92,55,0.22)" : "none" }}
                whileTap={{ scale: 0.93 }}
                transition={{ duration: 0.2 }}>
                <c.Icon size={13} color={on ? "white" : H.muted} strokeWidth={1.8} />
                <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: on ? "white" : H.muted, fontFamily: fontSans }}>{c.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <div className="px-5 pb-6">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" className="flex flex-col items-center justify-center py-16 gap-3"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Search size={36} color={H.accent} strokeWidth={1.2} />
              <p style={{ color: H.muted, fontFamily: fontSans, fontSize: 13 }}>Үр дүн олдсонгүй</p>
            </motion.div>
          ) : (
            <motion.div key={cat + query} className="grid grid-cols-2 gap-3"
              variants={staggerContainer} initial="hidden" animate="show">
              {filtered.map((p) => {
                const isFav = favs.includes(p.id);
                return (
                  <motion.div key={p.id} variants={staggerItem}
                    className="rounded-3xl overflow-hidden cursor-pointer"
                    style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_CARD }}
                    onClick={() => setSelectedProduct(p)}
                    whileHover={canHover ? { y: -4, boxShadow: SHADOW_FLOAT } : {}}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}>
                    <div className="relative w-full" style={{ paddingTop: "66%" }}>
                      <CoverImg src={p.img} alt={p.name} />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 45%)" }} />
                      <motion.button
                        className="absolute top-2 right-2 size-7 rounded-full flex items-center justify-center"
                        style={{ background: isFav ? H.pink : "rgba(255,255,255,0.82)" }}
                        onClick={(e) => { e.stopPropagation(); store.toggleFav(p.id); }}
                        whileTap={{ scale: 0.80 }}
                        animate={{ scale: isFav ? [1, 1.3, 1] : 1 }}
                        transition={{ duration: 0.3 }}>
                        <Heart size={13} color={isFav ? "white" : H.muted} fill={isFav ? "white" : "transparent"} strokeWidth={2} />
                      </motion.button>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: H.primary }}>
                        <Tag size={8} color="white" />
                        <span className="text-[9px] font-bold text-white" style={{ fontFamily: fontSans }}>{p.tag}</span>
                      </div>
                      {p.glbUrl && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                          </svg>
                          <span className="text-[8px] font-bold text-white" style={{ fontFamily: fontSans }}>3D</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-[12px] leading-snug line-clamp-2" style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-[13px]" style={{ color: H.primary, fontFamily: fontSans }}>{fmt(p.price)}</span>
                        <motion.button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white text-[11px] font-semibold"
                          style={{ background: H.primary, fontFamily: fontSans }}
                          onClick={(e) => { e.stopPropagation(); onAddToCart(p.id); }}
                          aria-label={`${p.name} сагсанд нэмэх`}
                          whileTap={{ scale: 0.9 }}>
                          <Plus size={11} color="white" strokeWidth={2.5} /> Сагс
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product detail — same sheet as Home; tapping a card opens it */}
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={(pid, qty) => { onAddToCart(pid, qty); setSelectedProduct(null); }}
      />
    </div>
  );
}

// ─── REWARDS SCREEN ───────────────────────────────────────────────────────────
function RewardsScreen({ user }: { user?: ApiUser | null }) {
  const reduce = useReducedMotion();
  const store  = useStore();
  const nav    = useNav();
  const pts = store.points;
  const [redeemT, setRedeemT] = useState<typeof REWARDS[0] | null>(null);
  const [redeemState, setRedeemState] = useState<"confirm" | "success" | "error">("confirm");
  const doRedeem = () => {
    if (!redeemT) return;
    const ok = store.redeemReward(redeemT.id, redeemT.cost);
    setRedeemState(ok ? "success" : "error");
    if (ok) setTimeout(() => setRedeemT(null), 1800);
  };
  const tiers = [
    { label: "Хүрэл", min: 0,     max: 1000,  Icon: Medal,  color: "#CD7F32" },
    { label: "Мөнгө", min: 1000,  max: 5000,  Icon: Medal,  color: "#A8A8A8" },
    { label: "Алт",   min: 5000,  max: 15000, Icon: Star,   color: H.gold    },
    { label: "VIP",   min: 15000, max: 99999, Icon: Crown,  color: H.pink    },
  ];
  const currentIdx = tiers.findLastIndex((t) => pts >= t.min);
  const current = tiers[Math.max(0, currentIdx)];
  const next = tiers[Math.min(tiers.length - 1, currentIdx + 1)];
  const progress = current === next ? 100 : ((pts - current.min) / (next.min - current.min)) * 100;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: H.bg, scrollbarWidth: "none", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>
      <motion.div className="px-5 pt-5 pb-3"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)` }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.38 }}>

        {/* Membership card */}
        <motion.div className="relative rounded-3xl p-5 overflow-hidden mb-3"
          style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 12px 40px rgba(0,0,0,0.14)" }}
          initial={{ opacity: 0, y: 28, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.52, delay: 0.10, ease }}>
          <div className="absolute -right-8 -top-8 size-32 rounded-full opacity-[0.07] bg-white" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>Upoint Loyalty</p>
              <p className="text-white font-bold text-[22px] leading-none mt-1" style={{ fontFamily: fontDisplay }}>
                <CountUp to={pts} /> pts
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
              style={{ background: "rgba(246,182,35,0.22)", border: "1px solid rgba(246,182,35,0.32)" }}>
              {current.Icon && <current.Icon size={13} color={current.color} />}
              <span className="text-[11px] font-bold" style={{ color: current.color, fontFamily: fontSans }}>{current.label}</span>
            </div>
          </div>
          <motion.div className="flex justify-center mb-4"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.44, delay: 0.28, ease }}>
            <div className="relative rounded-2xl p-3" style={{ background: H.card }}>
              {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg","top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg","bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg","bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"].map((cls, i) => (
                <div key={i} className={`absolute size-5 ${cls}`} style={{ borderColor: H.primary }} />
              ))}
              <QRCodeSVG value={`https://tlj.mn/loyalty/TLJ-${user?.id || 2840}`} size={136} fgColor={H.secondary} bgColor={H.card} level="M"
                imageSettings={{ src: LOGO_WHITE, width: 28, height: 19, excavate: true }} />
            </div>
          </motion.div>
          <div className="text-center">
            <p className="text-white font-bold tracking-[6px] text-[16px]" style={{ fontFamily: fontDisplay }}>TLJ-{user?.id || 2840}</p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(244,239,216,0.45)", fontFamily: fontSans }}>Кассанд уншуулж оноо цуглуулаарай</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Tier */}
      <motion.div className="px-5 -mt-2 mb-5"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.40, delay: 0.22, ease }}>
        <div className="rounded-3xl p-4" style={{ background: H.card, boxShadow: SHADOW_FLOAT, border: `1px solid ${H.border}` }}>
          <motion.div className="flex justify-between mb-3" variants={staggerContainer} initial="hidden" animate="show">
            {tiers.map((t) => {
              const isCur = t.label === current.label;
              return (
                <motion.div key={t.label} variants={scaleIn} className="flex flex-col items-center gap-1">
                  <motion.div className="size-9 rounded-full flex items-center justify-center"
                    style={{ background: isCur ? t.color + "20" : H.bg, border: `2px solid ${isCur ? t.color : H.accent}` }}
                    animate={isCur && !reduce ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}>
                    <t.Icon size={16} color={isCur ? t.color : H.muted} strokeWidth={isCur ? 2.2 : 1.6} />
                  </motion.div>
                  <span className="text-[10px] font-medium" style={{ color: isCur ? H.text : H.muted, fontFamily: fontSans }}>{t.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
          <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: H.bg }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${H.primary}, ${H.gold})` }}
              initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, delay: 0.4, ease: easeOut }} />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ color: H.muted, fontFamily: fontSans }}>{current.label}: {pts.toLocaleString()} pt</span>
            {current !== next && (
              <span className="text-[10px]" style={{ color: H.muted, fontFamily: fontSans }}>{next.label}: {(next.min - pts).toLocaleString()} pt дутуу</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Reward redemption — spend Upoint */}
      <motion.div className="px-5 mb-5" variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-3">
          <Sparkles size={16} color={H.primary} />
          <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Шагнал солих</h3>
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          {REWARDS.map((r) => {
            const owned = store.redeemed.includes(r.id);
            const afford = pts >= r.cost;
            return (
              <motion.div key={r.id} variants={staggerItem} className="rounded-2xl p-4 flex flex-col gap-2"
                style={{ background: H.card, border: `1px solid ${H.border}` }}>
                <div className="size-10 rounded-2xl flex items-center justify-center" style={{ background: r.color + "18" }}>
                  <r.Icon size={20} color={r.color} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-bold leading-tight" style={{ fontFamily: fontDisplay, color: H.text }}>{r.title}</p>
                  <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{r.sub}</p>
                </div>
                <motion.button
                  onClick={() => { if (!owned && afford) { setRedeemState("confirm"); setRedeemT(r); } }}
                  disabled={owned || !afford}
                  aria-label={`${r.title} солих`}
                  className="mt-1 w-full py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1"
                  style={{ background: owned ? H.bg : afford ? H.primary : H.bg, color: owned ? H.muted : afford ? "white" : H.muted, fontFamily: fontSans }}
                  whileTap={!owned && afford ? { scale: 0.94 } : {}}>
                  {owned ? "Авсан ✓" : <><Star size={11} color={afford ? "white" : H.muted} fill={afford ? "white" : "none"} /> {r.cost.toLocaleString()}</>}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Coupons */}
      <motion.div className="px-5 mb-5" variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={16} color={H.primary} />
            <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Купонууд</h3>
          </div>
          <button className="text-[12px] font-medium" style={{ color: H.primary, fontFamily: fontSans }} onClick={() => nav.push("coupons")}>Бүгд</button>
        </motion.div>
        <div className="space-y-3">
          {COUPONS.map((c) => {
            const st = couponStatus(c, store.usedCoupons);
            const inactive = st !== "available";
            return (
              <motion.button key={c.id} variants={staggerItem} onClick={() => nav.push("couponDetail", c)}
                className="w-full text-left flex rounded-2xl overflow-hidden"
                style={{ background: H.card, border: `1px solid ${H.border}`, opacity: inactive ? 0.55 : 1 }}
                whileHover={canHover && !inactive ? { x: 3 } : {}} whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}>
                <div className="w-1.5 flex-shrink-0" style={{ background: c.color }} />
                <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
                  <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color + "18" }}>
                    <Gift size={18} color={c.color} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px]" style={{ fontFamily: fontDisplay, color: inactive ? H.muted : H.text }}>{c.title}</p>
                    <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{c.sub}</p>
                    <div className="flex items-center gap-1 mt-1"><Clock size={10} color={H.muted} /><span className="text-[10px]" style={{ color: H.muted, fontFamily: fontSans }}>{c.expiry} хүртэл</span></div>
                  </div>
                  {st === "used"    ? <span className="text-[10px] font-bold px-2 py-1 rounded-xl flex-shrink-0" style={{ background: H.bg, color: H.muted, fontFamily: fontSans }}>Ашигласан</span>
                   : st === "expired" ? <span className="text-[10px] font-bold px-2 py-1 rounded-xl flex-shrink-0" style={{ background: "rgba(233,77,114,0.10)", color: H.pink, fontFamily: fontSans }}>Дууссан</span>
                   : <ChevronRight size={16} color={H.accent} />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Redeem confirm / success / error modal */}
      {createPortal(
        <AnimatePresence>
          {redeemT && (
            <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-8" style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => redeemState !== "success" && setRedeemT(null)}>
              <motion.div className="w-full rounded-3xl p-6 text-center" style={{ background: H.card }} onClick={(e) => e.stopPropagation()}
                initial={{ scale: reduce ? 1 : 0.9, opacity: 0, y: reduce ? 0 : 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                {redeemState === "success" ? (
                  <>
                    <motion.div className="size-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(14,92,55,0.10)" }}
                      initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                      <CheckCircle size={32} color={H.primary} strokeWidth={2.2} />
                    </motion.div>
                    <p className="text-[19px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Амжилттай!</p>
                    <p className="text-[13px] mt-1" style={{ fontFamily: fontSans, color: H.muted }}>«{redeemT.title}» түрийвчинд нэмэгдлээ</p>
                  </>
                ) : redeemState === "error" ? (
                  <>
                    <div className="size-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(233,77,114,0.12)" }}><X size={30} color={H.pink} strokeWidth={2.4} /></div>
                    <p className="text-[19px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Оноо хүрэлцэхгүй</p>
                    <p className="text-[13px] mt-1 mb-5" style={{ fontFamily: fontSans, color: H.muted }}>Танд {(redeemT.cost - pts).toLocaleString()} оноо дутуу байна</p>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => setRedeemT(null)} className="w-full py-3 rounded-2xl font-semibold text-[14px] text-white" style={{ background: H.primary, fontFamily: fontDisplay }}>Ойлголоо</motion.button>
                  </>
                ) : (
                  <>
                    <div className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: redeemT.color + "18" }}><redeemT.Icon size={26} color={redeemT.color} strokeWidth={1.8} /></div>
                    <p className="text-[18px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{redeemT.title}</p>
                    <p className="text-[13px] mt-1 mb-1" style={{ fontFamily: fontSans, color: H.muted }}>{redeemT.sub}</p>
                    <p className="text-[13px] mb-5" style={{ fontFamily: fontSans, color: H.muted }}><b style={{ color: H.primary }}>{redeemT.cost.toLocaleString()}</b> оноогоор солих уу?</p>
                    <div className="flex gap-3">
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setRedeemT(null)} className="flex-1 py-3 rounded-2xl font-semibold text-[14px]" style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Болих</motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={doRedeem} className="flex-1 py-3 rounded-2xl font-semibold text-[14px] text-white" style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>Солих</motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>, document.body)}

      {/* Wallet */}
      <motion.div className="px-5 mb-6" initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-3">
          <Wallet size={16} color={H.primary} />
          <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Дижитал Хэтэвч</h3>
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          {[{ Icon: Wallet, label: "Apple Wallet" }, { Icon: CreditCard, label: "Google Wallet" }].map((w) => (
            <motion.button key={w.label} variants={staggerItem}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_CARD }}
              whileHover={canHover ? { y: -3, boxShadow: SHADOW_FLOAT } : {}}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}>
              <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,92,55,0.07)" }}>
                <w.Icon size={18} color={H.primary} strokeWidth={1.8} />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-semibold" style={{ fontFamily: fontSans, color: H.text }}>{w.label}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <p className="text-[10px]" style={{ fontFamily: fontSans, color: H.primary }}>Нэмэх</p>
                  <ArrowRight size={10} color={H.primary} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen({ user }: { user?: User | null }) {
  const store = useStore();
  const nav = useNav();
  const pts = store.points;
  const menuNav = (label: string) => {
    if (/захиалг/i.test(label)) nav.push("orders");
    else if (/Upoint|лояалти/i.test(label)) nav.push("points");
    else if (/Салбар/i.test(label)) nav.push("branches");
    else nav.push("settings");
  };
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: H.bg, scrollbarWidth: "none", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>
      <motion.div className="relative px-5 pt-5 pb-7"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)` }}
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }}>
        <div className="absolute -top-12 -right-12 size-40 rounded-full opacity-[0.05] bg-white" />
        <div className="flex flex-col items-center">
          <motion.div className="relative mb-3"
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.12 }}>
            <div className="size-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)", border: "3px solid rgba(255,255,255,0.28)" }}>
              <User size={34} color="rgba(255,255,255,0.85)" strokeWidth={1.4} />
            </div>
            <div className="absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center" style={{ background: H.gold, border: "2px solid white" }}>
              <Pencil size={11} color={H.secondary} strokeWidth={2.5} />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.20 }}>
            <h2 className="text-white text-[20px] font-bold text-center" style={{ fontFamily: fontDisplay }}>{user?.name || "Та"}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Medal size={13} color={H.gold} fill={H.gold} />
              <p className="text-[12px]" style={{ color: "rgba(244,239,216,0.60)", fontFamily: fontSans }}>{pts >= 5000 ? "Алт" : pts >= 2000 ? "Мөнгө" : "Хүрэл"}н гишүүн · TLJ-{user?.id || 2840}</p>
            </div>
          </motion.div>
          <motion.div className="flex gap-8 mt-5" variants={staggerContainer} initial="hidden" animate="show">
            {[{ v: user?.orders || 47, l: "Захиалга" }, { v: pts, l: "Оноо" }, { v: user ? user.saved_items : store.favorites.length, l: "Хадгалсан" }].map((s) => (
              <motion.div key={s.l} variants={scaleIn} className="text-center">
                <p className="text-white font-bold text-[20px] leading-none" style={{ fontFamily: fontDisplay }}>
                  <CountUp to={s.v} />
                </p>
                <p className="text-[11px] mt-1" style={{ color: "rgba(244,239,216,0.50)", fontFamily: fontSans }}>{s.l}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div className="px-5 mt-4 mb-5" initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Medal size={16} color={H.gold} fill={H.gold} />
            <h3 className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Амжилтууд</h3>
          </div>
          <span className="text-[12px] font-medium" style={{ color: H.primary, fontFamily: fontSans }}>
            {ACHIEVEMENTS.filter((a) => a.done).length}/{ACHIEVEMENTS.length}
          </span>
        </motion.div>
        <div className="grid grid-cols-3 gap-2.5">
          {ACHIEVEMENTS.map((a, i) => (
            <motion.button key={i} variants={scaleIn} onClick={() => nav.push("achievement", a)}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3"
              style={{ background: a.done ? "rgba(14,92,55,0.07)" : H.card, border: `1px solid ${a.done ? "rgba(14,92,55,0.12)" : H.border}` }}
              whileHover={canHover && a.done ? { scale: 1.04 } : {}}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}>
              <div className="relative size-9 rounded-full flex items-center justify-center"
                style={{ background: a.done ? "rgba(14,92,55,0.10)" : H.bg }}>
                <a.Icon size={18} color={a.done ? H.primary : H.accent} strokeWidth={a.done ? 2 : 1.4} />
                {!a.done && (
                  <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center"
                    style={{ background: H.bg, border: `1px solid ${H.border}` }}>
                    <Lock size={8} color={H.muted} strokeWidth={2} />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-center leading-tight px-1"
                style={{ color: a.done ? H.text : H.muted, fontFamily: fontSans }}>{a.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Menu */}
      <motion.div className="px-5 pb-5" variants={staggerContainer} initial="hidden" animate="show">
        <div className="rounded-3xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          {MENU_ITEMS.map((item, i) => (
            <motion.button key={i} variants={staggerItem}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-left"
              style={{ borderBottom: i < MENU_ITEMS.length - 1 ? `1px solid ${H.border}` : "none" }}
              onClick={() => menuNav(item.label)}
              whileHover={canHover ? { x: 3 } : {}}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}>
              <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,92,55,0.07)" }}>
                <item.Icon size={16} color={H.primary} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{item.label}</p>
                {item.sub && <p className="text-[11px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>{item.sub}</p>}
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1"
                  style={{ background: item.badge === "Soon" ? H.peach : "rgba(233,77,114,0.12)", color: item.badge === "Soon" ? H.muted : H.pink, fontFamily: fontSans }}>
                  {item.badge}
                </span>
              )}
              <ChevronRight size={15} color={H.accent} />
            </motion.button>
          ))}
        </div>
        <motion.button className="mt-4 mb-2 w-full py-4 rounded-2xl font-semibold text-[14px]"
          style={{ border: `1.5px solid rgba(14,92,55,0.20)`, color: H.primary, fontFamily: fontDisplay }}
          onClick={() => nav.push("settings")}
          whileHover={canHover ? { opacity: 0.85 } : {}}
          whileTap={{ scale: 0.97 }}>
          Гарах
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// ─── Destination Screens ───────────────────────────────────────────────────────
// Mock data (would be API-backed in production).
const ORDERS = [
  { id: "TLJ-10432", date: "2026.07.05", status: "Хүргэгдсэн", total: 117500, items: [{ n: "Тирамису Хайрцаг", q: 2, p: 55000 }, { n: "Артизан Багет", q: 1, p: 7500 }] },
  { id: "TLJ-10418", date: "2026.07.02", status: "Замд",       total: 70000,  items: [{ n: "Ягаан Цэцэгт Бялуу", q: 1, p: 70000 }] },
  { id: "TLJ-10390", date: "2026.06.28", status: "Хүргэгдсэн", total: 30500,  items: [{ n: "Сүүн Кремтэй Бялуу", q: 1, p: 18000 }, { n: "Цэцэрлэгийн Салат", q: 1, p: 12500 }] },
];
const POINT_LOG = [
  { title: "Тирамису захиалга",     date: "2026.07.05", amt:  550, Icon: ShoppingBag },
  { title: "Weekend Quiz шагнал",   date: "2026.07.05", amt:   50, Icon: Brain },
  { title: "Купон ашигласан",       date: "2026.07.03", amt: -200, Icon: Ticket },
  { title: "Хүрд эргүүлэх шагнал",  date: "2026.07.02", amt:  100, Icon: RotateCcw },
  { title: "Багет захиалга",        date: "2026.06.30", amt:   75, Icon: ShoppingBag },
];
const TIERS = [
  { label: "Хүрэл", min: 0,     Icon: Medal, color: "#CD7F32", perks: ["1x оноо", "Төрсөн өдрийн бэлэг"] },
  { label: "Мөнгө", min: 2000,  Icon: Medal, color: "#A8A8A8", perks: ["1.2x оноо", "Улирлын купон", "Эрт хандах"] },
  { label: "Алт",   min: 5000,  Icon: Star,  color: H.gold,    perks: ["1.5x оноо", "Үнэгүй хүргэлт", "VIP эвэнт"] },
  { label: "VIP",   min: 15000, Icon: Crown, color: H.pink,    perks: ["2x оноо", "Хувийн менежер", "Онцгой цэс"] },
];

// Shared shell: green safe-area header + back button + scroll body — identical on every screen.
function ScreenShell({ title, subtitle, onBack, right, children, pad = true }:
  { title: string; subtitle?: string; onBack: () => void; right?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  return (
    <>
      <div className="flex-shrink-0 relative"
        style={{ background: `linear-gradient(160deg, ${H.secondary} 0%, ${H.primary} 100%)`, paddingTop: SAFE_TOP }}>
        <div className="absolute top-0 right-[-32px] size-[130px] rounded-full opacity-[0.06] bg-white pointer-events-none" />
        <div className="flex items-center gap-3 px-5 pb-4">
          <motion.button aria-label="Буцах" onClick={onBack} whileTap={{ scale: 0.9 }}
            className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)", border: "0.7px solid rgba(255,255,255,0.22)" }}>
            <ChevronLeft size={19} color="white" strokeWidth={2.4} />
          </motion.button>
          <div className="flex-1 min-w-0">
            {subtitle && <p className="text-[9px] font-semibold uppercase tracking-[1.1px]" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>{subtitle}</p>}
            <p className="text-[18px] font-bold leading-tight text-white truncate" style={{ fontFamily: fontDisplay }}>{title}</p>
          </div>
          {right}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto ${pad ? "px-5 pt-5" : ""}`} style={{ scrollbarWidth: "none", paddingBottom: `calc(${SAFE_BOTTOM} + 8px)` }}>
        {children}
      </div>
    </>
  );
}

// Small reusable empty state
function EmptyState({ Icon, title, sub }: { Icon: typeof Cake; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Icon size={40} color={H.accent} strokeWidth={1.2} />
      <p className="text-[14px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{title}</p>
      {sub && <p className="text-[12px] text-center" style={{ fontFamily: fontSans, color: H.muted }}>{sub}</p>}
    </div>
  );
}

// Staggered list wrapper
const listStagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } } };

// ── Full Membership QR ──
function FullQRScreen({ onBack, user }: { onBack: () => void; user?: ApiUser | null }) {
  const store = useStore();
  const pts = store.points;
  const tier = pts >= 15000 ? "VIP" : pts >= 5000 ? "Алт" : pts >= 2000 ? "Мөнгө" : "Хүрэл";
  const id = `TLJ-${user?.id ?? 2840}`;
  return (
    <ScreenShell title="Гишүүнчлэлийн карт" subtitle="QR уншуулах" onBack={onBack}>
      <motion.div className="rounded-3xl p-6 flex flex-col items-center"
        style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_FLOAT }}
        initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
        <div className="flex items-center gap-1.5 mb-4">
          <Medal size={14} color={H.gold} fill={H.gold} />
          <span className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{tier} гишүүн</span>
        </div>
        <div className="relative rounded-2xl p-4" style={{ background: "white", border: `1px solid ${H.border}` }}>
          <QRCodeSVG value={`https://tlj.mn/loyalty/${id}`} size={196} fgColor={H.secondary} bgColor="#ffffff" level="M"
            imageSettings={{ src: LOGO_WHITE, width: 38, height: 26, excavate: true }} />
        </div>
        <p className="text-[20px] font-bold tracking-[6px] mt-5" style={{ fontFamily: fontDisplay, color: H.text }}>{id}</p>
        <p className="text-[12px] mt-1" style={{ fontFamily: fontSans, color: H.muted }}>{user?.name || "Батдорж Т."}</p>
      </motion.div>
      <div className="mt-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(246,182,35,0.10)", border: "1px solid rgba(246,182,35,0.25)" }}>
        <Sun size={18} color={H.gold} strokeWidth={2} />
        <p className="text-[12px] leading-relaxed" style={{ fontFamily: fontSans, color: H.muted }}>Кассанд харуулж оноо цуглуулаарай. Дэлгэцийн гэрлийг нэмбэл хурдан уншина.</p>
      </div>
    </ScreenShell>
  );
}

// ── Points History ──
function PointsHistoryScreen({ onBack, user }: { onBack: () => void; user?: ApiUser | null }) {
  const store = useStore();
  const pts = store.points;
  return (
    <ScreenShell title="Оноо түүх" subtitle="Upoint" onBack={onBack}>
      <motion.div className="rounded-3xl p-5 mb-5 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${H.secondary}, ${H.primary})` }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <div className="absolute -right-6 -top-6 size-28 rounded-full opacity-[0.07] bg-white" />
        <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>Одоогийн үлдэгдэл</p>
        <p className="text-[40px] font-bold leading-none text-white mt-1" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}><CountUp to={pts} /></p>
      </motion.div>
      <SH title="Гүйлгээ" />
      <motion.div className="space-y-2.5" variants={listStagger} initial="hidden" animate="show">
        {POINT_LOG.map((t, i) => (
          <motion.div key={i} variants={staggerItem} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: H.card, border: `1px solid ${H.border}` }}>
            <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,92,55,0.07)" }}>
              <t.Icon size={16} color={H.primary} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{t.title}</p>
              <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{t.date}</p>
            </div>
            <span className="text-[14px] font-bold" style={{ fontFamily: fontDisplay, color: t.amt > 0 ? H.primary : H.pink, fontVariantNumeric: "tabular-nums" }}>
              {t.amt > 0 ? "+" : ""}{t.amt}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </ScreenShell>
  );
}

// ── Coupon Wallet ──
function CouponWalletScreen({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const nav   = useNav();
  const [tab, setTab] = useState<"available" | "used" | "expired">("available");
  const all = walletCoupons(store.redeemed);
  const list = all.filter((c) => couponStatus(c, store.usedCoupons) === tab);
  const TABS = [
    { k: "available" as const, label: "Идэвхтэй" },
    { k: "used"      as const, label: "Ашигласан" },
    { k: "expired"   as const, label: "Дууссан" },
  ];
  const empties: Record<string, { title: string; sub?: string }> = {
    available: { title: "Идэвхтэй купон алга", sub: "Оноогоор шагнал сольж купон аваарай" },
    used:      { title: "Ашигласан купон алга" },
    expired:   { title: "Хугацаа дууссан купон алга" },
  };
  return (
    <ScreenShell title="Купон түрийвч" subtitle="Rewards" onBack={onBack}>
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <motion.button key={t.k} onClick={() => setTab(t.k)} whileTap={{ scale: 0.96 }}
            className="flex-1 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: tab === t.k ? H.primary : H.card, color: tab === t.k ? "white" : H.muted, border: `1px solid ${tab === t.k ? H.primary : H.border}`, fontFamily: fontSans }}>
            {t.label}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {list.length === 0 ? (
          <motion.div key={"empty-" + tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState Icon={Ticket} title={empties[tab].title} sub={empties[tab].sub} />
          </motion.div>
        ) : (
          <motion.div key={"list-" + tab} className="space-y-3" variants={listStagger} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            {list.map((c) => {
              const st = couponStatus(c, store.usedCoupons);
              return (
                <motion.button key={c.id} variants={staggerItem} onClick={() => nav.push("couponDetail", c)}
                  className="w-full text-left flex rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}`, opacity: st === "available" ? 1 : 0.6 }}
                  whileTap={{ scale: 0.98 }}>
                  <div className="w-1.5 flex-shrink-0" style={{ background: c.color }} />
                  <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
                    <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color + "18" }}>
                      <Gift size={18} color={c.color} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px]" style={{ fontFamily: fontDisplay, color: st === "available" ? H.text : H.muted }}>{c.title}</p>
                      <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{c.sub}</p>
                      <div className="flex items-center gap-1 mt-1"><Clock size={10} color={H.muted} /><span className="text-[10px]" style={{ color: H.muted, fontFamily: fontSans }}>{c.expiry} хүртэл</span></div>
                    </div>
                    {st === "available" ? <ChevronRight size={16} color={H.accent} />
                     : <span className="text-[10px] font-bold px-2 py-1 rounded-xl flex-shrink-0" style={{ background: H.bg, color: H.muted, fontFamily: fontSans }}>{st === "used" ? "Ашигласан" : "Дууссан"}</span>}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}

// ── Coupon Detail (use flow + success) ──
function CouponDetailScreen({ onBack, coupon }: { onBack: () => void; coupon: CouponT }) {
  const store = useStore();
  const reduce = useReducedMotion();
  const st = couponStatus(coupon, store.usedCoupons);
  const [done, setDone] = useState(false);
  const use = () => { store.useCoupon(coupon.id); setDone(true); };
  return (
    <ScreenShell title={coupon.title} subtitle="Купон" onBack={onBack}>
      <motion.div className="rounded-3xl overflow-hidden mb-4" style={{ border: `1px solid ${H.border}` }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <div className="p-5 text-center" style={{ background: coupon.color }}>
          <Gift size={30} color="white" strokeWidth={1.8} className="mx-auto mb-2" />
          <p className="text-[22px] font-bold text-white" style={{ fontFamily: fontDisplay }}>{coupon.title}</p>
          <p className="text-[12px] text-white/85" style={{ fontFamily: fontSans }}>{coupon.sub}</p>
        </div>
        <div className="p-5 flex flex-col items-center" style={{ background: H.card }}>
          <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${H.border}` }}>
            <QRCodeSVG value={`https://tlj.mn/coupon/${coupon.id}`} size={128} fgColor={H.secondary} bgColor="#ffffff" level="M" />
          </div>
          <p className="text-[11px] mt-3" style={{ fontFamily: fontSans, color: H.muted }}>Кассанд харуулна уу</p>
        </div>
      </motion.div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: H.card, border: `1px solid ${H.border}` }}>
        <p className="text-[12px] font-bold mb-1" style={{ fontFamily: fontDisplay, color: H.text }}>Нөхцөл</p>
        <p className="text-[12px] leading-relaxed" style={{ fontFamily: fontSans, color: H.muted }}>{coupon.terms}</p>
        <div className="flex items-center gap-1 mt-2"><Clock size={11} color={H.muted} /><span className="text-[11px]" style={{ color: H.muted, fontFamily: fontSans }}>{coupon.expiry} хүртэл хүчинтэй</span></div>
      </div>
      {st === "available" && !done ? (
        <motion.button onClick={use} whileTap={{ scale: 0.97 }} className="w-full rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
          style={{ height: 52, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}>
          <Ticket size={18} color="white" /> Ашиглах
        </motion.button>
      ) : (
        <motion.div className="w-full rounded-full flex items-center justify-center gap-2 font-bold text-[15px]"
          style={{ height: 52, background: H.bg, color: H.muted, border: `1px solid ${H.border}`, fontFamily: fontDisplay }}
          initial={done ? { scale: reduce ? 1 : 0.95 } : false} animate={{ scale: 1 }}>
          <CheckCircle size={18} color={st === "used" || done ? H.primary : H.muted} strokeWidth={2} /> {st === "expired" ? "Хугацаа дууссан" : "Ашигласан"}
        </motion.div>
      )}
    </ScreenShell>
  );
}

// ── Orders History ──
function OrdersScreen({ onBack }: { onBack: () => void }) {
  const nav = useNav();
  const store = useStore();
  const [tab, setTab] = useState<"active" | "past">("active");
  const all = [...store.orders.map(toOrderView), ...ORDERS.map(toOrderView)];
  const list = all.filter((o) => (tab === "active" ? o.statusIdx < 4 : o.statusIdx === 4));
  return (
    <ScreenShell title="Захиалгын түүх" subtitle="Orders" onBack={onBack}>
      <div className="flex gap-2 mb-4">
        {([["active", "Идэвхтэй"], ["past", "Түүх"]] as const).map(([k, label]) => (
          <motion.button key={k} onClick={() => setTab(k)} whileTap={{ scale: 0.96 }} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold"
            style={{ background: tab === k ? H.primary : H.card, color: tab === k ? "white" : H.muted, border: `1px solid ${tab === k ? H.primary : H.border}`, fontFamily: fontSans }}>{label}</motion.button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState Icon={Package} title={tab === "active" ? "Идэвхтэй захиалга алга" : "Захиалгын түүх алга"} sub={tab === "active" ? "Дэлгүүрээс захиалга хийгээрэй" : undefined} />
      ) : (
        <motion.div className="space-y-3" variants={listStagger} initial="hidden" animate="show">
          {list.map((o) => (
            <motion.button key={o.id} variants={staggerItem} onClick={() => nav.push("order", o)} whileTap={{ scale: 0.98 }}
              className="w-full text-left rounded-2xl p-4" style={{ background: H.card, border: `1px solid ${H.border}`, boxShadow: SHADOW_CARD }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{o.id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: (o.statusIdx === 4 ? H.primary : H.gold) + "18", color: o.statusIdx === 4 ? H.primary : H.gold, fontFamily: fontSans }}>{ORDER_STEPS[o.statusIdx]}</span>
              </div>
              <p className="text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>{o.items.map((it) => `${it.name} ×${it.qty}`).join(", ")}</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{o.date}</span>
                <span className="text-[14px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{fmt(o.total)}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </ScreenShell>
  );
}

// ── Order Detail — status tracker + repeat order ──
function OrderDetailScreen({ onBack, order }: { onBack: () => void; order: OrderView }) {
  const store = useStore();
  const nav = useNav();
  const reduce = useReducedMotion();
  const repeat = () => {
    const src = order.cartItems
      ? order.cartItems.map((it) => ({ pid: it.pid, qty: it.qty }))
      : order.items.map((it) => { const p = PRODUCTS.find((pp) => pp.name === it.name); return p ? { pid: p.id, qty: it.qty } : null; }).filter(Boolean) as { pid: number; qty: number }[];
    src.forEach((it) => store.addToCart(it.pid, it.qty));
    nav.push("cart");
  };
  return (
    <ScreenShell title={order.id} subtitle="Захиалгын дэлгэрэнгүй" onBack={onBack}>
      {/* Animated status tracker */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: H.card, border: `1px solid ${H.border}` }}>
        {ORDER_STEPS.map((s, i) => {
          const done = i < order.statusIdx, active = i === order.statusIdx;
          return (
            <div key={s} className="flex items-center gap-3 py-1.5">
              <motion.div className="size-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: done || active ? H.primary : H.bg, border: `1.5px solid ${done || active ? H.primary : H.accent}` }}
                animate={active && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ repeat: active ? Infinity : 0, duration: 1.2 }}>
                {done ? <CheckCircle size={13} color="white" strokeWidth={2.4} /> : active ? <div className="size-2 rounded-full bg-white" /> : <Dot size={13} color={H.muted} />}
              </motion.div>
              <span className="text-[13px] font-medium" style={{ fontFamily: fontSans, color: done || active ? H.text : H.muted }}>{s}</span>
              {active && (
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(246,182,35,0.15)", color: "#9A7B12", fontFamily: fontSans }}>Одоо</span>
                  {order.placedAt && order.statusIdx < 4 && (
                    <CountDown to={order.placedAt + ORDER_STEP_DURATIONS.slice(0, order.statusIdx + 1).reduce((a, b) => a + b, 0)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Pickup info */}
      {order.store !== "—" && (
        <div className="rounded-2xl p-4 mb-4 space-y-2" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          <div className="flex items-center gap-2"><Store size={14} color={H.primary} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>{order.store}</span></div>
          <div className="flex items-center gap-2"><Clock size={14} color={H.primary} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>{order.pickup}</span></div>
          <div className="flex items-center gap-2"><CreditCard size={14} color={H.primary} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>{order.payment}</span></div>
        </div>
      )}
      {/* Items + summary (receipt) */}
      <SH title="Баримт" />
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: H.card, border: `1px solid ${H.border}` }}>
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${H.border}` }}>
            <span className="text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{it.name} <span style={{ color: H.muted }}>×{it.qty}</span></span>
            <span className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text, fontVariantNumeric: "tabular-nums" }}>{fmt(it.price * it.qty)}</span>
          </div>
        ))}
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}><span>Дэд дүн</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-[12px]" style={{ fontFamily: fontSans, color: H.pink }}><span>Хөнгөлөлт</span><span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(order.discount)}</span></div>}
          {order.pointsUsed > 0 && <div className="flex justify-between text-[12px]" style={{ fontFamily: fontSans, color: H.gold }}><span>Оноо</span><span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(order.pointsUsed)}</span></div>}
        </div>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(14,92,55,0.04)" }}>
          <span className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Нийт</span>
          <span className="text-[16px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{fmt(order.total)}</span>
        </div>
      </div>
      <motion.button onClick={repeat} whileTap={{ scale: 0.97 }} className="w-full rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white"
        style={{ height: 52, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}>
        <RotateCcw size={17} color="white" /> Дахин захиалах
      </motion.button>
    </ScreenShell>
  );
}

// ── Membership Details ──
function MembershipScreen({ onBack, user }: { onBack: () => void; user?: ApiUser | null }) {
  const store = useStore();
  const pts = store.points;
  const curIdx = TIERS.reduce((a, t, i) => (pts >= t.min ? i : a), 0);
  return (
    <ScreenShell title="Гишүүнчлэл" subtitle="Membership" onBack={onBack}>
      <motion.div className="space-y-3" variants={listStagger} initial="hidden" animate="show">
        {TIERS.map((t, i) => {
          const cur = i === curIdx;
          return (
            <motion.div key={t.label} variants={staggerItem} className="rounded-2xl p-4"
              style={{ background: cur ? "rgba(14,92,55,0.06)" : H.card, border: `1.5px solid ${cur ? H.primary : H.border}` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-2xl flex items-center justify-center" style={{ background: t.color + "1F" }}>
                  <t.Icon size={20} color={t.color} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>{t.label}</p>
                    {cur && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: H.primary, fontFamily: fontSans }}>Одоогийн</span>}
                  </div>
                  <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{t.min.toLocaleString()}+ оноо</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.perks.map((p) => (
                  <span key={p} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: H.bg, color: H.text, fontFamily: fontSans }}>{p}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </ScreenShell>
  );
}

// ── Rewards Progress ──
function RewardsProgressScreen({ onBack, user }: { onBack: () => void; user?: ApiUser | null }) {
  const store = useStore();
  const pts = store.points;
  const curIdx = TIERS.reduce((a, t, i) => (pts >= t.min ? i : a), 0);
  const next = TIERS[curIdx + 1];
  const cur = TIERS[curIdx];
  const pct = next ? Math.min(100, ((pts - cur.min) / (next.min - cur.min)) * 100) : 100;
  const xp = store.xp;
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  return (
    <ScreenShell title="Урамшууллын явц" subtitle="Progress" onBack={onBack}>
      <motion.div className="rounded-3xl p-5 mb-5" style={{ background: `linear-gradient(160deg, ${H.secondary}, ${H.primary})` }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(244,239,216,0.55)", fontFamily: fontSans }}>{cur.label} шат</p>
        <p className="text-[32px] font-bold text-white leading-none mt-1" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}><CountUp to={pts} /> оноо</p>
        <div className="mt-4"><ProgressBar pct={pct} color={`linear-gradient(90deg, ${H.gold}, #FFD766)`} /></div>
        <p className="text-[12px] mt-2" style={{ color: "rgba(244,239,216,0.75)", fontFamily: fontSans }}>
          {next ? <>Дараагийн шат <b style={{ color: H.gold }}>{next.label}</b> хүртэл {(next.min - pts).toLocaleString()} оноо</> : "Хамгийн дээд шатанд хүрлээ 👑"}
        </p>
      </motion.div>
      {/* XP & Level */}
      <div className="rounded-3xl p-4 mb-5" style={{ background: H.card, border: `1px solid ${H.border}` }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(246,182,35,0.15)" }}><Zap size={16} color={H.gold} fill={H.gold} /></div>
            <div>
              <p className="text-[10px]" style={{ color: H.muted, fontFamily: fontSans }}>Тоглогчийн түвшин</p>
              <p className="text-[14px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Lv.{level}</p>
            </div>
          </div>
          <span className="text-[13px] font-bold" style={{ color: H.primary, fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{xp.toLocaleString()} XP</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(14,92,55,0.10)" }}>
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${H.primary}, ${H.gold})` }}
            initial={{ width: 0 }} animate={{ width: `${xpInLevel}%` }} transition={{ duration: 1, delay: 0.3, ease: easeOut }} />
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: H.muted, fontFamily: fontSans }}>Lv.{level + 1} хүртэл {100 - xpInLevel} XP</p>
      </div>

      <SH title="Өдрийн даалгавар" />
      <motion.div className="space-y-2" variants={listStagger} initial="hidden" animate="show">
        {MISSIONS.map((m) => (
          <motion.div key={m.id} variants={staggerItem} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: m.done ? "rgba(14,92,55,0.07)" : H.card, border: `1px solid ${m.done ? "rgba(14,92,55,0.12)" : H.border}` }}>
            {m.done ? <CheckCircle size={18} color={H.primary} strokeWidth={2} /> : <div className="size-[18px] rounded-full border-2 flex-shrink-0" style={{ borderColor: H.accent }} />}
            <p className="flex-1 text-[13px] font-medium" style={{ color: m.done ? H.muted : H.text, fontFamily: fontSans, textDecoration: m.done ? "line-through" : "none" }}>{m.text}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.done ? "rgba(14,92,55,0.08)" : "rgba(246,182,35,0.15)", color: m.done ? H.primary : H.gold, fontFamily: fontSans }}>+{m.xp} XP</span>
          </motion.div>
        ))}
      </motion.div>
    </ScreenShell>
  );
}

// ── Settings ──
function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [notif, setNotif] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const reduce = useReducedMotion();
  const Row = ({ Icon, label, sub, children }: { Icon: typeof Cake; label: string; sub?: string; children?: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,92,55,0.07)" }}><Icon size={16} color={H.primary} strokeWidth={1.8} /></div>
      <div className="flex-1"><p className="text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{label}</p>{sub && <p className="text-[11px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>{sub}</p>}</div>
      {children}
    </div>
  );
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <motion.button onClick={onClick} className="w-11 h-6 rounded-full flex items-center px-0.5" style={{ background: on ? H.primary : H.accent }} whileTap={{ scale: 0.94 }}>
      <motion.div className="size-5 rounded-full bg-white" animate={{ x: on ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
    </motion.button>
  );
  return (
    <ScreenShell title="Тохиргоо" subtitle="Settings" onBack={onBack}>
      <div className="rounded-3xl overflow-hidden mb-4 divide-y" style={{ background: H.card, border: `1px solid ${H.border}`, borderColor: H.border }}>
        <Row Icon={Bell} label="Мэдэгдэл" sub="Push мэдэгдэл"><Toggle on={notif} onClick={() => setNotif((v) => !v)} /></Row>
        <Row Icon={Moon} label="Харанхуй горим" sub="Удахгүй"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: H.peach, color: H.muted, fontFamily: fontSans }}>Soon</span></Row>
        <Row Icon={CreditCard} label="Төлбөрийн арга" sub="QPay · SocialPay"><ChevronRight size={16} color={H.accent} /></Row>
        <Row Icon={MapPin} label="Хүргэлтийн хаяг" sub="2 хаяг"><ChevronRight size={16} color={H.accent} /></Row>
        <Row Icon={Headphones} label="Тусламж" sub="Холбоо барих"><ChevronRight size={16} color={H.accent} /></Row>
      </div>
      <motion.button onClick={() => setConfirm(true)} whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-[14px]"
        style={{ border: `1.5px solid rgba(233,77,114,0.35)`, color: H.pink, fontFamily: fontDisplay }}>
        <LogOut size={16} color={H.pink} /> Гарах
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {confirm && (
            <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-8" style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(false)}>
              <motion.div className="w-full rounded-3xl p-6 text-center" style={{ background: H.card }} onClick={(e) => e.stopPropagation()}
                initial={{ scale: reduce ? 1 : 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                <p className="text-[17px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Гарах уу?</p>
                <p className="text-[13px] mt-1 mb-5" style={{ fontFamily: fontSans, color: H.muted }}>Дахин нэвтрэхэд оноо хадгалагдана.</p>
                <div className="flex gap-3">
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)} className="flex-1 py-3 rounded-2xl font-semibold text-[14px]" style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Болих</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setConfirm(false)} className="flex-1 py-3 rounded-2xl font-semibold text-[14px] text-white" style={{ background: H.pink, fontFamily: fontDisplay }}>Гарах</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>, document.body)}
    </ScreenShell>
  );
}

// ── Achievement Detail ──
function AchievementScreen({ onBack, achievement }: { onBack: () => void; achievement: typeof ACHIEVEMENTS[0] }) {
  const a = achievement;
  return (
    <ScreenShell title="Амжилт" subtitle="Achievement" onBack={onBack}>
      <motion.div className="flex flex-col items-center text-center py-6"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
        <div className="size-24 rounded-3xl flex items-center justify-center relative" style={{ background: a.done ? `linear-gradient(145deg, ${H.gold}, #FFD766)` : H.card, border: `1px solid ${H.border}`, boxShadow: a.done ? "0 12px 30px rgba(246,182,35,0.35)" : "none" }}>
          <a.Icon size={44} color={a.done ? "white" : H.accent} strokeWidth={1.6} />
          {!a.done && <div className="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center" style={{ background: H.bg, border: `1px solid ${H.border}` }}><Lock size={13} color={H.muted} /></div>}
        </div>
        <p className="text-[22px] font-bold mt-4" style={{ fontFamily: fontDisplay, color: H.text }}>{a.label}</p>
        <span className="text-[11px] font-bold px-3 py-1 rounded-full mt-2" style={{ background: a.done ? "rgba(14,92,55,0.08)" : H.bg, color: a.done ? H.primary : H.muted, fontFamily: fontSans }}>
          {a.done ? "Нээгдсэн" : "Түгжээтэй"}
        </span>
        <p className="text-[13px] leading-relaxed mt-4 px-4" style={{ fontFamily: fontSans, color: H.muted }}>
          {a.done ? "Баяр хүргэе! Та энэ амжилтыг гаргалаа. Үргэлжлүүлэн цуглуулаарай." : "Энэ амжилтыг нээхийн тулд илүү идэвхтэй байгаарай."}
        </p>
      </motion.div>
      <SH title="Бусад амжилт" />
      <div className="grid grid-cols-4 gap-2.5">
        {ACHIEVEMENTS.map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-2xl py-3" style={{ background: x.label === a.label ? "rgba(14,92,55,0.07)" : H.card, border: `1px solid ${x.label === a.label ? "rgba(14,92,55,0.15)" : H.border}` }}>
            <x.Icon size={18} color={x.done ? H.primary : H.accent} strokeWidth={x.done ? 2 : 1.4} />
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

// ── Search ──
function SearchScreen({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState("");
  const results = q ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : [];
  const recent = ["Тирамису", "Багет", "Матча", "Салат"];
  return (
    <ScreenShell title="Хайлт" subtitle="Search" onBack={onBack} pad={false}>
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          <Search size={16} color={H.muted} strokeWidth={2} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Бүтээгдэхүүн хайх…"
            className="flex-1 outline-none bg-transparent text-[16px]" style={{ fontFamily: fontSans, color: H.text }} />
          {q && <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQ("")}><X size={16} color={H.muted} /></motion.button>}
        </div>
        {!q ? (
          <>
            <p className="text-[12px] font-semibold mb-2" style={{ fontFamily: fontSans, color: H.muted }}>Сүүлд хайсан</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} onClick={() => setQ(r)} className="px-3 py-1.5 rounded-full text-[12px]" style={{ background: H.card, border: `1px solid ${H.border}`, color: H.text, fontFamily: fontSans }}>{r}</button>
              ))}
            </div>
          </>
        ) : results.length === 0 ? (
          <EmptyState Icon={Search} title="Үр дүн олдсонгүй" sub={`«${q}» олдсонгүй`} />
        ) : (
          <motion.div className="grid grid-cols-2 gap-3" variants={listStagger} initial="hidden" animate="show">
            {results.map((p) => (
              <motion.div key={p.id} variants={staggerItem} className="rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                <div className="relative w-full" style={{ paddingTop: "66%" }}><CoverImg src={p.img} alt={p.name} /></div>
                <div className="p-3">
                  <p className="text-[12px] font-semibold line-clamp-2" style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                  <p className="text-[13px] font-bold mt-1" style={{ color: H.primary, fontFamily: fontSans }}>{fmt(p.price)}</p>
                </div>
              </motion.div>
            ))}
        </motion.div>
      )}
      </div>
    </ScreenShell>
  );
}

// ── Branches ──
function BranchesScreen({ onBack }: { onBack: () => void }) {
  const branches = [
    { n: "Улаанбаатар · Central Tower", h: "08:00 – 22:00", open: true },
    { n: "United Mall салбар", h: "10:00 – 22:00", open: true },
    { n: "Улаангом · 26 дахь салбар", h: "09:00 – 21:00", open: true },
    { n: "Дархан салбар", h: "09:00 – 21:00", open: false },
  ];
  return (
    <ScreenShell title="Салбарууд" subtitle="26 салбар" onBack={onBack}>
      <motion.div className="space-y-3" variants={listStagger} initial="hidden" animate="show">
        {branches.map((b) => (
          <motion.div key={b.n} variants={staggerItem} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: H.card, border: `1px solid ${H.border}` }}>
            <div className="size-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,92,55,0.07)" }}><Store size={18} color={H.primary} strokeWidth={1.8} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{b.n}</p>
              <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{b.h}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: b.open ? "rgba(14,92,55,0.10)" : "rgba(0,0,0,0.05)", color: b.open ? H.primary : H.muted, fontFamily: fontSans }}>{b.open ? "Нээлттэй" : "Хаалттай"}</span>
          </motion.div>
        ))}
      </motion.div>
    </ScreenShell>
  );
}

// ── Nav host: renders the top of the stack, sliding in from the right ──
// ─── Checkout system ───────────────────────────────────────────────────────────
const PICKUP_STORES = ["Central Tower салбар", "United Mall салбар", "Улаанбаатар · 26 салбар"];
const PICKUP_TIMES  = ["Аль болох хурдан · 15 мин", "30 минутын дараа", "1 цагийн дараа", "Өнөөдөр 18:00"];
const PAY_METHODS = [
  { id: "apple",  label: "Apple Pay",       Icon: CreditCard, tint: "#111111" },
  { id: "qpay",   label: "QPay",            Icon: QrCode,     tint: H.primary },
  { id: "card",   label: "Картаар төлөх",   Icon: CreditCard, tint: H.secondary },
  { id: "wallet", label: "TLJ Wallet",      Icon: Wallet,     tint: H.gold },
  { id: "cash",   label: "Кассанд бэлнээр", Icon: Store,      tint: H.muted },
];
const ORDER_STEPS = ["Бэлтгэж байна", "Жигнэж байна", "Чанар шалгах", "Авахад бэлэн", "Дууссан"];
const ORDER_STEP_DURATIONS = [45_000, 60_000, 30_000, 90_000];
// Coupon → discount amount for a given subtotal (business logic).
const couponDiscount = (c: CouponT, subtotal: number) => {
  const pct = c.title.match(/(\d+)\s*%/);
  if (pct) return Math.round((subtotal * parseInt(pct[1], 10)) / 100);
  if (/Тирамису/.test(c.title)) return Math.min(subtotal, 55000);
  if (/Кофе/.test(c.title))     return Math.min(subtotal, 12000);
  return 0;  // free-delivery coupons have no effect on pickup
};

// Normalize any order (placed or mock) into one display shape for Orders + OrderDetail.
type OrderView = { id: string; date: string; statusIdx: number; items: { name: string; qty: number; price: number }[]; subtotal: number; discount: number; pointsUsed: number; total: number; store: string; pickup: string; payment: string; earned?: number; cartItems?: CartItem[]; placedAt?: number };
const toOrderView = (o: any): OrderView => {
  if (typeof o.status === "number") {   // PlacedOrder
    return { id: o.id, date: o.date, statusIdx: o.status, subtotal: o.subtotal, discount: o.discount, pointsUsed: o.pointsUsed, total: o.total, store: o.store, pickup: o.pickup, payment: o.payment, earned: o.earned, cartItems: o.items, placedAt: o.placedAt,
      items: o.items.map((it: CartItem) => ({ name: PRODUCTS.find((p) => p.id === it.pid)?.name || "", qty: it.qty, price: productPrice(it.pid) })) };
  }
  const statusIdx = o.status === "Хүргэгдсэн" ? 4 : o.status === "Замд" ? 3 : 2;   // mock ORDERS
  return { id: o.id, date: o.date, statusIdx, subtotal: o.total, discount: 0, pointsUsed: 0, total: o.total, store: "Central Tower салбар", pickup: "—", payment: "—",
    items: o.items.map((it: any) => ({ name: it.n, qty: it.q, price: it.p })) };
};

// ── Cart ──
function CartScreen({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const nav = useNav();
  const reduce = useReducedMotion();
  const items = store.cart;
  const subtotal = store.cartTotal;

  const [deletedItem, setDeletedItem] = useState<CartItem | null>(null);
  const undoRef = useRef<number | null>(null);

  const eligible = walletCoupons(store.redeemed).filter((c) => couponStatus(c, store.usedCoupons) === "available");
  const bestCoupon = eligible.length > 0 ? eligible.reduce((a, b) => (couponDiscount(a, subtotal) > couponDiscount(b, subtotal) ? a : b)) : null;
  const [couponId, setCouponId] = useState<number | null>(null);
  const appliedCoupon = eligible.find((c) => c.id === couponId) ?? null;
  const discount = appliedCoupon ? couponDiscount(appliedCoupon, subtotal) : 0;

  const [usePoints, setUsePoints] = useState(false);
  const afterCoupon = Math.max(0, subtotal - discount);
  const pointsUsed = usePoints ? Math.min(store.points, afterCoupon) : 0;
  const total = Math.max(0, afterCoupon - pointsUsed);
  const earned = earnedFor(total);

  const handleDelete = (it: CartItem) => {
    setDeletedItem(it);
    store.removeItem(it.pid);
    if (undoRef.current) clearTimeout(undoRef.current);
    undoRef.current = window.setTimeout(() => setDeletedItem(null), 3000);
  };

  const handleUndo = () => {
    if (deletedItem) {
      store.addToCart(deletedItem.pid, deletedItem.qty, deletedItem.temp);
      setDeletedItem(null);
      if (undoRef.current) clearTimeout(undoRef.current);
    }
  };

  const notInCart = PRODUCTS.filter((p) => !items.some((it) => it.pid === p.id));

  return (
    <ScreenShell title="Сагс" subtitle={`${store.cartCount} бүтээгдэхүүн`} onBack={onBack} pad={false}>
      {items.length === 0 ? (
        <div className="px-5 pt-2">
          <EmptyState Icon={ShoppingBag} title="Сагс хоосон байна" sub="Дэлгүүрээс дуртай бүтээгдэхүүнээ нэмээрэй" />
          <motion.button onClick={() => { onBack(); }} whileTap={{ scale: 0.97 }}
            className="w-full rounded-full flex items-center justify-center font-bold text-[15px] text-white" style={{ height: 50, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>
            Дэлгүүр рүү
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: "none" }}>

            {/* ── Cart Items ── */}
            <div className="px-5 pt-4 space-y-3">
              <AnimatePresence initial={false}>
                {items.map((it) => {
                  const p = PRODUCTS.find((x) => x.id === it.pid);
                  if (!p) return null;
                  return (
                    <motion.div key={it.pid} layout
                      className="relative overflow-hidden rounded-3xl"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}>
                      {/* Contained delete affordance — only an 84px zone on the right, never the whole card */}
                      <div className="absolute inset-y-0 right-0 w-[84px] flex items-center justify-center rounded-r-3xl" style={{ background: H.pink }}>
                        <Trash2 size={20} color="white" strokeWidth={2} />
                      </div>
                      <motion.div drag="x" dragConstraints={{ left: -84, right: 0 }} dragElastic={0.06} dragSnapToOrigin
                        onDragEnd={(_, info) => { if (info.offset.x < -60) handleDelete(it); }}
                        style={{ background: H.card, border: `1px solid ${H.border}`, position: "relative", zIndex: 1 }}
                        className="rounded-3xl overflow-hidden">
                        {/* Main row */}
                        <div className="flex gap-3 p-3">
                          <div className="size-[72px] rounded-2xl overflow-hidden flex-shrink-0 relative" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                            <CoverImg src={p.img} alt={p.name} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold leading-tight" style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                            <p className="text-[11px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>
                              {(() => { const c = CATS.find(x => x.id === p.cat); if (!c) return p.tag; const cc = CAT_COLORS[p.cat] || H.muted; return <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 3, background: cc + "18" }}><c.Icon size={8} color={cc} strokeWidth={2.5} /></span><span style={{ color: cc }}>{c.label}</span></span>; })()} · {p.tag}
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ fontFamily: fontSans, color: H.muted }}>{fmt(p.price)} × {it.qty}</p>
                            <p className="text-[16px] font-bold mt-1" style={{ color: H.primary, fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>{fmt(p.price * it.qty)}</p>
                          </div>
                        </div>
                        {/* Bottom actions row */}
                        <div className="flex items-center justify-between px-3 pb-3" style={{ borderTop: `1px solid ${H.border}`, paddingTop: 12, marginTop: 0 }}>
                          <div className="flex items-center gap-4">
                            <motion.button
                              className="flex items-center gap-1.5 text-[12px] font-medium"
                              style={{ color: H.muted, fontFamily: fontSans }}
                              onClick={() => store.saveForLater(it.pid)}
                              whileTap={{ scale: 0.92 }}>
                              <Heart size={14} color={H.muted} strokeWidth={1.8} /> Хадгалах
                            </motion.button>
                            <motion.button
                              className="flex items-center gap-1.5 text-[12px] font-medium"
                              style={{ color: H.muted, fontFamily: fontSans }}
                              onClick={() => handleDelete(it)}
                              whileTap={{ scale: 0.92 }}>
                              <Trash2 size={14} color={H.muted} strokeWidth={1.8} /> Устгах
                            </motion.button>
                          </div>
                          <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: H.bg, border: `1px solid ${H.border}` }}>
                            <motion.button aria-label="Хасах"
                              onClick={() => store.setQty(it.pid, it.qty - 1)}
                              whileTap={{ scale: 0.88 }}
                              className="size-8 rounded-full flex items-center justify-center"
                              style={{ background: H.card, border: `1px solid ${H.border}` }}
                              whileHover={canHover ? { scale: 1.05 } : {}}>
                              <Minus size={14} color={H.text} strokeWidth={2.5} />
                            </motion.button>
                            <motion.span key={it.qty}
                              className="w-8 text-center text-[16px] font-bold select-none"
                              style={{ fontFamily: fontSans, color: H.text, fontVariantNumeric: "tabular-nums" }}
                              initial={reduce ? undefined : { scale: 1.3 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                              {it.qty}
                            </motion.span>
                            <motion.button aria-label="Нэмэх"
                              onClick={() => store.setQty(it.pid, it.qty + 1)}
                              whileTap={{ scale: 0.88 }}
                              className="size-8 rounded-full flex items-center justify-center"
                              style={{ background: H.primary }}
                              whileHover={canHover ? { scale: 1.05 } : {}}>
                              <Plus size={14} color="white" strokeWidth={2.5} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ── Saved Items ── */}
            {store.savedItems.length > 0 && (
              <div className="px-5 pt-5">
                <SH title="Хадгалсан" />
                <div className="space-y-2">
                  {store.savedItems.map((it) => {
                    const p = PRODUCTS.find((x) => x.id === it.pid);
                    if (!p) return null;
                    return (
                      <div key={it.pid} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                        <div className="size-14 rounded-xl overflow-hidden flex-shrink-0 relative"><CoverImg src={p.img} alt={p.name} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                          {(() => { const c = CATS.find(x => x.id === p.cat); if (!c) return null; const cc = CAT_COLORS[p.cat] || H.muted; return <div className="flex items-center gap-1 mt-0.5"><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 3, background: cc + "18" }}><c.Icon size={8} color={cc} strokeWidth={2.5} /></span><span className="text-[11px]" style={{ fontFamily: fontSans, color: cc }}>{c.label}</span></div>; })()}
                          <p className="text-[12px] font-bold mt-0.5" style={{ color: H.primary, fontFamily: fontSans, fontVariantNumeric: "tabular-nums" }}>{fmt(p.price * it.qty)}</p>
                        </div>
                        <motion.button
                          className="text-[11px] font-semibold px-4 py-2 rounded-full text-white"
                          style={{ background: H.primary, fontFamily: fontSans }}
                          onClick={() => store.moveToCart(it.pid)}
                          whileTap={{ scale: 0.93 }}>
                          Сагсанд
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Coupon Section ── */}
            {eligible.length > 0 && (
              <div className="px-5 mt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1" style={{ fontFamily: fontSans, color: H.muted }}>Купон</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                  {bestCoupon && (
                    <motion.button
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      onClick={() => setCouponId(couponId === bestCoupon.id ? null : bestCoupon.id)}
                      whileTap={{ scale: 0.99 }}
                      aria-label={appliedCoupon ? "Купоныг арилгах" : "Купон ашиглах"}>
                      <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: bestCoupon.color + "18" }}>
                        <Tag size={18} color={bestCoupon.color} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{bestCoupon.title}</p>
                        <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>{bestCoupon.sub}</p>
                      </div>
                      {appliedCoupon ? (
                        <motion.div className="size-6 rounded-full flex items-center justify-center" style={{ background: H.primary }}
                          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                          <CheckCircle size={14} color="white" strokeWidth={2.5} />
                        </motion.div>
                      ) : (
                        <motion.div className="px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: H.primary + "12", color: H.primary, fontFamily: fontSans }}
                          whileHover={canHover ? { scale: 1.05 } : {}}>
                          Ашиглах
                        </motion.div>
                      )}
                    </motion.button>
                  )}
                  {discount > 0 && (
                    <motion.div className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderTop: `1px solid ${H.border}`, background: "rgba(14,92,55,0.03)" }}
                      initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ease, duration: 0.28 }}>
                      <span className="text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>Хэмнэлт</span>
                      <span className="text-[13px] font-bold" style={{ fontFamily: fontDisplay, color: H.pink, fontVariantNumeric: "tabular-nums" }}>−{fmt(discount)}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── Points Section ── */}
            {store.points > 0 && (
              <div className="px-5 mt-4">
                <p className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1" style={{ fontFamily: fontSans, color: H.muted }}>Оноо</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: H.gold + "20" }}>
                      <Sparkles size={18} color={H.gold} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>Дансны оноо</p>
                      <p className="text-[12px] font-bold" style={{ fontFamily: fontSans, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{store.points.toLocaleString()} Upoint</p>
                    </div>
                    <motion.button
                      className={`px-4 py-2 rounded-full text-[12px] font-semibold`}
                      style={{ background: usePoints ? H.primary : H.bg, color: usePoints ? "white" : H.muted, fontFamily: fontSans }}
                      onClick={() => setUsePoints(!usePoints)}
                      whileTap={{ scale: 0.93 }}>
                      {usePoints ? "Хэрэглэж байна" : "Хэрэглэх"}
                    </motion.button>
                  </div>
                  {usePoints && (
                    <motion.div className="space-y-1.5 px-4 pb-3.5"
                      initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ease, duration: 0.28 }}>
                      <div className="flex justify-between text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>
                        <span>Ашигласан оноо</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(pointsUsed)}</span>
                      </div>
                      <div className="flex justify-between text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>
                        <span>Үлдсэн оноо</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(store.points - pointsUsed)}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── Order Summary ── */}
            <div className="px-5 mt-4">
              <p className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1" style={{ fontFamily: fontSans, color: H.muted }}>Захиалгын дүн</p>
              <div className="rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>
                    <span>Дэд дүн</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <motion.div className="flex justify-between text-[13px]" style={{ fontFamily: fontSans, color: H.pink }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <span>Купоны хөнгөлөлт</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(discount)}</span>
                    </motion.div>
                  )}
                  {pointsUsed > 0 && (
                    <motion.div className="flex justify-between text-[13px]" style={{ fontFamily: fontSans, color: H.gold }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <span>Оноогоор төлсөн</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(pointsUsed)}</span>
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3.5" style={{ background: "rgba(14,92,55,0.04)", borderTop: `1px solid ${H.border}` }}>
                  <span className="text-[14px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>НИЙТ</span>
                  <span className="text-[22px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* ── Reward Preview ── */}
            <div className="px-5 mt-4">
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})` }}>
                <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
                  <Gift size={20} color="white" strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white" style={{ fontFamily: fontDisplay }}>Таны авах урамшуулал</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[15px] font-bold text-white" style={{ fontFamily: fontDisplay, fontVariantNumeric: "tabular-nums" }}>+{earned} Upoint</span>
                    <span className="text-[13px] font-medium text-white/80" style={{ fontFamily: fontSans }}>+20 XP</span>
                  </div>
                </div>
                <Sparkles size={22} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              </div>
            </div>

            {/* ── Recommendations ── */}
            {items.length <= 3 && notInCart.length > 0 && (
              <div className="px-5 mt-5">
                <SH title="Санал болгох" />
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {notInCart.slice(0, 6).map((p) => (
                    <motion.button key={p.id} onClick={() => store.addToCart(p.id)}
                      className="flex-shrink-0 w-[130px] rounded-2xl overflow-hidden text-left"
                      style={{ background: H.card, border: `1px solid ${H.border}` }}
                      whileTap={{ scale: 0.96 }}
                      whileHover={canHover ? { y: -2 } : {}}
                      aria-label={`${p.name} нэмэх`}>
                       <div className="h-[100px] relative overflow-hidden"><CoverImg src={p.img} alt={p.name} /></div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ fontFamily: fontDisplay, color: H.text }}>{p.name}</p>
                        {(() => { const c = CATS.find(x => x.id === p.cat); if (!c) return null; const cc = CAT_COLORS[p.cat] || H.muted; return <div className="flex items-center gap-1 mt-1"><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 12, height: 12, borderRadius: 2, background: cc + "18" }}><c.Icon size={7} color={cc} strokeWidth={2.5} /></span><span className="text-[10px]" style={{ fontFamily: fontSans, color: cc }}>{c.label}</span></div>; })()}
                        <p className="text-[12px] font-bold mt-1" style={{ color: H.primary, fontFamily: fontSans, fontVariantNumeric: "tabular-nums" }}>{fmt(p.price)}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            {/* Bottom spacer for checkout bar */}
            <div className="h-4" />
          </div>

          {/* ── Checkout Bar ── */}
          <div className="flex-shrink-0 px-5 pt-3 pb-2" style={{
            background: H.card,
            borderTop: `1px solid ${H.border}`,
            paddingBottom: `calc(${SAFE_BOTTOM} + 4px)`,
            boxShadow: SHADOW_TOP,
          }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>НИЙТ ДҮН</span>
            <p className="text-[24px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</p>
          </div>
          <motion.button onClick={() => nav.push("checkout")}
            whileTap={{ scale: 0.97 }}
            className="rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
            style={{ height: 54, paddingLeft: 28, paddingRight: 28, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}>
                Захиалах <ArrowRight size={18} color="white" />
              </motion.button>
            </div>
          </div>
        </div>
      )}
      {/* Undo snackbar */}
      <AnimatePresence>
        {deletedItem && (
          <motion.div className="fixed left-0 right-0 z-50 flex items-center justify-between mx-5 px-4 py-3"
            style={{ bottom: `calc(100px + ${SAFE_BOTTOM})`, borderRadius: 16, background: H.text }}
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}>
            <span className="text-[13px] text-white" style={{ fontFamily: fontSans }}>Бүтээгдэхүүн устгагдсан</span>
            <motion.button className="text-[13px] font-bold flex-shrink-0 ml-3" style={{ color: H.gold, fontFamily: fontDisplay }} onClick={handleUndo} whileTap={{ scale: 0.92 }}>Буцаах</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}

// ── Checkout ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1" style={{ fontFamily: fontSans, color: H.muted }}>{title}</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: H.card, border: `1px solid ${H.border}` }}>{children}</div>
    </div>
  );
}
function CheckoutScreen({ onBack, user }: { onBack: () => void; user?: ApiUser | null }) {
  const store = useStore();
  const nav = useNav();
  const reduce = useReducedMotion();
  const balance = store.points;
  const subtotal = store.cartTotal;

  const [storeIdx, setStoreIdx] = useState(0);
  const [timeIdx, setTimeIdx]   = useState(0);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [couponId, setCouponId] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pay, setPay] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"idle" | "processing" | "error">("idle");
  const [err, setErr] = useState("");

  const eligible = walletCoupons(store.redeemed).filter((c) => couponStatus(c, store.usedCoupons) === "available");
  const coupon = eligible.find((c) => c.id === couponId) || null;
  const discount = coupon ? couponDiscount(coupon, subtotal) : 0;
  const afterCoupon = Math.max(0, subtotal - discount);
  const pointsUsed = usePoints ? Math.min(balance, afterCoupon) : 0;
  const total = Math.max(0, afterCoupon - pointsUsed);
  const earned = earnedFor(total);

  const submit = () => {
    if (!name.trim() || !phone.trim()) { setErr("Нэр, утасны дугаараа оруулна уу"); setPhase("error"); return; }
    if (!pay) { setErr("Төлбөрийн хэрэгсэл сонгоно уу"); setPhase("error"); return; }
    setPhase("processing");
    setTimeout(() => {                       // mock payment gateway
      const order = store.placeOrder({ subtotal, discount, pointsUsed, total, store: PICKUP_STORES[storeIdx], pickup: PICKUP_TIMES[timeIdx], payment: PAY_METHODS.find((m) => m.id === pay)!.label, coupon: couponId });
      nav.pop();                             // remove checkout
      nav.push("success", { order, earned });
    }, 1400);
  };

  return (
    <ScreenShell title="Төлбөр төлөх" subtitle="Checkout" onBack={onBack}>
      <Section title="Авах салбар">
        {PICKUP_STORES.map((st, i) => (
          <button key={st} onClick={() => setStoreIdx(i)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: i < PICKUP_STORES.length - 1 ? `1px solid ${H.border}` : "none" }}>
            <Store size={16} color={H.primary} strokeWidth={1.8} />
            <span className="flex-1 text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{st}</span>
            <div className="size-5 rounded-full flex items-center justify-center" style={{ border: `2px solid ${storeIdx === i ? H.primary : H.accent}` }}>{storeIdx === i && <div className="size-2.5 rounded-full" style={{ background: H.primary }} />}</div>
          </button>
        ))}
      </Section>

      <Section title="Авах цаг">
        <div className="flex gap-2 p-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {PICKUP_TIMES.map((t, i) => (
            <button key={t} onClick={() => setTimeIdx(i)} className="flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap" style={{ background: timeIdx === i ? H.primary : H.bg, color: timeIdx === i ? "white" : H.muted, fontFamily: fontSans }}>{t}</button>
          ))}
        </div>
      </Section>

      <Section title="Захиалагч">
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${H.border}` }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Нэр" className="w-full outline-none bg-transparent text-[15px]" style={{ fontFamily: fontSans, color: H.text }} />
        </div>
        <div className="px-4 py-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Утасны дугаар" type="tel" inputMode="numeric" className="w-full outline-none bg-transparent text-[15px]" style={{ fontFamily: fontSans, color: H.text }} />
        </div>
      </Section>

      <Section title="Купон">
        {eligible.length === 0 ? (
          <div className="px-4 py-3 text-[12px]" style={{ fontFamily: fontSans, color: H.muted }}>Ашиглах боломжтой купон алга</div>
        ) : eligible.map((c, i) => {
          const on = couponId === c.id;
          return (
            <button key={c.id} onClick={() => setCouponId(on ? null : c.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: i < eligible.length - 1 ? `1px solid ${H.border}` : "none" }}>
              <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color + "18" }}><Ticket size={15} color={c.color} /></div>
              <div className="flex-1 min-w-0"><p className="text-[13px] font-semibold" style={{ fontFamily: fontDisplay, color: H.text }}>{c.title}</p><p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>−{fmt(couponDiscount(c, subtotal))}</p></div>
              <div className="size-5 rounded-full flex items-center justify-center" style={{ border: `2px solid ${on ? H.primary : H.accent}` }}>{on && <CheckCircle size={16} color={H.primary} strokeWidth={2.4} />}</div>
            </button>
          );
        })}
      </Section>

      <Section title="Оноо">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(246,182,35,0.15)" }}><Star size={16} color={H.gold} fill={H.gold} /></div>
          <div className="flex-1"><p className="text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>Оноо ашиглах</p><p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>Үлдэгдэл: {balance.toLocaleString()} · 1 оноо = ₮1</p></div>
          <motion.button aria-label="Оноо ашиглах" onClick={() => setUsePoints((v) => !v)} disabled={balance === 0 || afterCoupon === 0} className="w-11 h-6 rounded-full flex items-center px-0.5" style={{ background: usePoints ? H.primary : H.accent, opacity: balance === 0 ? 0.5 : 1 }} whileTap={{ scale: 0.94 }}>
            <motion.div className="size-5 rounded-full bg-white" animate={{ x: usePoints ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </motion.button>
        </div>
      </Section>

      <Section title="Тэмдэглэл">
        <div className="px-4 py-3"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Жишээ: сүү багатай…" className="w-full outline-none bg-transparent text-[14px]" style={{ fontFamily: fontSans, color: H.text }} /></div>
      </Section>

      <Section title="Төлбөрийн хэрэгсэл">
        {PAY_METHODS.map((m, i) => {
          const on = pay === m.id;
          return (
            <button key={m.id} onClick={() => setPay(m.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: i < PAY_METHODS.length - 1 ? `1px solid ${H.border}` : "none" }}>
              <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.tint + "1A" }}><m.Icon size={16} color={m.tint} strokeWidth={1.9} /></div>
              <span className="flex-1 text-[13px] font-medium" style={{ fontFamily: fontSans, color: H.text }}>{m.label}</span>
              <div className="size-5 rounded-full flex items-center justify-center" style={{ border: `2px solid ${on ? H.primary : H.accent}` }}>{on && <div className="size-2.5 rounded-full" style={{ background: H.primary }} />}</div>
            </button>
          );
        })}
      </Section>

      {/* Order summary */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(14,92,55,0.04)", border: `1px solid ${H.border}` }}>
        <div className="flex justify-between text-[13px] mb-1.5" style={{ fontFamily: fontSans, color: H.muted }}><span>Дэд дүн</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(subtotal)}</span></div>
        {discount > 0 && <div className="flex justify-between text-[13px] mb-1.5" style={{ fontFamily: fontSans, color: H.pink }}><span>Купон хөнгөлөлт</span><span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(discount)}</span></div>}
        {pointsUsed > 0 && <div className="flex justify-between text-[13px] mb-1.5" style={{ fontFamily: fontSans, color: H.gold }}><span>Оноо ({pointsUsed.toLocaleString()})</span><span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(pointsUsed)}</span></div>}
        <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: `1px solid ${H.border}` }}>
          <span className="text-[15px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Нийт төлбөр</span>
          <span className="text-[24px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
        </div>
        <p className="text-[11px] mt-1.5 text-right" style={{ fontFamily: fontSans, color: H.muted }}>+{earned} Upoint цуглуулна</p>
      </div>

      <motion.button onClick={submit} disabled={phase === "processing"} whileTap={phase === "idle" ? { scale: 0.97 } : {}}
        className="w-full rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white mb-2" style={{ height: 54, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA, opacity: phase === "processing" ? 0.85 : 1 }}>
        {phase === "processing" ? <><motion.span className="size-4 rounded-full border-2 border-white border-t-transparent" animate={reduce ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} /> Төлж байна…</> : <>{fmt(total)} төлөх</>}
      </motion.button>

      {/* Error modal */}
      {createPortal(
        <AnimatePresence>
          {phase === "error" && (
            <motion.div className="fixed inset-0 z-[85] flex items-center justify-center px-8" style={{ background: "rgba(0,0,0,0.5)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPhase("idle")}>
              <motion.div className="w-full rounded-3xl p-6 text-center" style={{ background: H.card }} onClick={(e) => e.stopPropagation()} initial={{ scale: reduce ? 1 : 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                <div className="size-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(233,77,114,0.12)" }}><X size={28} color={H.pink} strokeWidth={2.4} /></div>
                <p className="text-[17px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Дутуу мэдээлэл</p>
                <p className="text-[13px] mt-1 mb-5" style={{ fontFamily: fontSans, color: H.muted }}>{err}</p>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setPhase("idle")} className="w-full py-3 rounded-2xl font-semibold text-[14px] text-white" style={{ background: H.primary, fontFamily: fontDisplay }}>Ойлголоо</motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>, document.body)}
    </ScreenShell>
  );
}

// ── Order Success ──
function SuccessScreen({ onBack, order, earned }: { onBack: () => void; order: PlacedOrder; earned: number }) {
  const nav = useNav();
  const reduce = useReducedMotion();
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: H.bg, paddingTop: SAFE_TOP, paddingBottom: `calc(${SAFE_BOTTOM} + 8px)` }}>
      <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center justify-center text-center" style={{ scrollbarWidth: "none" }}>
        <motion.div className="size-24 rounded-full flex items-center justify-center mb-4" style={{ background: `linear-gradient(145deg, #1A7A45, ${H.secondary})`, boxShadow: SHADOW_MODAL }}
          initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
          <CheckCircle size={52} color="white" strokeWidth={2} />
        </motion.div>
        <motion.h1 className="text-[26px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>Захиалга амжилттай!</motion.h1>
        <p className="text-[13px] mt-1 mb-1" style={{ fontFamily: fontSans, color: H.muted }}>Захиалгын дугаар</p>
        <p className="text-[20px] font-bold" style={{ fontFamily: fontDisplay, color: H.primary, letterSpacing: "1px" }}>{order.id}</p>

        <div className="w-full rounded-3xl p-5 mt-5" style={{ background: H.card, border: `1px solid ${H.border}` }}>
          <div className="flex justify-center mb-3"><div className="rounded-2xl p-3" style={{ background: "white", border: `1px solid ${H.border}` }}><QRCodeSVG value={`https://tlj.mn/pickup/${order.id}`} size={128} fgColor={H.secondary} bgColor="#ffffff" level="M" /></div></div>
          <p className="text-[11px]" style={{ fontFamily: fontSans, color: H.muted }}>Авахдаа энэ QR-г үзүүлнэ үү</p>
          <div className="mt-4 pt-4 space-y-2 text-left" style={{ borderTop: `1px solid ${H.border}` }}>
            <div className="flex items-center gap-2"><Store size={14} color={H.primary} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>{order.store}</span></div>
            <div className="flex items-center gap-2"><Clock size={14} color={H.primary} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>{order.pickup}</span></div>
            <div className="flex items-center gap-2"><Star size={14} color={H.gold} fill={H.gold} /><span className="text-[13px]" style={{ fontFamily: fontSans, color: H.text }}>+{earned} Upoint · +20 XP цугларлаа</span></div>
          </div>
        </div>
      </div>
      <div className="px-6 pt-3 flex flex-col gap-3">
        <motion.button onClick={() => { nav.pop(); nav.push("order", toOrderView(order)); }} whileTap={{ scale: 0.97 }}
          className="w-full rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white" style={{ height: 52, background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay, boxShadow: SHADOW_CTA }}>
          <Truck size={17} color="white" /> Захиалга хянах
        </motion.button>
        <div className="flex gap-3">
          <motion.button onClick={onBack} whileTap={{ scale: 0.96 }} className="flex-1 rounded-full font-semibold text-[14px]" style={{ height: 48, border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Нүүр</motion.button>
          <motion.button aria-label="Хуваалцах" whileTap={{ scale: 0.96 }} className="rounded-full flex items-center justify-center" style={{ width: 48, height: 48, border: `1.5px solid ${H.border}` }}><Share2 size={17} color={H.text} strokeWidth={2} /></motion.button>
        </div>
      </div>
    </div>
  );
}

function NavHost({ user }: { user?: ApiUser | null }) {
  const store = useStore();
  const { stack, pop, reset } = useNav();
  const top = stack[stack.length - 1];
  const render = (e: NavEntry) => {
    switch (e.name) {
      case "qr":              return <FullQRScreen onBack={pop} user={user} />;
      case "points":          return <PointsHistoryScreen onBack={pop} user={user} />;
      case "coupons":         return <CouponWalletScreen onBack={pop} />;
      case "couponDetail":    return <CouponDetailScreen onBack={pop} coupon={e.params} />;
      case "cart":            return <CartScreen onBack={pop} />;
      case "checkout":        return <CheckoutScreen onBack={pop} user={user} />;
      case "success":         return <SuccessScreen onBack={() => reset()} order={e.params.order} earned={e.params.earned} />;
      case "orders":          return <OrdersScreen onBack={pop} />;
      case "order":           return <OrderDetailScreen onBack={pop} order={typeof e.params === "string" ? toOrderView(store.orders.find((o) => o.id === e.params) ?? store.orders[0]) : e.params} />;
      case "membership":      return <MembershipScreen onBack={pop} user={user} />;
      case "rewardsProgress": return <RewardsProgressScreen onBack={pop} user={user} />;
      case "settings":        return <SettingsScreen onBack={pop} />;
      case "achievement":     return <AchievementScreen onBack={pop} achievement={e.params} />;
      case "search":          return <SearchScreen onBack={pop} />;
      case "branches":        return <BranchesScreen onBack={pop} />;
      default:                return null;
    }
  };
  return createPortal(
    <AnimatePresence>
      {top && (
        <motion.div key={stack.length} className="fixed inset-0 z-[55] flex flex-col" style={{ background: H.bg }}
          initial={{ x: "100%" }} animate={{ x: 0, transition: { duration: 0.34, ease: easeDrawer } }} exit={{ x: "100%", transition: { duration: 0.24, ease } }}>
          {render(top)}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function AppInner() {
  const store = useStore();
  const cartCount = store.cartCount;
  const [tab, setTab]             = useState<Tab>("home");
  const [dir, setDir]             = useState(0);
  const [missions,  setMissions]  = useState(MISSIONS);
  const [user, setUser]             = useState<ApiUser | null>(null);
  const [leaderboard, setLeaderboard] = useState<ApiUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [guest, setGuest]           = useState(() => { try { return localStorage.getItem("tlj_guest") === "1"; } catch { return false; } });

  useEffect(() => {
    const uid = localStorage.getItem("tlj_user_id");
    if (!uid) { setLoading(false); return; }
    import("../lib/api").then(({ getUser }) =>
      getUser(Number(uid)).then((u) => { if (u) setUser(u); setLoading(false); })
    );
  }, []);

  useEffect(() => {
    getLeaderboard().then(setLeaderboard);
    const sub = subscribeLeaderboard(setLeaderboard);
    return () => sub.unsubscribe();
  }, []);

  const handleUserCreated = async (name: string) => {
    try {
      const u = await createUser(name);
      localStorage.setItem("tlj_user_id", String(u.id));
      setUser(u);
      getLeaderboard().then(setLeaderboard);
    } catch {
      // Backend unavailable (or misconfigured) → never trap the user on the welcome screen;
      // continue locally as a guest so the app is always usable.
      try { localStorage.setItem("tlj_guest", "1"); } catch { /* private mode */ }
      setGuest(true);
    }
  };

  const handleGameOver = async (gameType: "block" | "merge" | "quiz" | "connect", score: number, xp: number, upoints: number) => {
    store.addReward({ xp, points: upoints });   // client wallet — always accrues + persists locally
    if (!user) return;                           // backend sync only when a Supabase user exists
    await saveGameScore(user.id, gameType, score);
    await addXp(user.id, xp, upoints);
    setUser((prev) => prev ? { ...prev, xp: prev.xp + xp, upoints: prev.upoints + upoints } : prev);
  };

  const handleNav = (newTab: Tab) => {
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setDir(newIdx >= oldIdx ? 1 : -1);
    setTab(newTab);
  };

  const addToCart = (pid: number, qty = 1) => store.addToCart(pid, qty);
  const completeM = (id: number) =>
    setMissions((prev) => prev.map((m) => m.id === id ? { ...m, done: true } : m));

  useEffect(() => {
    if (!user) return;
    updateLastActive(user.id);
    const id = setInterval(() => updateLastActive(user.id), 60000);
    return () => clearInterval(id);
  }, [user?.id]);

  return (
    /* position: relative — required so BottomNav can anchor absolutely inside */
    <div className="flex flex-col"
      style={{ width: "100%", height: "100dvh", background: H.bg, fontFamily: fontSans, overflow: "hidden", position: "relative" }}>

      {/* Nickname prompt for new users */}
      {!loading && !user && !guest && <NicknameModal onConfirm={handleUserCreated} onSkip={() => { try { localStorage.setItem("tlj_guest", "1"); } catch { /* private mode */ } setGuest(true); }} />}

      {/* ── Persistent Header + Status Bar (iOS Safe Area) ── */}
      <AppHeader tab={tab} cartCount={cartCount} onNav={handleNav} />

      {/* ── Screen content — bottom padding reserves space for floating nav ── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="sync">
          <motion.div key={tab}
            variants={slideVariants} initial="enter" animate="center" exit="exit"
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
            {tab === "home"    && <HomeScreen    onNav={handleNav} onAddToCart={addToCart} missions={missions} onComplete={completeM} user={user} />}
            {tab === "game"    && <GameScreen    user={user} leaderboard={leaderboard} onGameOver={handleGameOver} />}
            {tab === "shop"    && <ShopScreen    onAddToCart={addToCart} />}
            {tab === "rewards" && <RewardsScreen user={user} />}
            {tab === "profile" && <ProfileScreen user={user} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Liquid Glass Tab Bar — floats above content ── */}
      <BottomNav active={tab} onChange={handleNav} />

      {/* ── Pushed destination screens (QR, Points, Coupons, Orders, …) ── */}
      <NavHost user={user} />
    </div>
  );
}

// Global error boundary — a friendly branded fallback instead of a white screen.
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.error("App error:", err); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center text-center px-8"
        style={{ width: "100%", height: "100dvh", background: H.bg, fontFamily: fontSans }}>
        <div className="size-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, boxShadow: "0 8px 24px rgba(14,92,55,0.30)" }}>
          <Coffee size={30} color="white" strokeWidth={1.6} />
        </div>
        <p className="text-[19px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>Өө, алдаа гарлаа</p>
        <p className="text-[13px] mt-1 mb-6" style={{ color: H.muted }}>Түр зуурын саатал. Дахин оролдоно уу.</p>
        <div className="flex gap-3">
          <button onClick={() => this.setState({ hasError: false })}
            className="px-5 py-3 rounded-full font-semibold text-[14px]" style={{ border: `1.5px solid ${H.border}`, color: H.text, fontFamily: fontDisplay }}>Дахин оролдох</button>
          <button onClick={() => { try { window.location.reload(); } catch {} }}
            className="px-5 py-3 rounded-full font-semibold text-[14px] text-white" style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`, fontFamily: fontDisplay }}>Нүүр рүү</button>
        </div>
      </div>
    );
  }
}

// Root: error boundary → persistent store → navigation stack.
export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <NavProvider>
          <AppInner />
        </NavProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
