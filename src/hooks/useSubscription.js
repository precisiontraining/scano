import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export function useSubscription() {
  const [loading, setLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [hasFullScan, setHasFullScan] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('agent_subscriptions')
        .select('subscription_status, stripe_customer_id, subscription_id, current_period_end, full_scan_purchased, full_scan_purchased_at')
        .eq('user_id', session.user.id)
        .single()

      if (!cancelled) {
        if (!error && data) {
          setSubscriptionData(data)
          setIsSubscribed(data.subscription_status === 'active')
          setHasFullScan(data.full_scan_purchased === true)
        }
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { isSubscribed, hasFullScan, loading, subscriptionData }
}
