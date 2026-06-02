import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Store, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  // Supabase puts the recovery token in the URL hash — the client picks it up automatically
  // via onAuthStateChange with event = PASSWORD_RECOVERY
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event — fires when Supabase processes the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if there's already an active session from the hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If no recovery event fires within 3 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setReady(prev => {
        if (!prev) setInvalid(true);
        return prev;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error(error.message || "Failed to update password");
      return;
    }
    setDone(true);
    setTimeout(() => setLocation("/login"), 3000);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary mb-8 hover:opacity-80 transition-opacity">
        <Store className="w-8 h-8" />
        Shopgram
      </Link>

      {/* ── Success ── */}
      {done && (
        <motion.div className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="shadow-lg text-center">
            <CardContent className="pt-10 pb-8 px-8 space-y-4">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold mb-1">Password updated!</h2>
                <p className="text-muted-foreground text-sm">Redirecting you to login...</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Invalid / expired link ── */}
      {!done && invalid && (
        <motion.div className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-lg text-center">
            <CardContent className="pt-10 pb-8 px-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Link expired or invalid</h2>
                <p className="text-muted-foreground text-sm">
                  This reset link has expired or already been used. Request a new one.
                </p>
              </div>
              <Button className="w-full rounded-full" onClick={() => setLocation("/login")}>
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Loading (waiting for Supabase to process the hash) ── */}
      {!done && !invalid && !ready && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Verifying your reset link...</p>
        </div>
      )}

      {/* ── Reset form ── */}
      {!done && !invalid && ready && (
        <motion.div className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-lg border-border">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription>Choose a strong password for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors({}); }}
                      placeholder="Min. 8 characters"
                      className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setErrors({}); }}
                      placeholder="Repeat your password"
                      className={`pr-10 ${errors.confirm ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
                </div>

                <Button type="submit" className="w-full rounded-full mt-2" disabled={isLoading}>
                  {isLoading
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating...</span>
                    : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
