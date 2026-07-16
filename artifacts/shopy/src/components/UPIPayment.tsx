import { useEffect, useState } from "react";
import { generateUPIQRCode, generateUPILink, detectUPIApp, validateUPIId } from "@/lib/upi";
import { Copy, CheckCircle, Smartphone } from "lucide-react";

function PhonePeLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#5f259f"/>
      <path d="M13 10h8.5c3.6 0 6.5 2.9 6.5 6.5S25.1 23 21.5 23H18v7h-5V10zm5 9h3.5c.8 0 1.5-.7 1.5-1.5S22.3 16 21.5 16H18v3z" fill="white"/>
    </svg>
  );
}

function GPayLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Arial,sans-serif">
        <tspan fill="#4285F4">G</tspan><tspan fill="#1a1a1a">Pay</tspan>
      </text>
    </svg>
  );
}

function PaytmLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#00BAF2"/>
      <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="Arial,sans-serif" letterSpacing="0.5">PAYTM</text>
    </svg>
  );
}

const APP_LOGOS: Record<string, React.FC<{ size?: number }>> = {
  PhonePe: PhonePeLogo,
  GPay: GPayLogo,
  Paytm: PaytmLogo,
};

interface UPIPaymentProps {
  upiId: string;
  shopName: string;
  amount: number;
  orderId: string;
  onPaymentSubmitted: (utr: string) => void;
  isSubmitting?: boolean;
}

export function UPIPayment({ upiId, shopName, amount, orderId, onPaymentSubmitted, isSubmitting }: UPIPaymentProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const upiLink = generateUPILink({ upiId, shopName, amount, orderId });
  const detectedApp = detectUPIApp(upiId);
  const utrValid = /^\d{12}$/.test(utr.trim());

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
    generateUPIQRCode({ upiId, shopName, amount, orderId }).then(url => {
      setQrUrl(url);
      setQrLoading(false);
    });
  }, [upiId, amount, orderId]);

  function copyUPIId() {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit() {
    const cleaned = utr.trim().replace(/\s/g, "");
    if (!/^\d{12}$/.test(cleaned)) {
      setUtrError("UTR must be exactly 12 digits. Find it in your UPI app payment history.");
      return;
    }
    setUtrError("");
    onPaymentSubmitted(cleaned);
  }

  const appLinks = [
    { name: "PhonePe", icon: "🟣", url: `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&tn=${orderId}` },
    { name: "GPay",    icon: "🔵", url: `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&tn=${orderId}` },
    { name: "Paytm",   icon: "🟦", url: `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&tn=${orderId}` },
  ];

  return (
    <div className="flex flex-col items-center gap-6">

      {/* Amount */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Pay exact amount</p>
        <p className="text-5xl font-extrabold text-primary">₹{amount}</p>
        <p className="text-xs text-muted-foreground mt-1">to {shopName}</p>
      </div>

      {/* QR Code */}
      <div className="relative">
        {qrLoading ? (
          <div className="w-[260px] h-[260px] bg-muted rounded-2xl animate-pulse flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Generating QR…</p>
          </div>
        ) : (
          <div className="relative inline-block">
            <img
              src={qrUrl}
              alt="UPI Payment QR"
              className="w-[260px] h-[260px] rounded-2xl border-4 border-primary/10 shadow-lg"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="bg-white/90 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                shopgram.in
              </span>
            </div>
          </div>
        )}
      </div>

      {/* How to pay */}
      <div className="w-full bg-primary/5 border border-primary/10 rounded-2xl p-4">
        <p className="text-sm font-semibold text-primary mb-2">How to pay:</p>
        <ol className="space-y-1.5">
          {[
            "Open PhonePe, GPay or Paytm",
            "Scan the QR code above",
            `Pay exactly ₹${amount} — do not change the amount`,
            "Copy the 12-digit UTR from your payment receipt",
            "Paste UTR below and tap confirm",
          ].map((step, i) => (
            <li key={i} className="text-sm text-primary/80 flex gap-2">
              <span className="font-bold shrink-0">{i + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </div>

      {/* UPI ID copy */}
      <div className="w-full">
        <p className="text-xs text-muted-foreground mb-1.5 text-center">Or pay manually to UPI ID</p>
        <button
          onClick={copyUPIId}
          className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 border border-border rounded-xl px-4 py-3 transition-colors"
        >
          <span className="font-mono text-sm text-foreground">{upiId}</span>
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
              <CheckCircle className="w-4 h-4" /> Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1 text-primary text-xs font-medium">
              <Copy className="w-4 h-4" /> Copy
            </span>
          )}
        </button>
      </div>

      {/* Mobile: open UPI app button */}
      {isMobile && (
        <div className="w-full space-y-2">
          <a
            href={upiLink}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-full text-base shadow-lg active:scale-95 transition-transform"
          >
            {detectedApp && APP_LOGOS[detectedApp.name]
              ? (() => { const Logo = APP_LOGOS[detectedApp.name]; return <Logo size={22} />; })()
              : <Smartphone className="w-5 h-5" />
            }
            {detectedApp ? `Pay with ${detectedApp.name}` : "Open UPI App to Pay"}
          </a>
          <div className="flex gap-2">
            {appLinks.map(app => {
              const Logo = APP_LOGOS[app.name];
              return (
                <a
                  key={app.name}
                  href={app.url}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-muted hover:bg-muted/70 border border-border rounded-full py-2.5 transition-colors"
                >
                  {Logo ? <Logo size={18} /> : null}
                  {app.name}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <p className="text-xs text-muted-foreground whitespace-nowrap">After paying, enter transaction ID</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* UTR input */}
      <div className="w-full space-y-2">
        <label className="text-sm font-medium text-foreground">
          UTR / Transaction ID <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Enter 12-digit UTR number"
          value={utr}
          onChange={e => { setUtr(e.target.value); setUtrError(""); }}
          maxLength={12}
          className="w-full font-mono text-lg border-2 border-border rounded-xl px-4 py-3 focus:border-primary focus:outline-none tracking-widest text-center bg-background"
        />
        <p className={`text-xs ${utr.length === 12 ? "text-emerald-500" : "text-muted-foreground"}`}>
          {utr.length}/12 digits
        </p>
        {utrError && <p className="text-destructive text-xs flex items-center gap-1">⚠️ {utrError}</p>}
        <p className="text-xs text-muted-foreground">
          Find UTR in your UPI app → Payment History → tap the payment → copy reference number
        </p>

        <button
          onClick={handleSubmit}
          disabled={!utrValid || isSubmitting}
          className="w-full bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground text-white font-bold py-4 rounded-full text-base mt-2 transition-all active:scale-95"
        >
          {isSubmitting
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Confirming…</span>
            : `✅ Confirm Payment — ₹${amount}`}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        🔒 Your payment goes directly to the seller. Shopgram never holds your money.
      </p>
    </div>
  );
}

/* ── Mini live QR preview (used in settings/signup) ── */
interface MiniQRPreviewProps {
  upiId: string;
  shopName?: string;
}

export function MiniQRPreview({ upiId, shopName = "Your Shop" }: MiniQRPreviewProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!validateUPIId(upiId)) { setQrUrl(""); return; }
    setLoading(true);
    generateUPIQRCode({ upiId, shopName, amount: 0, orderId: "preview" }).then(url => {
      setQrUrl(url);
      setLoading(false);
    });
  }, [upiId, shopName]);

  if (!validateUPIId(upiId)) return null;

  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <p className="text-xs text-muted-foreground font-medium">Your buyers will see this payment QR</p>
      <div className="relative inline-block">
        {loading ? (
          <div className="w-28 h-28 bg-muted rounded-xl animate-pulse" />
        ) : (
          <>
            <img src={qrUrl} alt="QR preview" className="w-28 h-28 rounded-xl border-2 border-primary/10 shadow-sm" />
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
              <span className="bg-white/90 text-primary text-[9px] font-semibold px-1.5 py-0.5 rounded-full">shopgram.in</span>
            </div>
          </>
        )}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{upiId}</p>
    </div>
  );
}
