# FitPowerPro — Saved Payment Methods / VW cards (audit)

## Result (evidence-based, nothing invented)

**Virtual Wallet does NOT provide saved-card / tokenization / payment-method management
in the current real integration.**

### Evidence
1. Official widget `checkout.js` (`{VW_BASE}/api/v1/widget/checkout.js`) — the only real
   client integration — contains **no** saved-card, token, default, list, or delete
   functionality. It performs a **one-time card payment** via
   `POST /api/v1/checkout/process-sdk-card/` (name, cardNum, expiration, CVV, amount).
2. Real endpoints used by FitPower's VW integration:
   - `POST /api/v1/checkout/intent/`
   - `GET  /api/v1/checkout/status/?uuid=`
   - `POST /api/v1/checkout/process-sdk-card/`
   - `GET  /api/v1/widget/checkout.js`
   None of them manage stored payment methods.
3. The VW server (`VIRTUAL_WALLET_BASE_URL`) is currently **unreachable** from the Pi
   (HTTP 000), so no further server-side docs/surface could be inspected at audit time.
   → Re-audit once reachable; do NOT invent endpoints.

### FitPower database (read-only audit)
- **No sensitive card data is stored**: no `card_number`, `cvv`, `cvc`, `security_code`,
  `expiry`, `expiration`, `pan` columns anywhere.
- Only non-sensitive provider references: `payments.provider`, `payments.provider_intent_id`,
  `payments.paypal_capture_id`, `payments.stripe_invoice_id`, `users.stripe_customer_id`,
  `user_subscriptions.stripe_subscription_id`, `user_subscriptions.paypal_order_id`, etc.
- No `payment_methods` / `customers` table (only `payments`).
- Card data entered at checkout is forwarded server-side to VW (`vwProcessCard`) and is
  **never persisted, logged, or exposed** to the frontend.

## What a future "Payment Methods" feature would require (provider side)
- A VW tokenization / customer-card API that returns a persistent, non-sensitive
  payment-method ID (brand + last-4 + expiry) and supports: list, set-default, delete,
  and "pay with saved method" on a future subscription. Without these real endpoints,
  a Payment Methods UI would be dishonest and is therefore **NOT implemented**.

## Integration point (when VW provides it)
`api/routes/finance/virtual_wallet.php` (`vwProcessCard` / `vwCreateCheckout`) is the
single place to add saved-method flows. Keep the same patterns: server-side secret,
ownership checks, no client-trusted user_id.
