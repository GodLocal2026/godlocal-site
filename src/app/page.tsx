import Hero from "@/components/sections/Hero";
import TieredRouter from "@/components/sections/TieredRouter";
import Features from "@/components/sections/Features";
import Agents from "@/components/sections/Agents";
import IPhoneDemo from "@/components/sections/IPhoneDemo";
import CTA from "@/components/sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TieredRouter />
      <Features />
      <Agents />
      <IPhoneDemo />
      <CTA />
    </>
  );
}