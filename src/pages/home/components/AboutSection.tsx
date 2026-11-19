export default function AboutSection() {
  return (
    <section id="sobre" className="w-full bg-foreground-950 py-16 md:py-24">
      <div className="w-full px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="w-full aspect-[4/5] rounded-lg overflow-hidden ring-1 ring-primary-500/30">
            <img
              src="https://readdy.ai/api/search-image?query=Portrait%20of%20a%20professional%20barber%20working%20with%20concentration%20in%20a%20dark%20elegant%20barbershop%2C%20gold%20accent%20lighting%2C%20masculine%20editorial%20mood%2C%20cinematic%20shadows%2C%20premium%20atmosphere%20with%20black%20and%20gold%20tones&width=900&height=1125&seq=about-daniel-nunes-01&orientation=portrait"
              alt="Barbeiro trabalhando na Barbearia Daniel Nunes"
              title="Daniel Nunes — Barbeiro em Dourados/MS"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="absolute -bottom-6 -right-2 md:right-6 bg-primary-500 text-foreground-950 rounded-lg px-6 py-4">
            <p className="font-heading text-2xl md:text-3xl leading-none">9+</p>
            <p className="text-[11px] md:text-xs tracking-wide uppercase">anos de experiência</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-primary-300">Sobre</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-background-50">
            Daniel Nunes Araújo
          </h2>
          <p className="mt-5 text-sm md:text-base text-background-200 leading-relaxed">
            Barbeiro com mais de 9 anos de experiência, dedicado a cortes masculinos e barba com acabamento impecável.
            Cada atendimento é individual, com atenção ao estilo de cada cliente e à qualidade do resultado.
          </p>
          <p className="mt-4 text-sm md:text-base text-background-200 leading-relaxed">
            A Barbearia Daniel Nunes nasceu para oferecer um atendimento próximo, pontual e profissional em
            Jardim Itália, Dourados/MS.
          </p>

          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li className="flex items-center gap-3 rounded-lg border border-primary-500/20 bg-background-50/5 px-4 py-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-md bg-primary-500/15 text-primary-300 text-xl"><i className="ri-award-line" /></span>
              <span className="text-sm text-background-100">Atendimento profissional</span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-primary-500/20 bg-background-50/5 px-4 py-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-md bg-primary-500/15 text-primary-300 text-xl"><i className="ri-user-line" /></span>
              <span className="text-sm text-background-100">Profissional único e dedicado</span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-primary-500/20 bg-background-50/5 px-4 py-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-md bg-primary-500/15 text-primary-300 text-xl"><i className="ri-time-line" /></span>
              <span className="text-sm text-background-100">Agenda pontual e organizada</span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-primary-500/20 bg-background-50/5 px-4 py-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-md bg-primary-500/15 text-primary-300 text-xl"><i className="ri-scissors-2-line" /></span>
              <span className="text-sm text-background-100">Corte e barba com acabamento</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}