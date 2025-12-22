"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // وقتی اپ deploy شد روی production، این را فعال کنید
    const isProduction =
      typeof window !== "undefined" &&
      !window.location.hostname.includes("vusercontent.net") &&
      !window.location.hostname.includes("localhost")

    if (!isProduction) {
      console.log("[v0] Service Worker skipped in preview/development")
      return
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[v0] Service Worker registered:", registration.scope)
        })
        .catch((error) => {
          // Silent fail - اپ بدون SW هم کار می‌کند
          console.log("[v0] Service Worker not available")
        })
    }
  }, [])

  return null
}
