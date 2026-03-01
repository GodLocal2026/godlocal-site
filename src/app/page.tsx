import Hero from "@/components/sections/Hero";
import Products from "@/components/sections/Products";
import TieredRouter from "@/components/sections/TieredRouter";
import Features from "@/components/sections/Features";
import Traction from "@/components/sections/Traction";
import Agents from "@/components/sections/Agents";
import CTA from "@/components/sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Products />
      <TieredRouter />
      <Features />
      <Traction />
      <Agents />
      <CTA />
    </>
  );
}
