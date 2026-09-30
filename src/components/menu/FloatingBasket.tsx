"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ShoppingBasket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { faNumber, formatPrice } from "@/lib/format"
import { basketCount, basketTotal, useBasketStore } from "@/lib/basket-store"

interface FloatingBasketProps {
  onOpen: () => void
}

export default function FloatingBasket({ onOpen }: FloatingBasketProps) {
  const count = useBasketStore((state) => basketCount(state.lines))
  const total = useBasketStore((state) => basketTotal(state.lines))

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center sm:inset-x-auto sm:left-6 sm:justify-start"
        >
          <Button
            onClick={onOpen}
            aria-label="مشاهده سبد خرید"
            className="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-primary px-6 text-base text-primary-foreground shadow-2xl hover:bg-primary/90"
          >
            <ShoppingBasket className="h-5 w-5" aria-hidden />
            <span>{faNumber(count)} آیتم</span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" aria-hidden />
            <span className="font-extrabold">{formatPrice(total)}</span>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
