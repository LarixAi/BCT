import { Link } from "react-router-dom";
import { ProductHeroComposition } from "@/components/hero/ProductHeroComposition";

export function Hero() {
  return (
    <section className="overflow-hidden bg-white">
      <div className="section-container pb-4 pt-14 text-center sm:pt-16 lg:pt-20">
        <h1 className="mx-auto max-w-4xl font-marketing text-4xl font-bold leading-[1.1] tracking-tight text-veyvio-deep sm:text-5xl lg:text-[3.25rem]">
          One connected platform for{" "}
          <span className="text-veyvio-lime">safer, clearer</span> transport operations
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-veyvio-muted">
          Bring bookings, drivers, vehicles, yard activity, maintenance and compliance together in
          one trusted system designed for passenger transport teams.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/demo" className="btn-primary">
            Book a demo
          </Link>
          <Link to="/platform" className="btn-secondary">
            Explore the platform
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-veyvio-muted">
          Built for community transport, accessible passenger services and professional fleet
          operations.
        </p>

        <ProductHeroComposition />
      </div>
    </section>
  );
}
