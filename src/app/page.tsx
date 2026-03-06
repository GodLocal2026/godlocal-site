import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import TieredRouter from "@/components/sections/TieredRouter";
import Agents from "@/components/sections/Agents";
import HowItWorks from "@/components/sections/HowItWorks";
import IPhoneDemo from "@/components/sections/IPhoneDemo";
import CTA from "@/components/sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <TieredRouter />
      <Agents />
      <HowItWorks />
      <IPhoneDemo />
      <CTA />
    </>
  );
}
