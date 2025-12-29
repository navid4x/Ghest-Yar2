import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// تبدیل VAPID key از base64 به Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ========================================
// 📲 درخواست مجوز و اشتراک push notification
// ========================================
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    console.log("[Push] Starting subscription process...")

    // چک کردن پشتیبانی مرورگر
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Push notifications not supported")
      return false
    }

    // درخواست مجوز
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("[Push] Notification permission denied")
      return false
    }

    console.log("[Push] Permission granted, registering service worker...")

    // ثبت service worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none", // همیشه آخرین نسخه رو بگیر
    })

    // منتظر آماده شدن service worker
    await navigator.serviceWorker.ready
    console.log("[Push] Service worker ready")

    // چک کردن subscription موجود
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      console.log("[Push] Creating new subscription...")
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.error("[Push] VAPID public key not found")
        return false
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      
      console.log("[Push] Subscription created")
    } else {
      console.log("[Push] Using existing subscription")
    }

    // ذخیره subscription در سرور
    const subscriptionJson = subscription.toJSON()
    console.log("[Push] Saving subscription to database...")
    
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || "",
        auth: subscriptionJson.keys?.auth || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

    if (error) {
      console.error("[Push] Failed to save subscription:", error)
      return false
    }

    console.log("[Push] ✅ Subscription saved successfully")
    return true
  } catch (error) {
    console.error("[Push] Error subscribing:", error)
    return false
  }
}

// ========================================
// 🚫 لغو اشتراک
// ========================================
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // حذف از سرور
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint)

      // لغو اشتراک
      await subscription.unsubscribe()
      console.log("[Push] Unsubscribed successfully")
    }

    return true
  } catch (error) {
    console.error("[Push] Error unsubscribing:", error)
    return false
  }
}

// ========================================
// ✅ چک کردن وضعیت اشتراک
// ========================================
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

// ========================================
// 🧪 تست نوتیفیکیشن
// ========================================
export async function testPushNotification(userId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: "🎉 تست موفق!",
        body: "نوتیفیکیشن‌های شما درست کار می‌کنند",
        url: "/",
      }),
    })

    const data = await response.json()
    return data.success && data.sent > 0
  } catch (error) {
    console.error("[Push] Test notification failed:", error)
    return false
  }
}
