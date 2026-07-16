import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  buyer_name: z.string().min(2, "Name must be at least 2 characters"),
  buyer_phone: z.string().regex(/^\+?91?[6789]\d{9}$/, "Valid Indian phone number required"),
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
  utr: z.string().regex(/^[A-Za-z0-9]{8,22}$/, "Enter a valid UTR / Transaction ID (8–22 characters)"),
  product_id: z.string().min(1, "Select a product"),
});

interface UTRFormProps {
  shopId: string;
  products: Product[];
}

export function UTRForm({ shopId, products }: UTRFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyer_name: "",
      buyer_phone: "",
      amount: 0,
      utr: "",
      product_id: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("orders").insert({
        shop_id: shopId,
        ...values,
        status: "pending",
      });

      if (error) throw error;
      
      toast.success("Order submitted!", {
        description: "Seller will confirm on WhatsApp.",
      });
      form.reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-card border rounded-xl p-5 sm:p-6" data-testid="utr-form-container">
      <h3 className="text-lg font-semibold mb-4">Submit Payment Details</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="buyer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} data-testid="input-buyer-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="buyer_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp Number</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} data-testid="input-buyer-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Purchased</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - ₹{p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500" {...field} data-testid="input-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="utr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>12-digit UTR/Ref No.</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012" maxLength={12} {...field} data-testid="input-utr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full rounded-full mt-2" disabled={isSubmitting} data-testid="btn-submit-order">
            {isSubmitting ? "Submitting..." : "Submit Payment Details"}
          </Button>
        </form>
      </Form>
    </div>
  );
}