"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Bell, BellOff, Loader2, TestTube } from "lucide-react"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  testPushNotification,
} from "@/lib/push-notifications"
import { useToast } from "@/hooks/use-toast"

interface NotificationSettingsProps {
  userId: string
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const { toast } = useToast()

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
        const success = await unsubscribeFromPushNotifications()
        if (success) {
          setIsSubscribed(false)
          toast({
            title: "✅ غیرفعال شد",
            description: "نوتیفیکیشن‌ها غیرفعال شدند",
          })
        } else {
          toast({
            title: "❌ خطا",
            description: "مشکلی در غیرفعال‌سازی پیش آمد",
            variant: "destructive",
          })
        }
      } else {
        const success = await subscribeToPushNotifications(userId)
        if (success) {
          setIsSubscribed(true)
          toast({
            title: "✅ فعال شد",
            description: "نوتیفیکیشن‌ها فعال شدند. از دکمه تست استفاده کنید.",
          })
        } else {
          toast({
            title: "❌ خطا",
            description: "مشکلی در فعال‌سازی پیش آمد. لطفاً دسترسی نوتیفیکیشن را در مرورگر فعال کنید.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleTest() {
    if (!isSubscribed) {
      toast({
        title: "⚠️ توجه",
        description: "ابتدا باید نوتیفیکیشن را فعال کنید",
        variant: "destructive",
      })
      return
    }

    setTestLoading(true)
    try {
      const success = await testPushNotification(userId)
      if (success) {
        toast({
          title: "✅ موفق",
          description: "نوتیفیکیشن تست ارسال شد! چک کنید.",
        })
      } else {
        toast({
          title: "❌ خطا",
          description: "مشکلی در ارسال نوتیفیکیشن پیش آمد",
          variant: "destructive",
        })
      }
    } finally {
      setTestLoading(false)
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
      <div className="space-y-3">
        {/* بخش فعال/غیرفعال کردن */}
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
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              "غیرفعال"
            ) : (
              "فعال کردن"
            )}
          </Button>
        </div>

        {/* دکمه تست - فقط وقتی فعاله نمایش داده میشه */}
        {isSubscribed && (
          <div className="pt-3 border-t">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testLoading}
              className="w-full"
            >
              {testLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 ml-2" />
                  ارسال نوتیفیکیشن تست
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              با این دکمه میتوانید نوتیفیکیشن را تست کنید
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
