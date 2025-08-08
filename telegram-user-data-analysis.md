# Telegram User Data Analysis & Payment Matching Strategies

## 📱 Telegram User Data Available

### Core User Information (from `ctx.from`)

```typescript
interface TelegramUser {
  id: number; // Unique Telegram user ID (primary identifier)
  is_bot: boolean; // Whether the user is a bot
  first_name: string; // User's first name
  last_name?: string; // User's last name (optional)
  username?: string; // Username without @ (optional)
  language_code?: string; // IETF language tag (e.g., "en")
  is_premium?: boolean; // Whether user has Telegram Premium
  added_to_attachment_menu?: boolean; // Can use attachment menu
}
```

### Additional Context Data

```typescript
interface TelegramContext {
  chat: {
    id: number; // Chat ID (same as user.id for private chats)
    type: string; // "private", "group", "supergroup", "channel"
    title?: string; // Chat title (for groups/channels)
    username?: string; // Chat username (for groups/channels)
  };
  message: {
    date: number; // Message timestamp
    text?: string; // Message text
    from: TelegramUser; // User who sent the message
  };
}
```

## 🗄️ Current Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,    -- Primary matching field
  username VARCHAR(255),                  -- @username (optional)
  first_name VARCHAR(255),                -- First name
  last_name VARCHAR(255),                 -- Last name (optional)
  preferences JSONB DEFAULT '{"currency": "USD", "language": "en", "notifications": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 💳 Payment Matching Strategies

### 1. **Telegram ID Matching (Recommended)**

```typescript
// Most reliable method - Telegram ID is unique and permanent
const matchUserByTelegramId = async (telegramId: number) => {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();
  return user;
};
```

**Pros:**

- ✅ Unique and permanent identifier
- ✅ Cannot be changed by user
- ✅ Works even if username changes
- ✅ Available in all Telegram interactions

**Cons:**

- ❌ Requires payment system to capture Telegram ID
- ❌ Need to link payment to Telegram ID during checkout

### 2. **Username Matching**

```typescript
// Less reliable - username can change
const matchUserByUsername = async (username: string) => {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();
  return user;
};
```

**Pros:**

- ✅ Human-readable identifier
- ✅ Easy to communicate with users

**Cons:**

- ❌ Username can be changed by user
- ❌ Username is optional (can be null)
- ❌ Not unique across all Telegram users

### 3. **Email + Telegram ID Matching**

```typescript
// Enhanced matching with email verification
interface PaymentData {
  telegramId: number;
  email: string;
  paymentId: string;
  amount: number;
  tier: "premium" | "pro";
}

const matchUserByEmailAndTelegramId = async (paymentData: PaymentData) => {
  // First try exact Telegram ID match
  let user = await matchUserByTelegramId(paymentData.telegramId);

  if (!user) {
    // Fallback: search by email in payment records
    const { data: paymentRecord } = await supabase
      .from("payments")
      .select("telegram_id")
      .eq("email", paymentData.email)
      .eq("status", "completed")
      .single();

    if (paymentRecord) {
      user = await matchUserByTelegramId(paymentRecord.telegram_id);
    }
  }

  return user;
};
```

## 🔧 Implementation Recommendations

### 1. **Enhanced User Registration**

```typescript
// Add more user data fields
interface EnhancedUser {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  email?: string; // For payment matching
  phone_number?: string; // Alternative contact
  payment_customer_id?: string; // Stripe/PayPal customer ID
  subscription_tier?: "free" | "premium" | "pro";
  subscription_expires_at?: Date;
}
```

### 2. **Payment Integration Strategy**

```typescript
// Payment webhook handler
const handlePaymentSuccess = async (paymentData: PaymentData) => {
  // 1. Find user by Telegram ID (most reliable)
  let user = await UserService.getUser(paymentData.telegramId);

  // 2. If not found, try email matching
  if (!user) {
    user = await UserService.findUserByEmail(paymentData.email);
  }

  // 3. Update user subscription
  if (user) {
    await UserService.upgradeSubscription(user.id, {
      tier: paymentData.tier,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentId: paymentData.paymentId,
    });

    // 4. Send confirmation message
    await bot.telegram.sendMessage(
      user.telegram_id,
      `✅ Payment successful! Your ${paymentData.tier} subscription is now active.`
    );
  }
};
```

### 3. **Database Schema Enhancements**

```sql
-- Add payment-related fields to users table
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN payment_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  telegram_id BIGINT,
  email VARCHAR(255),
  payment_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  tier VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX idx_payments_email ON payments(email);
CREATE INDEX idx_payments_status ON payments(status);
```

### 4. **User Service Enhancements**

```typescript
export class UserService {
  // Find user by email (for payment matching)
  static async findUserByEmail(email: string): Promise<User | null> {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    return user;
  }

  // Upgrade user subscription
  static async upgradeSubscription(
    userId: string,
    subscription: {
      tier: "premium" | "pro";
      expiresAt: Date;
      paymentId: string;
    }
  ): Promise<boolean> {
    const { error } = await supabase
      .from("users")
      .update({
        subscription_tier: subscription.tier,
        subscription_expires_at: subscription.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Record payment
    await supabase.from("payments").insert({
      user_id: userId,
      payment_id: subscription.paymentId,
      tier: subscription.tier,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    return !error;
  }
}
```

## 🎯 **Recommended Approach**

1. **Primary Matching:** Use `telegram_id` as the primary identifier
2. **Fallback Matching:** Use email address for payment reconciliation
3. **Enhanced Data Collection:** Store additional user data during registration
4. **Payment Integration:** Capture Telegram ID during checkout process
5. **User Communication:** Send payment confirmations via Telegram

This approach provides the most reliable user matching while maintaining flexibility for edge cases.
