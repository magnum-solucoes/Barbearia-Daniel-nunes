import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: 'ri-scissors-2-line',
    title: '1. Escolha seu serviço',
    text: 'Selecione corte, barba, degradê ou combo.',
  },
  {
    icon: 'ri-calendar-line',
    title: '2. Escolha seu horário',
    text: 'Veja os horários disponíveis na data desejada.',
  },
  {
    icon: 'ri-shopping-bag-3-line',
    title: '3. Personalize sua visita',
    text: 'Se quiser, reserve gel ou pomada e informe seus dados.',
  },
  {
    icon: 'ri-check-double-line',
    title: '4. Solicite seu agendamento',
    text: 'Revise as informações e aguarde a confirmação da barbearia.',
  },
];

export default function HowToBook() {
  return (
    <section className="w-full bg-background-50 py-16 md:py-24">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-accent-600">Como agendar</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-foreground-950">Agende em poucos passos</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, index) => (
            <div key={step.title} className="relative rounded-lg border border-background-200 bg-background-100 p-6">
              <span className="w-12 h-12 flex items-center justify-center rounded-md bg-primary-500 text-foreground-950 text-2xl">
                <i className={step.icon} />
              </span>
              <h3 className="mt-5 font-heading text-lg text-foreground-950">{step.title}</h3>
              <p className="mt-2 text-sm text-foreground-600 leading-relaxed">{step.text}</p>
              <span className="absolute top-5 right-5 text-4xl font-heading text-background-300">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-foreground-600 max-w-2xl mx-auto flex items-center justify-center gap-2">
          <i className="ri-price-tag-3-line text-accent-600" />
          Se houver uma promoção válida na data escolhida, o valor correto será aplicado automaticamente.
        </p>

        <div className="mt-8 text-center">
          <Link
            to="/agenda"
            className="whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm md:text-base font-semibold px-8 py-3.5 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <i className="ri-calendar-check-line" /> Ir para a agenda
          </Link>
        </div>
      </div>
    </section>
  );
}