"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp } from "lucide-react"

/**
 * Floating "scroll back to top" button. Appears once the user has scrolled
 * past the hero (~80% of viewport height) and smoothly returns to the top on
 * click. Stays clear of the FloatingBasket (right side on desktop, hidden
 * when basket is visible on mobile to avoid overlap).
 *
 * Pure client-side, no props.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      // Appear after scrolling 1 viewport height (e.g. past the hero).
      setVisible(window.scrollY > window.innerHeight * 0.9)
    }
    onScroll() // Initialize in case we mounted below the fold
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" })

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollTop}
          aria-label="بازگشت به بالا"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          // Position: bottom-right on desktop, bottom-right on mobile too
          // (FloatingBasket is bottom-center on mobile, bottom-left on desktop,
          // so we don't collide).
          className="fixed bottom-4 right-4 z-30 flex size-12 items-center justify-center rounded-full border border-border/60 bg-background/85 text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-6 sm:right-6"
        >
          <ArrowUp className="size-5" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
