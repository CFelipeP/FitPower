<?php

require_once __DIR__ . '/../vendor/autoload.php';

function createStripeConnectAccount(int $trainerId, int $userId): ?array {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT email, first_name, last_name, stripe_account_id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) return null;

        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

        $accountId = $user['stripe_account_id'];

        if (!$accountId) {
            $account = \Stripe\Account::create([
                'type' => 'express',
                'country' => 'US',
                'email' => $user['email'],
                'capabilities' => [
                    'transfers' => ['requested' => true],
                ],
                'business_type' => 'individual',
                'individual' => [
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                ],
                'metadata' => [
                    'trainer_id' => $trainerId,
                    'user_id' => $userId,
                ],
            ]);

            $accountId = $account->id;
            $db->prepare("UPDATE users SET stripe_account_id = ? WHERE id = ?")->execute([$accountId, $userId]);
            $db->prepare("UPDATE trainers SET stripe_account_id = ? WHERE user_id = ?")->execute([$accountId, $userId]);
        }

        $link = \Stripe\AccountLink::create([
            'account' => $accountId,
            'refresh_url' => APP_URL . '/coach/connect-stripe/refresh',
            'return_url' => APP_URL . '/coach/connect-stripe/return',
            'type' => 'account_onboarding',
        ]);

        return [
            'url' => $link->url,
            'account_id' => $accountId,
        ];
    } catch (\Exception $e) {
        return null;
    }
}
