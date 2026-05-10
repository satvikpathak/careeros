let cachedClient: any = null;

export function isDodoConfigured(): boolean {
  return Boolean(process.env.DODO_API_KEY);
}

export async function getDodo() {
  if (!isDodoConfigured()) throw new Error("billing_not_configured");
  if (cachedClient) return cachedClient;
  const mod: any = await import("dodopayments");
  // The SDK exports the class as default or named — try both shapes.
  const Ctor = mod.default ?? mod.DodoPayments ?? mod;
  cachedClient = new Ctor({
    bearerToken: process.env.DODO_API_KEY!,
    environment: process.env.DODO_ENV === "live_mode" ? "live_mode" : "test_mode",
  });
  return cachedClient;
}

export async function createCheckoutUrl(input: {
  productId: string;
  customer: { email: string; name?: string; customerId?: string | null };
  returnUrl: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const dodo = await getDodo();
  const params: any = {
    product_cart: [{ product_id: input.productId, quantity: 1 }],
    return_url: input.returnUrl,
    payment_link: true,
    metadata: input.metadata,
    customer: input.customer.customerId
      ? { customer_id: input.customer.customerId }
      : { email: input.customer.email, name: input.customer.name ?? "" },
  };
  if (dodo.subscriptions?.create) {
    const res = await dodo.subscriptions.create(params);
    if (res?.payment_link) return res.payment_link;
    if (res?.checkout_url) return res.checkout_url;
    if (res?.url) return res.url;
  }
  throw new Error("dodo_create_checkout_failed");
}

export async function createPortalUrl(input: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const dodo = await getDodo();
  if (dodo.customers?.customerPortal?.create) {
    const res = await dodo.customers.customerPortal.create({
      customer_id: input.customerId,
      return_url: input.returnUrl,
    });
    if (res?.url) return res.url;
    if (res?.link) return res.link;
  }
  throw new Error("dodo_create_portal_failed");
}

export async function verifyWebhook(input: {
  body: string;
  headers: Record<string, string>;
}): Promise<any> {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) throw new Error("DODO_WEBHOOK_SECRET missing");

  try {
    const { Webhook } = await import("standardwebhooks");
    const wh = new Webhook(secret);
    return wh.verify(input.body, input.headers);
  } catch {
    const dodo = await getDodo();
    if (dodo.webhooks?.verify) {
      return dodo.webhooks.verify(input.body, input.headers, secret);
    }
    throw new Error("no webhook verifier available");
  }
}
