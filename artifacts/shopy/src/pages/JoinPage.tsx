import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Store, ChevronLeft, Check, X, Upload } from "lucide-react";
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
  upi_qr: z.any().optional(), // File handling separately
  upi_id: z.string().optional(),
  delivery_info: z.string().optional(),
  products: z.array(z.object({
    name: z.string().min(1, "Product name required"),
    price: z.coerce.number().min(1, "Price must be > 0"),
    description: z.string().optional(),
    sizes: z.string().optional(),
    image: z.any().optional(), // Simplified for signup - single image
  })).min(1, "Add at least one product"),
});

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

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
      products: [{ name: "", price: 0, description: "", sizes: "", image: null }],
    },
  });

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form2.control,
    name: "products",
  });

  const handleQrUpload = (file: File) => {
    setQrFile(file);
    if (file) setQrPreview(URL.createObjectURL(file));
    else setQrPreview(null);
  };

  const onStep2Submit = (data: z.infer<typeof step2Schema>) => {
    setStep(3);
  };

  const launchStore = async () => {
    setIsSubmitting(true);
    try {
      const s1 = form1.getValues();
      const s2 = form2.getValues();

      // 1. Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: s1.email,
        password: s1.password,
      });
      if (authErr) throw authErr;

      // 2. Upload QR
      let qrUrl = null;
      if (qrFile) {
        const path = `${s1.subdomain}/${Date.now()}_qr`;
        qrUrl = await uploadImage("upi-qr", qrFile, path);
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
        plan: "free"
      }).select().single();
      if (shopErr) throw shopErr;

      // 4. Products
      const productsToInsert = s2.products.map(p => ({
        shop_id: shopData.id,
        name: p.name,
        price: p.price,
        description: p.description,
        sizes: p.sizes ? p.sizes.split(",").map(s => s.trim()) : null,
        in_stock: true,
        // We skip image upload for now to keep the mockup simple, 
        // in real app we'd upload each product image and set images array
        images: [] 
      }));

      const { error: prodErr } = await supabase.from("products").insert(productsToInsert);
      if (prodErr) throw prodErr;

      setStep(4); // Success step
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-muted/30 pb-20">
      <header className="border-b bg-background sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80">
          <Store className="w-6 h-6" /> ShopSite
        </Link>
        <div className="text-sm font-medium text-muted-foreground">Step {step > 3 ? 3 : step} of 3</div>
      </header>

      <main className="max-w-3xl mx-auto pt-10 px-4">
        {/* Progress Bar */}
        {step <= 3 && (
          <div className="flex gap-2 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-primary/20"}`} />
            ))}
          </div>
        )}

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
                          <Input className="pr-20" {...field} data-testid="input-subdomain" />
                          <span className="absolute right-3 text-sm text-muted-foreground">.shopsite.in</span>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
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
                  <Button type="submit" size="lg" className="rounded-full px-8" data-testid="btn-next-1">Next Step <ChevronLeft className="w-4 h-4 ml-1 rotate-180" /></Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full shrink-0"><ChevronLeft className="w-5 h-5"/></Button>
              <div>
                <h1 className="text-3xl font-bold">Products & Payment</h1>
                <p className="text-muted-foreground">How people pay and what you sell.</p>
              </div>
            </div>

            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-8">
                
                {/* Payment Section */}
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl font-semibold">Payment Details</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <FormLabel className="block mb-2">UPI QR Code</FormLabel>
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

                {/* Products Section */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Add Your First Products</h2>
                  {productFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                          <h3 className="font-medium">Product {index + 1}</h3>
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeProduct(index)} data-testid={`btn-remove-product-${index}`}>
                              Remove
                            </Button>
                          )}
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
                              <FormControl><Input type="number" placeholder="999" {...field} data-testid={`input-pprice-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField control={form2.control} name={`products.${index}.sizes`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sizes (comma separated)</FormLabel>
                              <FormControl><Input placeholder="S, M, L, XL" {...field} data-testid={`input-psizes-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form2.control} name={`products.${index}.description`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl><Input placeholder="Soft cotton material..." {...field} data-testid={`input-pdesc-${index}`} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button type="button" variant="outline" className="w-full border-dashed py-8" onClick={() => appendProduct({ name: "", price: 0, description: "", sizes: "", image: null })} data-testid="btn-add-product">
                    + Add Another Product
                  </Button>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="rounded-full px-8" data-testid="btn-next-2">Review Store <ChevronLeft className="w-4 h-4 ml-1 rotate-180" /></Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full shrink-0"><ChevronLeft className="w-5 h-5"/></Button>
              <div>
                <h1 className="text-3xl font-bold">Review & Launch</h1>
                <p className="text-muted-foreground">Almost there. Looks good?</p>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-4">Shop Summary</h2>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div><span className="text-muted-foreground block">Shop Name</span><span className="font-medium text-base">{form1.watch("shop_name")}</span></div>
                  <div><span className="text-muted-foreground block">URL</span><span className="font-medium text-primary">{form1.watch("subdomain")}.shopsite.in</span></div>
                  <div><span className="text-muted-foreground block">Category</span><span className="font-medium">{form1.watch("category")}</span></div>
                  <div><span className="text-muted-foreground block">Contact</span><span className="font-medium">{form1.watch("whatsapp")} / {form1.watch("insta_handle")}</span></div>
                  <div><span className="text-muted-foreground block">Products</span><span className="font-medium">{form2.watch("products").length} items</span></div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full rounded-full py-8 text-xl font-bold" onClick={launchStore} disabled={isSubmitting} data-testid="btn-launch">
              {isSubmitting ? "Launching..." : "Launch My Store"}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold">Your store is pending review!</h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We'll verify your details and activate your store shortly. We'll message you on WhatsApp when it's live!
            </p>
            <div className="pt-8">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full px-8" data-testid="btn-go-dashboard">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}