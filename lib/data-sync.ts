import { createClient } from "@/lib/supabase/client"
import type { Installment } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth-handler"
import { addToQueue } from "@/lib/background-sync"

const CACHE_KEY = "installments_cache"
const CACHE_DURATION = 30000 // 30 ثانیه

function invalidateCache(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(`${CACHE_KEY}-${userId}`)
  console.log("[Sync] 🗑️ Cache invalidated")
}

function getCache(userId: string): { data: Installment[], timestamp: number } | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(`${CACHE_KEY}-${userId}`)
  if (!stored) return null
  
  const cache = JSON.parse(stored)
  const now = Date.now()
  
  if (now - cache.timestamp > CACHE_DURATION) {
    return null
  }
  
  return cache
}

function setCache(userId: string, data: Installment[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`${CACHE_KEY}-${userId}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }))
}

// ============================================
// 📥 LOAD INSTALLMENTS
// ============================================
export async function loadInstallments(): Promise<Installment[]> {
  const user = await getCurrentUser()
  
  if (!user) {
    console.log("[Sync] No authenticated user found")
    return []
  }
  
  const userId = user.id
  
  // 1. چک کردن کش
  const cache = getCache(userId)
  if (cache) {
    console.log("[Sync] ⚡ Using cached data")
    refreshDataInBackground(userId)
    return cache.data
  }
  
  // 2. داده محلی
  const localData = getLocalInstallments(userId)
  console.log("[Sync] 📂 Local data count:", localData.length)
  
  // 3. اگر آفلاین است
  if (!navigator.onLine) {
    console.log("[Sync] 📴 Offline mode")
    return localData
  }
  
  // 4. اگر داده محلی داره، برگردون و در پس‌زمینه refresh کن
  if (localData.length > 0) {
    console.log("[Sync] ⚡ Returning local data, refreshing in background...")
    refreshDataInBackground(userId)
    return localData
  }
  
  // 5. اولین بار - از سرور بگیر
  console.log("[Sync] 🌐 First load - fetching from server...")
  try {
    const serverData = await fetchFromServer(userId)
    saveLocalInstallments(userId, serverData)
    setCache(userId, serverData)
    return serverData
  } catch (error) {
    console.error("[Sync] Error fetching from server:", error)
    return localData
  }
}

// ============================================
// 🔄 Refresh در پس‌زمینه
// ============================================
async function refreshDataInBackground(userId: string): Promise<void> {
  try {
    const serverData = await fetchFromServer(userId)
    const localData = getLocalInstallments(userId)
    const merged = mergeInstallments(localData, serverData)
    
    saveLocalInstallments(userId, merged)
    setCache(userId, merged)
    
    window.dispatchEvent(new CustomEvent('data-refreshed', { detail: merged }))
    console.log("[Sync] ✨ Background refresh complete")
  } catch (error) {
    console.error("[Sync] Background refresh failed:", error)
  }
}

// ============================================
// 💾 SAVE INSTALLMENT
// ============================================
export async function saveInstallment(installment: Installment): Promise<void> {
  const user = await getCurrentUser()
  if (!user) {
    console.error("[Sync] Cannot save: No user")
    return
  }

  const userId = user.id
  
  // 1. فوری روی localStorage بنویس
  const installments = getLocalInstallments(userId)
  const existingIndex = installments.findIndex((i) => i.id === installment.id)
  const isUpdate = existingIndex >= 0

  if (isUpdate) {
    installments[existingIndex] = installment
  } else {
    installments.push(installment)
  }

  saveLocalInstallments(userId, installments)
  invalidateCache(userId)
  
  console.log(`[Sync] ⚡ ${isUpdate ? 'Updated' : 'Created'} locally: ${installment.creditor_name}`)
  
  // 2. اضافه به صف
  addToQueue({
    type: isUpdate ? "update" : "create",
    entityType: "installment",
    data: { ...installment, user_id: userId },
  })
}

// ============================================
// 🗑️ DELETE INSTALLMENT
// ============================================
export async function deleteInstallment(installmentId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) {
    console.error("[Sync] Cannot delete: No user")
    return
  }

  const userId = user.id
  
  // 1. فوری از localStorage حذف کن
  const installments = getLocalInstallments(userId)
  const filtered = installments.filter((i) => i.id !== installmentId)
  saveLocalInstallments(userId, filtered)
  invalidateCache(userId)
  
  console.log(`[Sync] ⚡ Deleted locally: ${installmentId}`)
  
  // 2. اضافه به صف
  addToQueue({
    type: "delete",
    entityType: "installment",
    data: { id: installmentId },
  })
}

// ============================================
// ✅ TOGGLE PAYMENT
// ============================================
export async function togglePayment(installmentId: string, paymentId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) {
    console.error("[Sync] Cannot toggle: No user")
    return
  }

  const userId = user.id
  
  // 1. فوری تغییر بده
  const installments = getLocalInstallments(userId)
  const installment = installments.find((i) => i.id === installmentId)
  if (!installment) {
    console.error("[Sync] Installment not found:", installmentId)
    return
  }

  const payment = installment.payments.find((p) => p.id === paymentId)
  if (!payment) {
    console.error("[Sync] Payment not found:", paymentId)
    return
  }

  payment.is_paid = !payment.is_paid
  payment.paid_date = payment.is_paid ? new Date().toISOString().split("T")[0] : undefined
  installment.updated_at = new Date().toISOString()

  saveLocalInstallments(userId, installments)
  invalidateCache(userId)
  
  console.log(`[Sync] ⚡ Payment toggled locally: ${payment.is_paid ? 'PAID' : 'UNPAID'}`)
  
  // 2. اضافه به صف
  addToQueue({
    type: "toggle_payment",
    entityType: "payment",
    data: { 
      installmentId, 
      paymentId, 
      isPaid: payment.is_paid, 
      paidDate: payment.paid_date 
    },
  })
}

// ============================================
// 🌐 SERVER OPERATIONS
// ============================================
async function fetchFromServer(userId: string): Promise<Installment[]> {
  const supabase = createClient()

  const { data: installmentsData, error } = await supabase
    .from("installments")
    .select(`
      *,
      installment_payments(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (installmentsData || []).map((inst: any) => ({
    ...inst,
    payments: inst.installment_payments || [],
  }))
}

// ============================================
// 💾 LOCAL STORAGE
// ============================================
function getLocalInstallments(userId: string): Installment[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(`installments-${userId}`)
  return stored ? JSON.parse(stored) : []
}

function saveLocalInstallments(userId: string, installments: Installment[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`installments-${userId}`, JSON.stringify(installments))
}

function mergeInstallments(local: Installment[], server: Installment[]): Installment[] {
  const merged = new Map<string, Installment>()
  
  // Server data first (source of truth)
  server.forEach(item => merged.set(item.id, item))
  
  // Local data که هنوز sync نشده
  local.forEach(item => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item)
    }
  })
  
  return Array.from(merged.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getPendingOperationsCount(): number {
  const { getQueueSize } = require("@/lib/background-sync")
  return getQueueSize()
}

// ============================================
// 🔙 UNDO LAST PAYMENT
// ============================================
export function getLastPaidPayment(installment: Installment): { id: string; due_date: string; amount: number } | null {
  if (!installment.payments || !Array.isArray(installment.payments)) {
    return null
  }
  
  const paidPayments = installment.payments
    .filter((p) => p.is_paid)
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  
  if (paidPayments.length === 0) {
    return null
  }
  
  return paidPayments[0]
}

export async function undoLastPayment(installmentId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) {
    console.error("[Sync] Cannot undo: No user")
    return
  }

  const userId = user.id
  
  // 1. پیدا کردن قسط
  const installments = getLocalInstallments(userId)
  const installment = installments.find((i) => i.id === installmentId)
  if (!installment) {
    console.error("[Sync] Installment not found:", installmentId)
    return
  }

  // 2. پیدا کردن آخرین پرداخت شده
  const lastPaid = getLastPaidPayment(installment)
  if (!lastPaid) {
    console.error("[Sync] No paid payment found to undo")
    return
  }

  // 3. تغییر وضعیت به پرداخت نشده
  const payment = installment.payments.find((p) => p.id === lastPaid.id)
  if (!payment) {
    console.error("[Sync] Payment not found:", lastPaid.id)
    return
  }

  payment.is_paid = false
  payment.paid_date = undefined
  installment.updated_at = new Date().toISOString()

  saveLocalInstallments(userId, installments)
  invalidateCache(userId)
  
  console.log(`[Sync] ⚡ Payment undone locally: ${lastPaid.due_date}`)
  
  // 4. اضافه به صف
  addToQueue({
    type: "toggle_payment",
    entityType: "payment",
    data: { 
      installmentId, 
      paymentId: lastPaid.id, 
      isPaid: false, 
      paidDate: undefined 
    },
  })
}
