import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Store, QrCode, ArrowRight, CheckCircle2, Star, Users, ShieldCheck,
  Zap, Instagram, Package, TrendingUp, MessageCircle, BadgeCheck,
  ChevronRight, Sparkles, Globe, IndianRupee,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useAuth } from "@/lib/auth-context";

/* ─── tiny helpers ─── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

const MARQUEE_ITEMS = [
  "₹0 platform fees", "UPI payments built-in", "Verified reviews",
  "WhatsApp orders", "Custom store link", "Mobile-first design",
  "Instant setup", "Free forever plan", "Manage from anywhere",
  "Instagram sellers ❤️",
];

const FEATURES = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Your own store URL",
    desc: "Get yourname.shopgram.in — share it in your Instagram bio and start selling instantly.",
    color: "from-purple-500/20 to-violet-500/20",
    accent: "text-purple-400",
  },
  {
    icon: <QrCode className="w-6 h-6" />,
    title: "UPI QR built-in",
    desc: "Accept payments directly to your bank. ₹0 platform fee. Works with every UPI app.",
    color: "from-emerald-500/20 to-teal-500/20",
    accent: "text-emerald-400",
  },
  {
    icon: <BadgeCheck className="w-6 h-6" />,
    title: "Verified buyer reviews",
    desc: "Only buyers who actually purchased can review. Build real trust, not fake stars.",
    color: "from-amber-500/20 to-orange-500/20",
    accent: "text-amber-400",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "WhatsApp order alerts",
    desc: "Every new order pings you on WhatsApp so you never miss a sale, ever.",
    color: "from-green-500/20 to-lime-500/20",
    accent: "text-green-400",
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: "Full product catalog",
    desc: "Add photos, sizes, descriptions, stock status — everything a real store needs.",
    color: "from-blue-500/20 to-cyan-500/20",
    accent: "text-blue-400",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Order dashboard",
    desc: "Track every order from placed to delivered. See revenue, manage fulfillment.",
    color: "from-pink-500/20 to-rose-500/20",
    accent: "text-pink-400",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Fill the 2-minute form",
    desc: "Add your shop name, upload products with photos and prices, paste your UPI ID.",
    detail: "No technical knowledge needed. Just your phone.",
  },
  {
    num: "02",
    title: "Get your live store link",
    desc: "Receive yourname.shopgram.in instantly. Your store goes live the moment it's approved.",
    detail: "Usually approved in under an hour.",
  },
  {
    num: "03",
    title: "Put the link in your bio",
    desc: "Share on Instagram, WhatsApp, anywhere. Customers browse, pay via UPI, orders arrive.",
    detail: "You manage everything from a simple dashboard.",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya Mehta",
    handle: "@priyasfashion",
    city: "Jaipur",
    text: "I used to take orders over DMs and lose track of everything. Now I send one link and orders come in organized. Made ₹40,000 in my first month!",
    rating: 5,
    category: "Fashion & Clothing",
  },
  {
    name: "Aisha Khan",
    handle: "@aishajewels",
    city: "Surat",
    text: "The UPI QR feature is a game changer. Customers pay immediately, I ship same day. My repeat orders went up 3x since I switched to Shopgram.",
    rating: 5,
    category: "Jewellery",
  },
  {
    name: "Neha Sharma",
    handle: "@nehaskitchen",
    city: "Pune",
    text: "Setting up took literally 10 minutes. I shared the link in my story and got 12 orders that same evening. Shopgram is everything I needed.",
    rating: 5,
    category: "Food & Snacks",
  },
];

const STATS = [
  { value: "5 min", label: "Average store setup" },
  { value: "WhatsApp", label: "Order alerts built-in" },
  { value: "4.9★", label: "Avg seller rating" },
  { value: "0%", label: "Platform fees" },
];

export default function HomePage() {
  const { session, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (!loading && session) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0a0a0a] text-white selection:bg-purple-500/30 overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="text-white">Shopgram</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
        </nav>
        <div className="flex gap-3 items-center">
          <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Login</Link>
          <Link href="/join">
            <Button className="rounded-full bg-white text-black hover:bg-white/90 font-semibold text-sm px-5 h-9">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
          {/* Animated bg blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-700/10 rounded-full blur-[140px]" />
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="relative z-10 flex flex-col items-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/[0.12] rounded-full px-4 py-1.5 text-sm text-white/80 mb-8 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Built for Instagram sellers in India
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight leading-[1.0] mb-6">
              <span className="text-white">Your Instagram</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                deserves a real store
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-white/50 mb-10 max-w-2xl leading-relaxed">
              Stop taking orders over DMs. Get a beautiful store at{" "}
              <span className="text-white/80 font-medium">yourname.shopgram.in</span>{" "}
              with UPI payments, product catalog, and verified reviews. Free to start.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link href="/join">
                <Button size="lg" className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold text-base px-8 h-13 shadow-2xl shadow-purple-500/30 group border-0">
                  Create your free store
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#how" className="text-white/50 hover:text-white transition-colors text-sm flex items-center gap-1.5">
                See how it works <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            <p className="mt-5 text-xs text-white/30 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              No credit card required · Free plan forever · Setup in 5 minutes
            </p>
          </motion.div>

          {/* Floating store card mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative z-10 mt-16 w-full max-w-sm mx-auto"
          >
            <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                {/* Mock store header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-20 flex items-end px-4 pb-2">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-purple-600 font-bold text-xl shadow-lg -mb-6 border-2 border-white">P</div>
                </div>
                <div className="pt-8 px-4 pb-4">
                  <p className="font-bold text-white text-sm">Priya's Fashion Studio</p>
                  <p className="text-white/40 text-xs mb-3">Fashion & Clothing · Jaipur</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["👗", "👜", "💍"].map((emoji, i) => (
                      <div key={i} className="bg-white/[0.06] rounded-xl p-2 aspect-square flex flex-col items-center justify-center gap-1">
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[9px] text-white/40">₹{[899, 1299, 599][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-purple-500 rounded-full py-2 text-center text-xs font-semibold text-white">
                    Shop Now → UPI Ready
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                <span className="text-white/40 text-xs ml-1">4.9 · 134 reviews</span>
              </div>
            </div>
            {/* Glow under card */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-10 bg-purple-500/20 blur-2xl rounded-full" />
          </motion.div>
        </section>

        {/* ── MARQUEE STATS BAND ── */}
        <div className="py-4 bg-white/[0.04] border-y border-white/[0.06] overflow-hidden">
          <div className="flex gap-12 animate-marquee whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} className="text-sm text-white/50 font-medium flex items-center gap-3 shrink-0">
                <span className="w-1 h-1 rounded-full bg-purple-400 inline-block" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── STATS ── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-extrabold text-white mb-1">{s.value}</p>
                  <p className="text-sm text-white/40">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="py-24 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-purple-400 text-sm font-semibold tracking-widest uppercase mb-3">Everything you need</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                  A real store,<br className="hidden md:block" /> not a DM inbox
                </h2>
                <p className="text-white/40 text-lg max-w-xl mx-auto">
                  Everything a modern Indian seller needs — without the complexity or monthly fees.
                </p>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <FadeIn key={i} delay={i * 0.07}>
                  <div className="group relative bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 cursor-default overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10">
                      <div className={`w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 ${f.accent}`}>
                        {f.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-20">
                <p className="text-pink-400 text-sm font-semibold tracking-widest uppercase mb-3">Simple as it gets</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white">Live in 3 steps</h2>
              </div>
            </FadeIn>
            <div className="space-y-6">
              {STEPS.map((s, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="group flex gap-6 md:gap-10 items-start bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] rounded-2xl p-6 md:p-8 transition-all">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-mono font-bold text-lg">{s.num}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                      <p className="text-white/50 leading-relaxed mb-2">{s.desc}</p>
                      <p className="text-xs text-white/30 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-yellow-400" /> {s.detail}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── INSTAGRAM-FIRST BANNER ── */}
        <section className="py-20 px-6 bg-gradient-to-br from-purple-900/40 via-[#0a0a0a] to-pink-900/30 border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto md:flex items-center gap-12">
            <FadeIn className="flex-1 mb-10 md:mb-0">
              <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1 text-xs text-pink-300 mb-5">
                <Instagram className="w-3 h-3" /> Made for Instagram sellers
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                You build the audience.<br />We build the store.
              </h2>
              <p className="text-white/50 text-lg mb-8 leading-relaxed max-w-lg">
                Put your Shopgram link in your Instagram bio. Your followers click, browse your catalog, pay via UPI, and order — all without leaving their phone.
              </p>
              <Link href="/join">
                <Button className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 font-semibold text-white px-8 h-12 border-0 shadow-xl shadow-purple-500/20">
                  Start for free — it's ₹0
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </FadeIn>
            <FadeIn delay={0.2} className="flex-shrink-0">
              {/* Fake Instagram bio mockup */}
              <div className="w-64 bg-[#1a1a1a] rounded-3xl p-5 border border-white/10 shadow-2xl mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">P</div>
                  <div>
                    <p className="text-white text-sm font-semibold">priyasfashion</p>
                    <p className="text-white/40 text-xs">Fashion & Lifestyle · Jaipur</p>
                  </div>
                </div>
                <p className="text-white/60 text-xs leading-relaxed mb-3">
                  ✨ New drops every Friday<br />
                  👗 Ethnic + Western wear<br />
                  📦 Pan-India shipping
                </p>
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl px-3 py-2 text-center">
                  <p className="text-white text-xs font-semibold">🛍️ priyasfashion.shopgram.in</p>
                </div>
                <p className="text-white/30 text-[10px] text-center mt-2">← Bio link → opens full store</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="reviews" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">Real sellers, real results</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Sellers love Shopgram
                </h2>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/[0.06] transition-all">
                    <div className="flex gap-0.5">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed flex-1">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{t.name}</p>
                        <p className="text-white/40 text-xs">{t.handle} · {t.city}</p>
                      </div>
                      <span className="ml-auto text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">{t.category}</span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="py-24 px-6 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-purple-400 text-sm font-semibold tracking-widest uppercase mb-3">Honest pricing</p>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Start free, grow with us</h2>
                <p className="text-white/40 text-lg">No hidden fees. No commission on your sales.</p>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free plan */}
              <FadeIn>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-2">Free Trial</p>
                  <p className="text-4xl font-bold text-white mb-1">₹0</p>
                  <p className="text-white/40 text-sm mb-6">14 days, no credit card</p>
                  <ul className="space-y-3 mb-8">
                    {["Your own store URL", "Up to 20 products", "UPI QR code", "WhatsApp order alerts", "Verified reviews", "Order dashboard"].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-white/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/join">
                    <Button variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/10">
                      Start free trial
                    </Button>
                  </Link>
                </div>
              </FadeIn>
              {/* Pro plan */}
              <FadeIn delay={0.1}>
                <div className="relative bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-purple-500/30 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                  <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest">Pro</p>
                      <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">MOST POPULAR</span>
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">₹99 <span className="text-xl text-white/40 font-normal">/mo</span></p>
                    <p className="text-white/40 text-sm mb-6">Billed monthly · Cancel anytime</p>
                    <ul className="space-y-3 mb-8">
                      {["Everything in Free", "Unlimited products", "Custom domain support", "Priority support", "Advanced analytics", "Early access to new features"].map((f, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/join">
                      <Button className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold border-0">
                        Get started with Pro
                      </Button>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-28 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-purple-700/15 rounded-full blur-[140px]" />
          </div>
          <FadeIn className="relative z-10 max-w-3xl mx-auto">
            <p className="text-white/40 text-sm uppercase tracking-widest font-semibold mb-4">Ready to start?</p>
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Your store is{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                5 minutes away
              </span>
            </h2>
            <p className="text-white/40 text-xl mb-10">
              Join thousands of Instagram sellers who turned their passion into a real business with Shopgram.
            </p>
            <Link href="/join">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold text-lg px-10 h-14 border-0 shadow-2xl shadow-purple-500/30 group">
                Create your free store
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="mt-4 text-xs text-white/20 flex items-center justify-center gap-2">
              <IndianRupee className="w-3 h-3" /> No credit card needed · ₹0 to start · Cancel anytime
            </p>
          </FadeIn>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            Shopgram
          </div>
          <p className="text-white/30 text-sm text-center">
            Built with ❤️ for India's Instagram sellers. © 2025 Shopgram.
          </p>
          <div className="flex gap-6 text-sm text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <Link href="/login" className="hover:text-white/60 transition-colors">Seller Login</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
