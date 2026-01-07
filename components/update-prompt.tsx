"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, X } from "lucide-react"

export function UpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    // گوش دادن به پیام‌های Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        console.log("[App] SW updated to version:", event.data.version)
        setShowUpdatePrompt(true)
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)

    // چک کردن آپدیت هنگام بارگذاری
    navigator.serviceWorker.ready.then((registration) => {
      // چک کردن آپدیت هر 60 ثانیه
      const checkUpdate = () => {
        registration.update().catch(console.error)
      }

      checkUpdate()
      const interval = setInterval(checkUpdate, 60000)

      // اگر Service Worker جدید در انتظار است
      if (registration.waiting) {
        setShowUpdatePrompt(true)
      }

      // گوش دادن به Service Worker جدید
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Service Worker جدید نصب شده و آماده است
              setShowUpdatePrompt(true)
            }
          })
        }
      })

      return () => clearInterval(interval)
    })

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [])

  const handleUpdate = async () => {
    setUpdating(true)

    try {
      const registration = await navigator.serviceWorker.ready

      // به Service Worker در انتظار بگو فعال شود
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" })
      }

      // پاک کردن همه کش‌ها
      if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel()
        messageChannel.port1.onmessage = () => {
          // بعد از پاک شدن کش، صفحه را reload کن
          window.location.reload()
        }
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_CACHES" }, [messageChannel.port2])
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error("[App] Update failed:", error)
      // در صورت خطا، فقط reload کن
      window.location.reload()
    }
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm">نسخه جدید موجود است</p>
          <p className="text-xs opacity-90">برای دریافت آخرین تغییرات، آپدیت کنید</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleUpdate} disabled={updating} className="gap-1">
            {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            آپدیت
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowUpdatePrompt(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
