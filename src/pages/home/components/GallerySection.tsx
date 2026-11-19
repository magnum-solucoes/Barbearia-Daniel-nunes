const IMAGES = [
  {
    url: 'https://readdy.ai/api/search-image?query=Cinematic%20close-up%20of%20a%20modern%20men%20haircut%20in%20a%20premium%20barbershop%20with%20black%20and%20gold%20tones%2C%20warm%20moody%20lighting%2C%20professional%20editorial%20photography%2C%20dark%20elegant%20background%2C%20high%20detail&width=900&height=900&seq=gallery-dn-cut-01&orientation=squarish',
    alt: 'Corte masculino moderno',
    className: 'col-span-2 row-span-2',
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Precision%20skin%20fade%20haircut%20detail%20seen%20from%20the%20side%2C%20barbershop%20clippers%2C%20black%20and%20gold%20premium%20atmosphere%2C%20warm%20dramatic%20lighting%2C%20editorial%20photography%2C%20dark%20background&width=700&height=700&seq=gallery-dn-fade-01&orientation=squarish',
    alt: 'Degradê bem executado',
    className: '',
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Barber%20finishing%20a%20beard%20line%20up%20with%20a%20straight%20razor%2C%20close%20up%2C%20premium%20barbershop%2C%20black%20and%20gold%20tones%2C%20warm%20cinematic%20lighting%2C%20editorial%20photography%2C%20dark%20background&width=700&height=700&seq=gallery-dn-razor-01&orientation=squarish',
    alt: 'Acabamento com navalha',
    className: '',
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Barber%20cutting%20a%20client%20hair%20with%20scissors%2C%20professional%20barbershop%20scene%2C%20black%20and%20gold%20tones%2C%20warm%20moody%20lighting%2C%20editorial%20photography%2C%20dark%20background&width=700&height=900&seq=gallery-dn-scissors-01&orientation=portrait',
    alt: 'Barbeiro trabalhando com tesoura',
    className: 'row-span-2',
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Beard%20trimming%20and%20modeling%20with%20a%20comb%20and%20trimmer%20in%20a%20luxury%20barbershop%2C%20black%20and%20gold%20tones%2C%20warm%20dramatic%20light%2C%20editorial%20photography%2C%20dark%20background&width=700&height=700&seq=gallery-dn-beard-01&orientation=squarish',
    alt: 'Modelagem de barba',
    className: '',
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Elegant%20dark%20barbershop%20interior%20with%20gold%20accents%2C%20vintage%20barber%20chair%20and%20warm%20ambient%20light%2C%20premium%20editorial%20photography%2C%20moody%20atmosphere%2C%20wide%20shot&width=900&height=700&seq=gallery-dn-interior-01&orientation=landscape',
    alt: 'Ambiente elegante de barbearia',
    className: 'col-span-2',
  },
];

export default function GallerySection() {
  return (
    <section id="galeria" className="w-full bg-background-100 py-16 md:py-24">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-accent-600">Galeria</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-foreground-950">Inspirações para o seu próximo visual</h2>
          <p className="mt-4 text-sm md:text-base text-foreground-600 leading-relaxed">
            Do corte clássico ao degradê, encontre inspirações para renovar seu estilo.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] md:auto-rows-[190px] gap-3 md:gap-4">
          {IMAGES.map((image) => (
            <figure key={image.url} className={`relative rounded-lg overflow-hidden border border-background-200 bg-foreground-950 group ${image.className}`}>
              <img
                src={image.url}
                alt={image.alt}
                title={`${image.alt} — Barbearia Daniel Nunes`}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground-950/70 via-transparent to-transparent" />
              <figcaption className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[11px] md:text-xs text-background-100">
                {image.alt}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-foreground-500">
          Imagens ilustrativas. Fotografias reais da barbearia poderão ser adicionadas posteriormente.
        </p>
      </div>
    </section>
  );
}