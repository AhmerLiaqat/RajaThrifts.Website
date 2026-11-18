import { MessageCircle, PackageCheck, Search, ShoppingBag } from 'lucide-react'
import { Reveal } from '@/components/motion/Reveal'
import { HomeHeading } from '../components/HomeHeading'

const STEPS = [
  { icon: Search, title: 'Find your pair', text: 'Filter by size, brand, grade and price. Every listing shows real photos and any defects.' },
  { icon: ShoppingBag, title: 'Order in a minute', text: 'Check out as a guest, no account needed. Pay by bank transfer and upload the payment screenshot.' },
  { icon: MessageCircle, title: 'We confirm on WhatsApp', text: 'We verify your payment, confirm the order and answer any questions about fit or condition.' },
  { icon: PackageCheck, title: 'Delivered to your door', text: 'Packed with care and shipped nationwide with tracking until it reaches you.' },
]

/** HOW IT WORKS: four plain steps so first-time buyers know exactly what happens. */
export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-title" className="border-y border-line bg-surface-sunken py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeHeading
          id="how-title"
          eyebrow="How it works"
          title="Buying pre-loved,"
          highlight="made simple"
          center
          description="No guesswork and no surprises: you see exactly what you get before you order."
        />
        <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <li className="group relative h-full rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-glow">
                <span className="absolute top-5 right-5 text-4xl font-extrabold text-sand-100 tabular-nums transition-colors group-hover:text-gold-soft">
                  0{i + 1}
                </span>
                <span className="grid size-12 place-items-center rounded-xl bg-brand-navy text-gold shadow-[0_8px_18px_-8px_rgb(27_37_80/0.8)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
