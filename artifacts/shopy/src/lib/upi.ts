import QRCode from "qrcode";

export interface UPIPaymentParams {
  upiId: string;
  shopName: string;
  amount: number;
  orderId: string;
}

export function generateUPILink({ upiId, shopName, amount, orderId }: UPIPaymentParams): string {
  const note = `ORDER-${orderId.slice(0, 8).toUpperCase()}`;
  return (
    `upi://pay?` +
    `pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent(shopName)}` +
    `&am=${amount.toFixed(2)}` +
    `&tn=${encodeURIComponent(note)}` +
    `&cu=INR`
  );
}

export async function generateUPIQRCode(params: UPIPaymentParams): Promise<string> {
  return QRCode.toDataURL(generateUPILink(params), {
    width: 300,
    margin: 3,
    errorCorrectionLevel: "M",
    color: { dark: "#1a0533", light: "#ffffff" },
  });
}

export function validateUPIId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId);
}

export function detectUPIApp(upiId: string): { name: string; icon: string } | null {
  const handle = upiId.split("@")[1]?.toLowerCase();
  const apps: Record<string, { name: string; icon: string }> = {
    paytm:      { name: "Paytm",       icon: "🟦" },
    phonepe:    { name: "PhonePe",     icon: "🟣" },
    gpay:       { name: "Google Pay",  icon: "🔵" },
    okaxis:     { name: "Google Pay",  icon: "🔵" },
    okicici:    { name: "Google Pay",  icon: "🔵" },
    okhdfcbank: { name: "Google Pay",  icon: "🔵" },
    oksbi:      { name: "Google Pay",  icon: "🔵" },
    ybl:        { name: "PhonePe",     icon: "🟣" },
    ibl:        { name: "PhonePe",     icon: "🟣" },
    axl:        { name: "PhonePe",     icon: "🟣" },
    upi:        { name: "BHIM UPI",    icon: "🟩" },
    icici:      { name: "iMobile",     icon: "🔴" },
    sbi:        { name: "YONO SBI",    icon: "🔵" },
  };
  return handle && apps[handle] ? apps[handle] : null;
}
