import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Projects from "@/components/sections/Projects";
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
      <Projects />
      <TieredRouter />
      <Agents />
      <HowItWorks />
      <IPhoneDemo />
      <CTA />
    </>
  );
}
