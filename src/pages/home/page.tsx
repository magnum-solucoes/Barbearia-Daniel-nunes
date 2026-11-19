import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SiteNavbar from '@/components/feature/SiteNavbar';
import SiteFooter from '@/components/feature/SiteFooter';
import HomeHero from './components/HomeHero';
import ServicesSection from './components/ServicesSection';
import AboutSection from './components/AboutSection';
import GallerySection from './components/GallerySection';
import HowToBook from './components/HowToBook';
import HoursLocation from './components/HoursLocation';
import ContactCta from './components/ContactCta';

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        window.requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="w-full bg-background-50">
      <SiteNavbar overlay />
      <main>
        <HomeHero />
        <ServicesSection />
        <AboutSection />
        <GallerySection />
        <HowToBook />
        <HoursLocation />
        <ContactCta />
      </main>
      <SiteFooter />
    </div>
  );
}