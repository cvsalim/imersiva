import { arrow } from './layout.mjs';

function contactForm(quote) {
  const prefix = quote ? 'quote' : 'contact';
  const field = (name, label, attributes) => `<div class="field"><label for="${prefix}-${name}">${label}</label><input id="${prefix}-${name}" name="${name}" ${attributes}></div>`;
  return `<section id="${quote ? 'orcamento' : 'fale-conosco'}" class="contact-panel" aria-labelledby="${prefix}-title">
    <form class="contact-form" action="/contato/enviar.php" method="post" accept-charset="UTF-8">
      <input type="hidden" name="type" value="${quote ? 'quote' : 'contact'}">
      <h2 id="${prefix}-title">${quote ? 'Conte um pouco sobre sua escola' : 'Como podemos ajudar?'}</h2>
      <p class="form-intro">Os campos com * são obrigatórios. Não envie dados pessoais de alunos.</p>
      <div class="form-grid">
        ${field('name', 'Seu nome *', 'autocomplete="name" required minlength="2" maxlength="120" placeholder="Como podemos te chamar?"')}
        ${quote ? field('school', 'Escola ou instituição *', 'autocomplete="organization" required minlength="2" maxlength="180" placeholder="Nome da escola"') : ''}
        ${field('email', 'E-mail *', 'type="email" autocomplete="email" required maxlength="254" placeholder="Seu e-mail de contato"')}
        ${field('phone', 'Telefone', 'type="tel" autocomplete="tel" maxlength="30" placeholder="DDD + número"')}
        ${quote ? `${field('city', 'Cidade *', 'autocomplete="address-level2" required minlength="2" maxlength="120" placeholder="Onde será a experiência?"')}
        <div class="field"><label for="${prefix}-audience">Etapa de ensino</label><select id="${prefix}-audience" name="audience"><option value="">Selecione, se já souber</option><option>Educação Infantil</option><option>Ensino Fundamental</option><option>Ensino Médio</option><option>Várias etapas</option><option>Outros</option><option>A definir</option></select></div>
        ${field('students', 'Estimativa de alunos', 'type="number" min="1" max="100000" placeholder="Ex.: 150"')}
        ${field('period', 'Período desejado', 'maxlength="120" placeholder="Ex.: maio de 2027 ou a definir"')}` : ''}
        <div class="field full"><label for="${prefix}-message">Sua mensagem *</label><textarea id="${prefix}-message" name="message" rows="5" required minlength="10" maxlength="4000" placeholder="${quote ? 'Conte o que você está imaginando para as turmas.' : 'Escreva sua dúvida ou conte como podemos ajudar.'}"></textarea></div>
        <div class="honey-field" aria-hidden="true"><label for="${prefix}-website">Deixe este campo vazio</label><input id="${prefix}-website" name="website" tabindex="-1" autocomplete="off"></div>
      </div>
      <p class="form-privacy">Usaremos seus dados para responder ${quote ? 'à solicitação e preparar uma proposta' : 'à sua mensagem'}. Saiba mais na <a href="/privacidade/">Política de Privacidade</a>.</p>
      <div class="form-status" role="status" aria-live="polite" tabindex="-1" hidden></div>
      <button class="button" type="submit">${quote ? 'Solicitar orçamento' : 'Enviar mensagem'} ${arrow}</button>
      <p class="form-help">${quote ? 'O envio não confirma reserva. Datas, programação e valores são combinados na proposta.' : 'Se preferir, escreva para <a href="mailto:contato@imersivabr.com">contato@imersivabr.com</a>.'}</p>
    </form>
  </section>`;
}

export const contactForms = `<div class="contact-forms"><nav class="contact-tabs" aria-label="Tipo de contato"><a id="tab-contact" href="#fale-conosco">Fale conosco</a><a id="tab-quote" href="#orcamento">Já peça orçamento</a></nav>${contactForm(false)}${contactForm(true)}</div>`;
