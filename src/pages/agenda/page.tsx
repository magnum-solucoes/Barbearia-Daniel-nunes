import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteNavbar from '@/components/feature/SiteNavbar';
import SiteFooter from '@/components/feature/SiteFooter';
import { useSettings } from '@/hooks/useSettings';
import { useServices } from '@/hooks/useServices';
import { useProducts } from '@/hooks/useProducts';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useAvailability } from '@/hooks/useAvailability';
import { onlyDigits } from '@/lib/format';
import type { BookingProduct, Service } from '@/types/barber';
import {
  DEFAULT_TZ,
  MAX_ADVANCE_DAYS,
  addDays,
  createBooking,
  fetchAvailability,
  formatLongDate,
  makeIdempotencyKey,
  promoWeekdaysLabel,
  resolveServicePrice,
  todayInTz,
  type BookingBusiness,
  type BookingConfirmation,
} from '@/lib/booking';
import BookingStepper from './components/BookingStepper';
import StepService from './components/StepService';
import StepDate from './components/StepDate';
import StepTime from './components/StepTime';
import StepExtras from './components/StepExtras';
import StepDetails, { type DetailsValues } from './components/StepDetails';
import StepReview from './components/StepReview';
import StepSuccess from './components/StepSuccess';

const STEPS = ['Serviço', 'Data', 'Horário', 'Extras', 'Dados', 'Revisão', 'Confirmação'];
const SERVICE_STEP = 0;
const DATE_STEP = 1;
const TIME_STEP = 2;
const EXTRAS_STEP = 3;
const DETAILS_STEP = 4;
const REVIEW_STEP = 5;
const SUCCESS_STEP = 6;

export default function Agenda() {
  const { settings, loading: settingsLoading, error: settingsError, reload: reloadSettings } = useSettings();
  const { services, loading: servicesLoading, error: servicesError, reload: reloadServices } = useServices();
  const { products: bookingProducts, loading: productsLoading, error: productsError, reload: reloadProducts } = useProducts();
  const { hours, loading: hoursLoading } = useBusinessHours();

  const timeZone = settings?.timezone || DEFAULT_TZ;
  const bookingEnabled = settings?.booking_enabled ?? false;

  const [step, setStep] = useState(SERVICE_STEP);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [details, setDetails] = useState<DetailsValues>({ participants: [''], phone: '', notes: '' });
  const [errors, setErrors] = useState<{ participants?: (string | undefined)[]; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [business, setBusiness] = useState<BookingBusiness | null>(null);

  const today = useMemo(() => todayInTz(timeZone), [timeZone]);
  const maxDate = useMemo(() => addDays(today, MAX_ADVANCE_DAYS, timeZone), [today, timeZone]);

  // Extra minutes added by the selected additional services (e.g. eyebrow shaping).
  const addonMinutes = useMemo(
    () =>
      bookingProducts
        .filter((p) => extras[p.id])
        .reduce((sum, p) => sum + (Number(p.duration_minutes) || 0) * extras[p.id], 0),
    [bookingProducts, extras],
  );

  const availability = useAvailability(service?.id ?? null, date, addonMinutes);

  const stepAnchorRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  // Reposiciona a visualizacao no inicio da NOVA etapa (nao a cada selecao de campo).
  // Respeita a altura do header fixo (scroll-mt) e a preferencia de movimento reduzido.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    const raf = requestAnimationFrame(() => {
      if (step === SUCCESS_STEP) {
        window.scrollTo({ top: 0, behavior });
        return;
      }
      stepAnchorRef.current?.scrollIntoView({ behavior, block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const loadingMain = settingsLoading || servicesLoading || hoursLoading;
  const mainError = settingsError || servicesError;

  const selectService = useCallback((next: Service) => {
    setService(next);
    setDate(null);
    setTime(null);
    // Resize the participant fields to match the selected service (2 for packages).
    const count = Number(next.participants_count) || 1;
    setDetails((prev) => ({
      ...prev,
      participants: Array.from({ length: count }, (_, i) => prev.participants[i] || ''),
    }));
    setErrors({});
  }, []);

  const selectDate = useCallback((next: string) => {
    setDate(next);
    setTime(null);
  }, []);

  const toggleProduct = useCallback((product: BookingProduct) => {
    setExtras((prev) => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = 1;
      return next;
    });
  }, []);

  const selectedProducts = useMemo(
    () =>
      bookingProducts
        .filter((p) => extras[p.id])
        .map((p) => ({
          name: p.name,
          price: Number(p.price),
          quantity: extras[p.id],
          durationMinutes: Number(p.duration_minutes) || 0,
        })),
    [bookingProducts, extras],
  );

  // Preço do serviço resolvido pela DATA do atendimento (regra de promoção por dia).
  const resolvedPrice = useMemo(
    () => (service && date ? resolveServicePrice(service, date, timeZone) : null),
    [service, date, timeZone],
  );
  const servicePrice = resolvedPrice && resolvedPrice.available
    ? resolvedPrice.price
    : Number(service?.price) || 0;

  const datePromoNote = useMemo(() => {
    if (!service || !service.promo_enabled || service.promo_price == null) return null;
    const label = promoWeekdaysLabel(service.promo_weekdays);
    if (!label) return null;
    return service.promo_only
      ? `Este serviço está disponível apenas de ${label} — preço promocional.`
      : `Promoção de ${label}: o valor promocional é aplicado automaticamente nessas datas.`;
  }, [service]);

  const changeParticipant = useCallback((index: number, value: string) => {
    setDetails((prev) => {
      const arr = prev.participants.slice();
      arr[index] = value;
      return { ...prev, participants: arr };
    });
    setErrors((prev) => {
      if (!prev.participants) return prev;
      const arr = prev.participants.slice();
      arr[index] = undefined;
      return { ...prev, participants: arr };
    });
  }, []);

  const changePhone = useCallback((value: string) => {
    setDetails((prev) => ({ ...prev, phone: value }));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const changeNotes = useCallback((value: string) => {
    setDetails((prev) => ({ ...prev, notes: value }));
  }, []);

  const participantLabels = useMemo(() => {
    const count = Number(service?.participants_count) || 1;
    const labels = service?.participant_labels || [];
    return Array.from({ length: count }, (_, i) => labels[i] || (i === 0 ? 'Nome completo' : `Participante ${i + 1}`));
  }, [service]);

  const validateDetails = useCallback((): boolean => {
    const nextErrors: { participants?: (string | undefined)[]; phone?: string } = {};
    const participantErrors = details.participants.map((name) =>
      name.trim().length < 2 ? 'Informe o nome completo.' : undefined,
    );
    if (participantErrors.some(Boolean)) nextErrors.participants = participantErrors;
    const digits = onlyDigits(details.phone);
    if (digits.length < 10 || digits.length > 11) nextErrors.phone = 'Informe um WhatsApp válido com DDD.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [details]);

  const canProceed = useMemo(() => {
    if (step === SERVICE_STEP) return Boolean(service);
    if (step === DATE_STEP) return Boolean(date);
    if (step === TIME_STEP) return Boolean(time);
    if (step === DETAILS_STEP) return true;
    return true;
  }, [step, service, date, time]);

  const goNext = useCallback(async () => {
    setSubmitError(null);
    if (step === EXTRAS_STEP) {
      // Re-validate the chosen slot now that additional services may extend it.
      if (addonMinutes > 0 && service && date && time) {
        const res = await fetchAvailability(service.id, date, addonMinutes);
        if (res.ok && !res.data.slots.includes(time)) {
          setSubmitError(
            'O horário escolhido não comporta a duração extra deste adicional. Por favor, escolha outro horário.',
          );
          setTime(null);
          availability.reload();
          setStep(TIME_STEP);
          return;
        }
      }
      setStep(DETAILS_STEP);
      return;
    }
    if (step === DETAILS_STEP) {
      if (!validateDetails()) return;
      setIdempotencyKey(makeIdempotencyKey());
      setStep(REVIEW_STEP);
      return;
    }
    if (step === REVIEW_STEP) return;
    if (!canProceed) return;
    setStep((s) => Math.min(s + 1, REVIEW_STEP));
  }, [step, canProceed, validateDetails, addonMinutes, service, date, time, availability]);

  const goBack = useCallback(() => {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, SERVICE_STEP));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!service || !date || !time || !bookingEnabled) return;
    setSubmitting(true);
    setSubmitError(null);

    const participantNames = details.participants.map((p) => p.trim()).filter((p) => p.length > 0);
    const result = await createBooking({
      serviceId: service.id,
      date,
      time,
      clientName: participantNames[0] || '',
      clientPhone: onlyDigits(details.phone),
      notes: details.notes.trim(),
      idempotencyKey,
      products: Object.entries(extras).map(([product_id, quantity]) => ({ product_id, quantity })),
      participants: participantNames.length > 1 ? participantNames : [],
    });

    setSubmitting(false);

    if (result.ok) {
      setConfirmation(result.appointment);
      setBusiness(result.business);
      setStep(SUCCESS_STEP);
      return;
    }

    if (result.code === 'SLOT_TAKEN' || result.code === 'BLOCKED' || result.code === 'OUT_OF_HOURS' || result.code === 'ON_BREAK') {
      setSubmitError(result.message);
      setTime(null);
      availability.reload();
      setStep(TIME_STEP);
      return;
    }

    setSubmitError(result.message);
  }, [service, date, time, bookingEnabled, details, idempotencyKey, availability, extras]);

  const renderStep = () => {
    if (step === SERVICE_STEP) {
      return <StepService services={services} selectedId={service?.id ?? null} onSelect={selectService} />;
    }
    if (step === DATE_STEP) {
      return (
        <StepDate
          timeZone={timeZone}
          hours={hours}
          minDate={today}
          maxDate={maxDate}
          selectedDate={date}
          onSelect={selectDate}
          promoNote={datePromoNote}
          allowedWeekdays={service?.promo_only ? service.promo_weekdays : null}
        />
      );
    }
    if (step === TIME_STEP) {
      return (
        <StepTime
          dateLabel={date ? formatLongDate(date, timeZone) : ''}
          durationMinutes={(service?.duration_minutes ?? 0) + addonMinutes}
          loading={availability.loading}
          error={availability.error}
          closed={availability.closed}
          reason={availability.reason}
          slots={availability.slots}
          selectedTime={time}
          onSelect={setTime}
          onReload={availability.reload}
        />
      );
    }
    if (step === EXTRAS_STEP && service) {
      return (
        <StepExtras
          service={service}
          servicePrice={servicePrice}
          products={bookingProducts}
          loading={productsLoading}
          error={productsError}
          selected={extras}
          onToggle={toggleProduct}
          onReload={reloadProducts}
        />
      );
    }
    if (step === DETAILS_STEP) {
      return (
        <StepDetails
          values={details}
          errors={errors}
          labels={participantLabels}
          onParticipantChange={changeParticipant}
          onPhoneChange={changePhone}
          onNotesChange={changeNotes}
        />
      );
    }
    if (step === REVIEW_STEP && service && date && time) {
      return (
        <StepReview
          service={service}
          servicePrice={servicePrice}
          date={date}
          time={time}
          timeZone={timeZone}
          values={details}
          participantLabels={participantLabels}
          products={selectedProducts}
          address={settings?.address ?? undefined}
        />
      );
    }
    if (step === SUCCESS_STEP && confirmation) {
      return (
        <StepSuccess
          appointment={confirmation}
          business={business || { name: settings?.business_name ?? null, address: settings?.address ?? null, whatsapp: settings?.whatsapp ?? null }}
          timeZone={timeZone}
        />
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-background-50 min-h-screen flex flex-col">
      <SiteNavbar overlay={false} />

      <main className="flex-1 w-full">
        <div className="w-full px-4 md:px-8 pt-24 md:pt-28 pb-20">
          {step !== SUCCESS_STEP && (
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-primary-700">
                <i className="ri-calendar-line" /> Agenda online
              </span>
              <h1 className="mt-5 font-heading text-3xl md:text-5xl text-foreground-950">Agende seu horário</h1>
              <p className="mt-3 text-sm md:text-base text-foreground-600 max-w-2xl mx-auto">
                Barbearia Daniel Nunes · Rua General Osório, 695 · Jardim Itália, Dourados/MS
              </p>
            </div>
          )}

          {mainError ? (
            <div className="max-w-xl mx-auto rounded-lg border border-accent-200 bg-accent-50 p-6 text-center">
              <i className="ri-error-warning-line text-2xl text-accent-700" />
              <p className="mt-2 text-sm text-accent-800">{mainError}</p>
              <button
                type="button"
                onClick={() => {
                  reloadSettings();
                  reloadServices();
                }}
                className="mt-4 whitespace-nowrap rounded-md bg-foreground-950 text-background-50 text-sm font-semibold px-5 py-2.5 inline-flex items-center gap-2"
              >
                <i className="ri-refresh-line" /> Tentar novamente
              </button>
            </div>
          ) : loadingMain ? (
            <div className="flex flex-col items-center justify-center py-20 text-foreground-600">
              <i className="ri-loader-4-line text-2xl animate-spin" />
              <p className="mt-3 text-sm">Carregando a agenda...</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {step !== SUCCESS_STEP && (
                <div ref={stepAnchorRef} className="mb-6 scroll-mt-24">
                  <BookingStepper steps={STEPS} current={step} />
                </div>
              )}

              {step !== SUCCESS_STEP && !bookingEnabled && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3.5">
                  <span className="w-5 h-5 flex items-center justify-center text-accent-700 mt-0.5">
                    <i className="ri-lock-line" />
                  </span>
                  <p className="text-sm text-accent-800 leading-relaxed">
                    As reservas online estão temporariamente desativadas. Você pode explorar a agenda, mas a
                    confirmação só será liberada após a validação dos valores finais dos serviços.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-background-200 bg-background-50 p-4 md:p-8">{renderStep()}</div>

              {submitError && (
                <div className="mt-5 flex items-start gap-3 rounded-md border border-accent-200 bg-accent-50 px-4 py-3">
                  <span className="w-5 h-5 flex items-center justify-center text-accent-700 mt-0.5">
                    <i className="ri-error-warning-line" />
                  </span>
                  <p className="text-sm text-accent-800">{submitError}</p>
                </div>
              )}

              {step !== SUCCESS_STEP && (
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {step > SERVICE_STEP ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="whitespace-nowrap rounded-md border border-background-300 bg-background-50 hover:border-primary-400 text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
                    >
                      <i className="ri-arrow-left-line" /> Voltar
                    </button>
                  ) : (
                    <Link
                      to="/"
                      className="whitespace-nowrap rounded-md border border-background-300 bg-background-50 hover:border-primary-400 text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
                    >
                      <i className="ri-arrow-left-line" /> Voltar para a home
                    </Link>
                  )}

                  {step === REVIEW_STEP ? (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting || !bookingEnabled}
                      className="whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <i className="ri-loader-4-line animate-spin" /> Confirmando...
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line" /> Confirmar agendamento
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canProceed}
                      className="whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
                    >
                      {step === EXTRAS_STEP && selectedProducts.length === 0
                        ? 'Continuar sem adicionar'
                        : 'Continuar'}{' '}
                      <i className="ri-arrow-right-line" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter compact={step !== SUCCESS_STEP} />
    </div>
  );
}