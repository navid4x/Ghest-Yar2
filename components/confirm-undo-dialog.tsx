"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Undo2 } from "lucide-react"

interface ConfirmUndoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  paymentDate?: string
  amount?: string
}

export function ConfirmUndoDialog({ open, onOpenChange, onConfirm, paymentDate, amount }: ConfirmUndoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md" dir="rtl">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Undo2 className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">بازگردانی آخرین پرداخت</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-center space-y-2 text-muted-foreground text-sm">
              <span className="block">آیا مطمئن هستید که می‌خواهید آخرین پرداخت را بازگردانی کنید؟</span>
              {paymentDate && amount && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="block">
                    <span className="text-muted-foreground">تاریخ سررسید: </span>
                    <span className="font-medium">{paymentDate}</span>
                  </span>
                  <span className="block">
                    <span className="text-muted-foreground">مبلغ: </span>
                    <span className="font-medium">{amount} تومان</span>
                  </span>
                </div>
              )}
              <span className="block text-xs text-muted-foreground mt-2">این قسط به حالت پرداخت نشده برمی‌گردد.</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="flex-1">انصراف</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
            <Undo2 className="h-4 w-4 ml-2" />
            بازگردانی
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
