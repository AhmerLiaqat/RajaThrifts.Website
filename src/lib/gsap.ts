import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** Register GSAP plugins once. Always import gsap from here, not from 'gsap' directly. */
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
