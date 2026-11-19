# Barbearia Daniel Nunes — Sistema MAGNUM

## 1. Descrição do Projeto
Sistema profissional completo (site + agenda online + gestão) para a **Barbearia Daniel Nunes**, em Dourados/MS. Proprietário e único profissional: **Daniel Nunes Araújo** (mais de 9 anos de experiência).

- Público-alvo: clientes da barbearia que agendam corte e barba.
- Valor central: agendamento online confiável, comunicação por WhatsApp e painel de gestão completo (agenda, caixa, indicadores, histórico).
- Base de referência: fluxo operacional aprovado nos projetos Hermano Cell e Dom Carvalho (mesma lógica, identidade própria e backend PRÓPRIO e isolado).
- Identidade: preto predominante, dourado elegante, branco e neutros. Fonte/tom masculino, responsivo, rápido.
- Fuso oficial de todas as operações: **America/Campo_Grande**.

## 2. Estrutura de Páginas
- `/` — Home pública (hero, serviços do backend, sobre Daniel, galeria, como agendar, horário/local, contato)
- `/agenda` — Reserva pública (SERVIÇO → DATA → HORÁRIO → EXTRAS → DADOS → REVISÃO → CONFIRMAÇÃO)
- `/admin` — Painel protegido (login próprio e-mail+senha)
- `/admin/...` — 9 abas: Agendamentos, Caixa, Indicadores, Histórico, Serviços, Disponibilidade, Bloqueios, Configurações, Minha senha
- `*` — Página 404

Home e /agenda compartilham navbar/rodapé. Admin tem navegação própria (mobile-first).

## 3. Funcionalidades Principais
- [x] Home data-driven (serviços ativos lidos do banco, iguais aos da agenda)
- [x] SEO natural para Dourados/MS + dados estruturados LocalBusiness
- [x] Motor de agendamento (janela 35 dias, grade 15 min, antecedência 15 min, buffer 0, profissional único)
- [x] Validação server-side na criação (booking-create) + proteção contra concorrência (SLOT_TAKEN)
- [x] Consulta de disponibilidade server-side (booking-availability) sem expor dados de clientes
- [x] Proteção de concorrência no banco (constraint EXCLUDE gist tstzrange em appointments)
- [x] Admin: Agendamentos (filtros, criar manual, ações de status, remarcar, pagamentos)
- [x] Admin: Caixa (entradas/saídas, métodos de pagamento, parcial, despesas, saldo)
- [x] Admin: Indicadores (previsto vs recebido)
- [x] Admin: Histórico (busca, filtros, eventos/reagendamentos)
- [x] Admin: Serviços CRUD (imagem, preço, duração, ordem, ativação) com snapshot histórico
- [x] Admin: Disponibilidade (dias/expediente/intervalos)
- [x] Admin: Bloqueios (horário/intervalo/dia)
- [x] Admin: Configurações (dados comerciais, fuso, booking_enabled, antecedência, buffer)
- [x] Admin: Minha senha
- [x] Reagendamento com histórico + tela de sucesso + WhatsApp (AVISAR O CLIENTE)
- [x] Eventos (created/rescheduled/status_changed/no_show) com idempotência + outbox
- [x] WhatsApp apenas via wa.me com texto pré-preenchido (envio manual)
- [x] Status financeiro nos cards de agendamento (a receber / parcial / pago) + botão de WhatsApp no Histórico
- [x] Upsell de produtos no agendamento (etapa EXTRAS opcional: pomada/gel) com total estimado em tempo real
- [x] Produtos reservados registrados no backend (preço snapshot) e exibidos no painel; remoção de adicional com trava financeira
- [x] Seção "Produtos e adicionais" na aba Serviços (CRUD, ordem, ativação, imagem)
- [x] Financeiro (caixa/pagamento) considera serviço + produtos reservados (valor devido no servidor)
- [x] Navegação automática entre etapas no agendador (scroll suave para o início da etapa ativa, respeitando header fixo e preferência de movimento reduzido)
- [x] Barra de total da etapa EXTRAS em fluxo (sem sobrepor produtos nem o botão Continuar) mantendo cálculo em tempo real
- [x] Preços reais atualizados: Corte masculino R$ 30, Barba R$ 30, Degradê navalhado R$ 35 (novo serviço, 25 min provisório)
- [x] Preço por dia da semana: combo Corte + barba R$ 55 de segunda a quarta, resolvido NO SERVIDOR pela data do atendimento (fuso America/Campo_Grande); combo oferecido apenas nos dias da promoção
- [x] Gestão de preço promocional por dia da semana na aba Serviços (preço normal, preço promocional, dias, ativar/desativar, "apenas nos dias da promoção")
- [x] Avisos diferenciados de preço (serviços com preço confirmado x produtos adicionais estimados)
- [x] Galeria com fotografias ilustrativas (bancos de imagem) + aviso honesto de imagens ilustrativas
- [x] Seção de localização com cabeçalho sempre visível (endereço + Abrir no Maps) e altura consistente
- [x] Rodapé compacto durante o agendamento na rota /agenda
- [x] Seção "Como agendar" atualizada com a experiência real (serviço → horário → adicionais → solicitação)
- [x] Pacotes promocionais de segunda a quarta: Corte + Barba, Pai e Filho e Dois Irmãos (R$ 55 cada), com disponibilidade validada NO SERVIDOR (pagamento não duplica — uma única venda por pacote)
- [x] Pacotes para duas pessoas (Pai e Filho / Dois Irmãos): campos dinâmicos de participantes na etapa Dados, persistidos em `appointments.participant_names`, exibidos no painel, na revisão, na tela de sucesso e na mensagem do WhatsApp; uma única reserva de 50 min (provisório)
- [x] Etapa de serviço em dois grupos (serviços individuais x promoções de segunda a quarta) e calendário restringindo às datas válidas para os pacotes
- [x] Aviso genérico de preços removido do agendador (mantida a identificação de estimativa apenas nos produtos adicionais)
- [x] Fotografia oficial do Daniel Nunes no hero da home (layout em duas colunas, sem sobrepor texto ao rosto)
- [x] Tela de sucesso com status pendente + botão "Avisar a barbearia pelo WhatsApp" (wa.me, envio manual)
- [x] Etapa EXTRAS reorganizada em dois grupos: **Produtos** (gel/pomada) e **Serviços adicionais** (Sobrancelha na navalha)
- [x] Serviço adicional "Sobrancelha na navalha" (R$ 15) com duração acrescentada ao atendimento (15 min provisório, editável no painel), validada no servidor
- [x] Preços dos produtos confirmados: Pomada modeladora R$ 30, Gel para cabelo R$ 20 (removida a identificação de "preço provisório" das interfaces)
- [x] RLS e isolamento total (nada compartilhado com Hermano/Dom Carvalho)
- [x] Bootstrap seguro do primeiro admin direto no /admin (token secreto ADMIN_SETUP_TOKEN + funções admin-setup/admin-setup-status + trava de concorrência no banco)
- [ ] Executar/validar o primeiro acesso do admin ponta a ponta (formulário pronto; falta rodar)
- [ ] Validar chamadas HTTP de booking-create / booking-availability em ambiente controlado

## 4. Modelo de Dados (Readdy Backend)
- **services**: name, description, price, duration_minutes, active, sort_order, image_url, promo_enabled, promo_price, promo_weekdays (int[] 0–6), promo_only (preço promocional por dia da semana; promo_only = disponível apenas nos dias da promoção), participants_count (1 = individual, 2 = pacote para duas pessoas), participant_labels (jsonb: rótulos dos campos de cada participante)
- **booking_products**: name, description, price, max_quantity, active, sort_order, image_url, kind ('product' = físico sem tempo / 'service' = adicional que acrescenta tempo), duration_minutes (minutos extras que o serviço adicional soma ao atendimento)
- **appointment_products**: appointment_id, product_id, snapshots (nome/preço), duration_minutes_snapshot (minutos extras congelados no momento da reserva), quantity, status (reserved/removed) — adicionais vinculados à reserva
- **business_hours**: weekday (0–6), is_open, open_time, close_time, break_start, break_end
- **blocked_slots**: block_date, start_time, end_time, reason (nulos = dia todo)
- **appointments**: service_id, start_at, end_at, client_name, client_phone, status, notes, snapshots (nome/preço/duração), participant_names (jsonb — nomes dos participantes dos pacotes), completed_at
- **appointment_events**: appointment_id, event_type, before_data, after_data, actor, idempotency_key
- **appointment_event_outbox**: payload, status (pendente de persistência durável)
- **settings** (registro único id=1): dados comerciais, timezone, booking_enabled (controlável pelo painel), buffer=0, min_advance_minutes=15, late_tolerance_minutes=15
- **cash_entries**: type (income/expense), amount, method, appointment_id, description, entry_date
- **admin_users**: user_id, email, role (owner) — identidades autorizadas
- **admin_invites**: email, token, used (somente se necessário)

RLS obrigatória. Público lê apenas serviços ativos, horários públicos e dados comerciais públicos. Nunca lê cliente/histórico/caixa. Apenas admin autenticado (via is_admin() checando user_id) acessa gestão.

## 5. Backend / Integrações
- Banco/Auth/Storage: **Readdy Backend** (conectado). Instância nova e isolada.
- Edge Functions: `booking-availability` (pública — só devolve horários livres), `booking-create` (pública, validada no servidor), `admin-booking` (JWT + admin_users), `admin-cash` (JWT + admin_users), `admin-setup-status` (pública — só informa se já existe admin), `admin-setup` (bootstrap único: valida ADMIN_SETUP_TOKEN, cria usuário e vincula owner via função transacional `bootstrap_admin`).
- WhatsApp: somente links wa.me (5567996647510), sem API/bot/automação.
- Google Agenda/Calendar: **NÃO implementar**.
- Resend / pagamentos online / Analytics / Shopify / Stripe: **fora do escopo**.

## 6. Plano de Fases de Desenvolvimento

### Fase 1: Fundação + Home pública
- Objetivo: identidade visual, tokens de estilo, schema do banco, navbar/rodapé e Home data-driven.
- Entregável: `/` completa lendo serviços reais do banco; schema e seeds (serviços provisórios, expediente, settings).

### Fase 2: Motor de agendamento público
- Objetivo: `/agenda` com fluxo completo e função `booking-create` validada no servidor + proteção de concorrência.
- Entregável: reserva pública funcionando (mantendo booking_enabled controlado).
- Status: **concluída (motor pronto; booking_enabled controlável — habilitado para demonstração)**

### Fase 3: Admin — painel completo (9 abas)
- Objetivo: acesso seguro ao `/admin` e todas as abas operacionais.
- Entregável: login/logout próprio, guarda por `admin_users`, Agendamentos, Caixa, Indicadores, Histórico, Serviços, Disponibilidade, Bloqueios, Configurações e Minha senha, com funções de backend autorizadas.
- Status: **concluída (falta apenas provisionar o primeiro admin para validar o login ponta a ponta)**

### Fase 4: Bootstrap do primeiro administrador
- Objetivo: permitir o primeiro acesso direto no `/admin`, sem criar usuário manualmente no painel de autenticação.
- Entregável: tela de configuração inicial (token secreto + e-mail + senha), funções `admin-setup-status` e `admin-setup`, segredo `ADMIN_SETUP_TOKEN` no backend e trava transacional (`bootstrap_admin`) contra duas tentativas simultâneas. Fluxo bloqueado permanentemente após o primeiro administrador.
- Status: **concluída (aguardando o primeiro acesso presencial para validar login ponta a ponta)**

### Fase 5: Provisionamento do admin + testes
- Objetivo: primeiro admin pelo método seguro, testes funcionais/segurança com dados fictícios, limpeza e relatório.
- Entregável: relatório objetivo de funcionalidades, testes, pendências e diferenças vs Hermano.

### Fase 6: Upsell de produtos + demonstração
- Objetivo: oferecer gel/pomada de forma natural durante o agendamento online e acompanhar no painel.
- Entregável: etapa EXTRAS (opcional) no fluxo público, tabelas `booking_products`/`appointment_products`, validação de preço no servidor (booking-create), exibição e remoção de adicionais no painel, e valor devido do caixa incluindo produtos reservados.
- Status: **código concluído; booking_enabled habilitado (true) para demonstração — pode ser desligado a qualquer momento em Configurações**

## Pendências / a confirmar com Daniel
- Preço normal do combo Corte + barba para quinta a sábado (fora da promoção): **PENDENTE**. Enquanto não confirmado, o combo é oferecido apenas de segunda a quarta; corte e barba individuais continuam disponíveis todos os dias.
- Duração do Degradê navalhado: usando **25 min provisoriamente** até confirmação do proprietário.
- Fotos reais dos trabalhos e da barbearia (galeria usa imagens ilustrativas).
- Confirmação para manter/habilitar agendamentos públicos: **HABILITADO (booking_enabled = true)** — desligar após a apresentação se necessário (Configurações).
- Produtos do upsell (gel/pomada): **preços confirmados** (Pomada R$ 30 / Gel R$ 20).
- Sobrancelha na navalha: preço confirmado (R$ 15); **duração de 15 min provisória**, editável no painel até confirmação do proprietário.
- Depilação nasal: não oferecida no momento — **não cadastrar** no catálogo público nem na etapa EXTRAS.
- Regra de preço por dia da semana: promoções ativas de **segunda a quarta** (R$ 55) — Corte + Barba, Pai e Filho e Dois Irmãos. De quinta a sábado ficam disponíveis apenas os serviços individuais.
- Duração dos pacotes Pai e Filho / Dois Irmãos: **50 min provisórios**, editável no painel até confirmação do proprietário.
- R$ 55 é o valor TOTAL de cada pacote (nunca por participante).