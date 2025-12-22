"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Bell, BellOff, Loader2 } from "lucide-react"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
} from "@/lib/push-notifications"

interface NotificationSettingsProps {
  userId: string
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    setLoading(true)
    const subscribed = await isPushSubscribed()
    setIsSubscribed(subscribed)
    setLoading(false)
  }

  async function handleToggle() {
    setActionLoading(true)
    try {
      if (isSubscribed) {
        await unsubscribeFromPushNotifications()
        setIsSubscribed(false)
      } else {
        const success = await subscribeToPushNotifications(userId)
        setIsSubscribed(success)
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">اعلان‌های یادآوری</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed ? "فعال - حتی وقتی برنامه بسته است" : "غیرفعال"}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={actionLoading}
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSubscribed ? "غیرفعال" : "فعال کردن"}
        </Button>
      </div>
    </Card>
  )
}
