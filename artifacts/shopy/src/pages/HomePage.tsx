import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Store, ShieldCheck, QrCode, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="py-6 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Store className="w-6 h-6" />
          Shopgram
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors data-testid='link-login'">
            Login
          </Link>
          <Link href="/join">
            <Button className="rounded-full rounded-r-full font-medium" data-testid="btn-hero-join">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-6 text-center max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Turn your Instagram shop into a <span className="text-primary">real store</span> in 5 minutes
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            One link. Your products. UPI payment. Real verified reviews.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/join">
              <Button size="lg" className="rounded-full text-lg px-8 h-14 group">
                Create your free store 
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-24 bg-muted/30 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Store className="w-8 h-8 text-primary" />}
              title="Clean store page"
              desc="A beautiful, mobile-optimized catalog that makes your products shine."
            />
            <FeatureCard 
              icon={<QrCode className="w-8 h-8 text-primary" />}
              title="UPI QR built-in"
              desc="Accept payments directly to your bank account with zero platform fees."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8 text-primary" />}
              title="Verified buyer reviews"
              desc="Build trust with real reviews from customers who actually bought your items."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How it works</h2>
          <div className="space-y-12">
            <Step number="1" title="Fill the quick form" desc="Add your details, upload your products, and set your UPI QR code." />
            <Step number="2" title="Get your custom link" desc="Receive your personalized shopgram.in subdomain immediately." />
            <Step number="3" title="Share on Instagram" desc="Put the link in your bio and start receiving organized orders on WhatsApp." />
          </div>
        </section>
      </main>

      <footer className="py-12 text-center border-t border-border mt-auto">
        <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
          <Store className="w-4 h-4" /> Powered by Shopgram
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-xl text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}