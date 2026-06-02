import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Store, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "sent">("login");
  const { session, loading } = useAuth();

  if (!loading && session) {
    setLocation("/dashboard");
    return null;
  }

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  }

  async function onForgot(values: z.infer<typeof forgotSchema>) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setView("sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary mb-8 hover:opacity-80 transition-opacity">
        <Store className="w-8 h-8" />
        Shopgram
      </Link>

      <AnimatePresence mode="wait">

        {/* ── Login ── */}
        {view === "login" && (
          <motion.div key="login" className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}>
            <Card className="shadow-lg border-border">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Seller Login</CardTitle>
                <CardDescription>Enter your email and password to access your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="shop@example.com" type="email" {...field} data-testid="input-login-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            onClick={() => {
                              forgotForm.setValue("email", form.getValues("email"));
                              setView("forgot");
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} data-testid="input-login-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full rounded-full mt-6" disabled={isLoading} data-testid="btn-login-submit">
                      {isLoading ? "Logging in..." : "Log in"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center text-sm text-muted-foreground border-t pt-6">
                  Don't have a store yet?{" "}
                  <Link href="/join" className="text-primary font-semibold hover:underline">
                    Create one for free
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Forgot Password ── */}
        {view === "forgot" && (
          <motion.div key="forgot" className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}>
            <Card className="shadow-lg border-border">
              <CardHeader className="space-y-1">
                <button
                  onClick={() => setView("login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>
                <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotForm}>
                  <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                    <FormField control={forgotForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input placeholder="shop@example.com" type="email" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full rounded-full mt-2" disabled={isLoading}>
                      {isLoading
                        ? "Sending..."
                        : <><Mail className="w-4 h-4 mr-2" />Send Reset Link</>}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Email Sent ── */}
        {view === "sent" && (
          <motion.div key="sent" className="w-full max-w-md"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <Card className="shadow-lg border-border text-center">
              <CardContent className="pt-10 pb-8 px-8 space-y-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                >
                  <Mail className="w-8 h-8 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Check your email</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We've sent a password reset link to{" "}
                    <span className="font-semibold text-foreground">{forgotForm.getValues("email")}</span>.
                    Click the link in the email to set a new password.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Didn't receive it? Check your spam folder.</p>
                <Button variant="outline" className="rounded-full w-full mt-2" onClick={() => setView("login")}>
                  Back to Login
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
