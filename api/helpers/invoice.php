<?php
function generateInvoicePdf(int $subscriptionId): string {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT s.*, sp.name as plan_name, COALESCE(sp.price_monthly, sp.price_yearly, 0) as price, u.first_name, u.last_name, u.email
        FROM user_subscriptions s
        JOIN subscription_plans sp ON sp.id = s.plan_id
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
    ");
    $stmt->execute([$subscriptionId]);
    $data = $stmt->fetch();
    if (!$data) error('Suscripción no encontrada', 404);
    
    // Simple invoice generation as HTML that can be converted to PDF
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial; padding: 40px; color: #333; }
        .header { border-bottom: 2px solid #FFD600; padding-bottom: 20px; margin-bottom: 30px; }
        .invoice-title { font-size: 24px; font-weight: bold; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
    </style></head><body>
        <div class="header">
            <div class="invoice-title">⚡ FitPower</div>
            <p>Invoice #INV-' . str_pad($data['id'], 6, '0', STR_PAD_LEFT) . '</p>
            <p>Date: ' . date('Y-m-d') . '</p>
        </div>
        <p><strong>Bill To:</strong><br>' . htmlspecialchars($data['first_name']) . ' ' . htmlspecialchars($data['last_name']) . '<br>' . htmlspecialchars($data['email']) . '</p>
        <table><tr><th>Description</th><th>Amount</th></tr>
        <tr><td>' . htmlspecialchars($data['plan_name']) . ' Subscription</td><td>$' . number_format($data['price'], 2) . '</td></tr>
        </table>
        <div class="total">Total: $' . number_format($data['price'], 2) . '</div>
        <p style="color:#888;font-size:12px;margin-top:40px;">FitPower — Train Without Limits</p>
    </body></html>';
    
    $file = sys_get_temp_dir() . '/invoice_' . $subscriptionId . '.html';
    file_put_contents($file, $html);
    return $file;
}
