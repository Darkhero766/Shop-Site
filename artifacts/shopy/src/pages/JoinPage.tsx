import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Store, ChevronLeft, Check, X, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase, slugify, checkSubdomainAvailability, uploadImage } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

const step1Schema = z.object({
  shop_name: z.string().min(2, "Shop name is required"),
  subdomain: z.string().min(2, "Subdomain is required"),
  insta_handle: z.string().startsWith("@", "Must start with @"),
  whatsapp: z.string().regex(/^\+?91?[6789]\d{9}$/, "Valid Indian phone number required"),
  category: z.string().min(1, "Select a category"),
  bio: z.string().max(150, "Max 150 characters").optional(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const step2Schema = z.object({
  upi_id: z.string().optional(),
  delivery_info: z.string().optional(),
  products: z.array(z.object({
    name: z.string().min(1, "Product name required"),
    price: z.coerce.number().min(1, "Price must be > 0"),
    description: z.string().optional(),
    sizes: z.string().optional(),
  })).min(1, "Add at least one product"),
});

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR state
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  // Product images: array of (up to 4) files per product
  const [productImageFiles, setProductImageFiles] = useState<(File | null)[][]>([[null, null, null, null]]);
  const [productImagePreviews, setProductImagePreviews] = useState<(string | null)[][]>([[null, null, null, null]]);

  // Step 1 Form
  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      shop_name: "", subdomain: "", insta_handle: "@", whatsapp: "", category: "", bio: "", email: "", password: ""
    },
  });

  const shopName = form1.watch("shop_name");
  const subdomain = form1.watch("subdomain");
  const debouncedSubdomain = useDebounce(subdomain, 500);

  useEffect(() => {
    if (shopName && !form1.formState.dirtyFields.subdomain) {
      form1.setValue("subdomain", slugify(shopName), { shouldValidate: true });
    }
  }, [shopName, form1]);

  useEffect(() => {
    async function check() {
      if (debouncedSubdomain.length > 2) {
        const available = await checkSubdomainAvailability(debouncedSubdomain);
        setSubdomainAvailable(available);
      } else {
        setSubdomainAvailable(null);
      }
    }
    check();
  }, [debouncedSubdomain]);

  const onStep1Submit = (data: z.infer<typeof step1Schema>) => {
    if (subdomainAvailable === false) {
      toast.error("Subdomain is taken. Please choose another.");
      return;
    }
    setStep(2);
  };

  // Step 2 Form
  const form2 = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      upi_id: "", delivery_info: "",
      products: [{ name: "", price: 0, description: "", sizes: "" }],
    },
  });

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form2.control,
    name: "products",
  });

  const handleQrUpload = (file: File) => {
    setQrFile(file);
    setQrPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleProductImageUpload = (productIdx: number, slotIdx: number, file: File | null) => {
    setProductImageFiles(prev => {
      const next = prev.map(arr => [...arr]);
      next[productIdx][slotIdx] = file;
      return next;
    });
    setProductImagePreviews(prev => {
      const next = prev.map(arr => [...arr]);
      next[productIdx][slotIdx] = file ? URL.createObjectURL(file) : null;
      return next;
    });
  };

  const handleAppendProduct = () => {
    appendProduct({ name: "", price: 0, description: "", sizes: "" });
    setProductImageFiles(prev => [...prev, [null, null, null, null]]);
    setProductImagePreviews(prev => [...prev, [null, null, null, null]]);
  };

  const handleRemoveProduct = (idx: number) => {
    removeProduct(idx);
    setProductImageFiles(prev => prev.filter((_, i) => i !== idx));
    setProductImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const onStep2Submit = () => {
    setStep(3);
  };

  const launchStore = async () => {
    setIsSubmitting(true);
    try {
      const s1 = form1.getValues();
      const s2 = form2.getValues();

      // 1. Auth — sign up, then ensure we have an active session for storage uploads
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: s1.email, password: s1.password });
      if (authErr) throw authErr;
      if (!authData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: s1.email, password: s1.password });
        if (signInErr) throw new Error("Account created but couldn't sign in automatically. Please verify your email then log in.");
      }

      // 2. Upload QR
      let qrUrl: string | null = null;
      if (qrFile) {
        const path = `${s1.subdomain}/${Date.now()}_qr`;
        const { url: uploadedQr, error: qrErr } = await uploadImage("Upi-qr", qrFile, path);
        if (qrErr) toast.error(`QR upload failed: ${qrErr}. You can re-upload from Settings.`);
        qrUrl = uploadedQr;
      }

      // 3. Create Shop
      const { data: shopData, error: shopErr } = await supabase.from("shops").insert({
        shop_name: s1.shop_name,
        subdomain: s1.subdomain,
        insta_handle: s1.insta_handle,
        whatsapp: s1.whatsapp,
        category: s1.category,
        bio: s1.bio,
        email: s1.email,
        upi_id: s2.upi_id,
        upi_qr_url: qrUrl,
        delivery_info: s2.delivery_info,
        status: "pending",
        plan: "trial",
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();
      if (shopErr) throw shopErr;

      // 4. Upload product images + insert products
      const productsToInsert = await Promise.all(
        s2.products.map(async (p, idx) => {
          const imageUrls: string[] = [];
          const files = productImageFiles[idx] ?? [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file) {
              const path = `${s1.subdomain}/${Date.now()}_${idx}_${i}`;
              const { url, error: imgErr } = await uploadImage("Product-images", file, path);
              if (imgErr) toast.error(`Image upload failed: ${imgErr}`);
              if (url) imageUrls.push(url);
            }
          }
          return {
            shop_id: shopData.id,
            name: p.name,
            price: p.price,
            description: p.description || null,
            sizes: p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
            images: imageUrls,
            in_stock: true,
          };
        })
      );

      const { error: prodErr } = await supabase.from("products").insert(productsToInsert);
      if (prodErr) throw prodErr;

      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-muted/30 pb-20">
      <header className="border-b bg-background sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80">
          <Store className="w-6 h-6" /> Shopgram
        </Link>
        <div className="text-sm font-medium text-muted-foreground">Step {step > 3 ? 3 : step} of 3</div>
      </header>

      <main className="max-w-3xl mx-auto pt-10 px-4">
        {step <= 3 && (
          <div className="flex gap-2 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-primary/20"}`} />
            ))}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Let's set up your store</h1>
              <p className="text-muted-foreground">The basics of your new online home.</p>
            </div>

            <Form {...form1}>
              <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form1.control} name="shop_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl><Input placeholder="My Awesome Store" {...field} data-testid="input-shop-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form1.control} name="subdomain" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store URL</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Input className="pr-24" {...field} data-testid="input-subdomain" />
                          <span className="absolute right-3 text-sm text-muted-foreground">.shopgram.in</span>
                        </div>
                      </FormControl>
                      {subdomainAvailable === true && <p className="text-xs text-emerald-500 flex items-center mt-1"><Check className="w-3 h-3 mr-1"/> Available</p>}
                      {subdomainAvailable === false && <p className="text-xs text-destructive flex items-center mt-1"><X className="w-3 h-3 mr-1"/> Not available</p>}
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form1.control} name="insta_handle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl><Input placeholder="@my_store" {...field} data-testid="input-insta" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form1.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl><Input placeholder="9876543210" {...field} data-testid="input-whatsapp" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>

                <FormField control={form1.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-category"><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Clothes">Clothes</SelectItem>
                        <SelectItem value="Jewellery">Jewellery</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Handmade">Handmade</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form1.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (max 150 chars)</FormLabel>
                    <FormControl><Textarea className="resize-none" maxLength={150} {...field} data-testid="input-bio" /></FormControl>
                    <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/150</p>
                    <FormMessage />
                  </FormItem>
                )}/>

                <div className="border-t pt-6 grid md:grid-cols-2 gap-6">
                  <FormField control={form1.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (for login)</FormLabel>
                      <FormControl><Input type="email" placeholder="store@example.com" {...field} data-testid="input-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form1.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} data-testid="input-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="rounded-full px-8" data-testid="btn-next-1">
                    Next Step <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full shrink-0">
                <ChevronLeft className="w-5 h-5"/>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Products & Payment</h1>
                <p className="text-muted-foreground">How people pay and what you sell.</p>
              </div>
            </div>

            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-8">

                {/* Payment */}
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl font-semibold">Payment Details</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">UPI QR Code</label>
                        <ImageUpload onUpload={handleQrUpload} previewUrl={qrPreview} label="Upload QR Image" dataTestId="upload-qr" />
                      </div>
                      <div className="space-y-4">
                        <FormField control={form2.control} name="upi_id" render={({ field }) => (
                          <FormItem>
                            <FormLabel>UPI ID (Optional)</FormLabel>
                            <FormControl><Input placeholder="store@okaxis" {...field} data-testid="input-upi-id" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <FormField control={form2.control} name="delivery_info" render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Delivery Info</FormLabel>
                            <FormControl><Textarea placeholder="Ships in 3-5 days. No returns." className="resize-none" {...field} data-testid="input-delivery" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Products */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Add Your Products</h2>
                  {productFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-6 space-y-5">
                        <div className="flex justify-between items-center border-b pb-3">
                          <h3 className="font-semibold text-base">Product {index + 1}</h3>
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveProduct(index)} data-testid={`btn-remove-product-${index}`}>
                              <Trash2 className="w-4 h-4 mr-1" /> Remove
                            </Button>
                          )}
                        </div>

                        {/* Product images — up to 4 slots */}
                        <div>
                          <label className="block text-sm font-medium mb-3">Product Images (up to 4)</label>
                          <div className="grid grid-cols-4 gap-3">
                            {[0, 1, 2, 3].map((slotIdx) => (
                              <div key={slotIdx} className="aspect-square">
                                {productImagePreviews[index]?.[slotIdx] ? (
                                  <div className="relative rounded-xl overflow-hidden border border-border w-full h-full">
                                    <img src={productImagePreviews[index][slotIdx]!} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                      onClick={() => handleProductImageUpload(index, slotIdx, null)}
                                      data-testid={`btn-remove-img-${index}-${slotIdx}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    className="w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors"
                                    data-testid={`upload-product-img-${index}-${slotIdx}`}
                                  >
                                    <Plus className="w-5 h-5 mb-1" />
                                    <span className="text-xs">{slotIdx === 0 ? "Main" : `Photo ${slotIdx + 1}`}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleProductImageUpload(index, slotIdx, file);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">First image is the cover. All images are square-cropped.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField control={form2.control} name={`products.${index}.name`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name</FormLabel>
                              <FormControl><Input placeholder="Handwoven Top" {...field} data-testid={`input-pname-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form2.control} name={`products.${index}.price`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (₹)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                  <Input type="number" className="pl-7" placeholder="999" {...field} data-testid={`input-pprice-${index}`} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField control={form2.control} name={`products.${index}.sizes`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sizes (comma separated, optional)</FormLabel>
                              <FormControl><Input placeholder="S, M, L, XL" {...field} data-testid={`input-psizes-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form2.control} name={`products.${index}.description`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (optional)</FormLabel>
                              <FormControl><Input placeholder="Soft cotton material..." {...field} data-testid={`input-pdesc-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button type="button" variant="outline" className="w-full border-dashed py-8 rounded-2xl" onClick={handleAppendProduct} data-testid="btn-add-product">
                    <Plus className="w-4 h-4 mr-2" /> Add Another Product
                  </Button>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="rounded-full px-8" data-testid="btn-next-2">
                    Review Store <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full shrink-0">
                <ChevronLeft className="w-5 h-5"/>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Review & Launch</h1>
                <p className="text-muted-foreground">Almost there. Looks good?</p>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-4">Shop Summary</h2>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Shop Name</span><span className="font-semibold text-base">{form1.watch("shop_name")}</span></div>
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">URL</span><span className="font-semibold text-primary">{form1.watch("subdomain")}.shopgram.in</span></div>
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Category</span><span className="font-semibold">{form1.watch("category")}</span></div>
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Contact</span><span className="font-semibold">{form1.watch("whatsapp")}</span></div>
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Instagram</span><span className="font-semibold">{form1.watch("insta_handle")}</span></div>
                  <div><span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Products</span><span className="font-semibold">{form2.watch("products").length} item{form2.watch("products").length !== 1 ? "s" : ""}</span></div>
                </div>
                {form1.watch("bio") && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Bio</span>
                    <p className="text-sm">{form1.watch("bio")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product image previews */}
            {form2.watch("products").length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Your Products</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {form2.watch("products").map((p, idx) => (
                    <div key={idx} className="border rounded-xl overflow-hidden bg-card">
                      <div className="aspect-square bg-muted relative">
                        {productImagePreviews[idx]?.[0]
                          ? <img src={productImagePreviews[idx][0]!} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                        }
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm truncate">{p.name || "Unnamed product"}</p>
                        <p className="text-primary font-bold text-sm">₹{p.price || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Your store will be reviewed before going live. We'll WhatsApp you once it's active.
            </div>

            <Button size="lg" className="w-full rounded-full py-8 text-xl font-bold" onClick={launchStore} disabled={isSubmitting} data-testid="btn-launch">
              {isSubmitting ? "Launching your store..." : "Launch My Store"}
            </Button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 4 && (
          <div className="py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold">Store submitted!</h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We'll verify your details and activate your store shortly. We'll WhatsApp you when it's live!
            </p>
            <div className="bg-muted rounded-2xl p-4 inline-block">
              <p className="text-sm text-muted-foreground mb-1">Your future store URL</p>
              <p className="font-bold text-primary text-lg">{form1.watch("subdomain")}.shopgram.in</p>
            </div>
            <div className="pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full px-10" data-testid="btn-go-dashboard">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
