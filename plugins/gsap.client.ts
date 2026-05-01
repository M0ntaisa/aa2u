import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { Observer } from 'gsap/Observer'
import { CustomEase } from 'gsap/CustomEase'

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, Observer, CustomEase)

  return {
    provide: {
      gsap,
      ScrollTrigger,
      SplitText,
      Flip,
      Observer,
      CustomEase,
    },
  }
})
