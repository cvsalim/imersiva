const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
if (toggle && nav) {
  document.documentElement.classList.add('js-menu');
  toggle.hidden = false;
  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    nav.classList.toggle('is-open', expanded);
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  const desktop = matchMedia('(min-width: 761px)');
  desktop.addEventListener('change', closeMenu);
}

const contactTabs = document.querySelector('.contact-tabs');
if (contactTabs) {
  const tabs = [...contactTabs.querySelectorAll('a')];
  const panels = tabs.map((tab) => document.querySelector(tab.hash));
  contactTabs.setAttribute('role', 'tablist');
  const activate = (index) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
  };
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      history.replaceState(null, '', tab.hash);
      activate(index);
    });
    tab.addEventListener('keydown', (event) => {
      const positions = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(event.key in positions)) return;
      event.preventDefault();
      const next = positions[event.key];
      history.replaceState(null, '', tabs[next].hash);
      activate(next);
      tabs[next].focus();
    });
  });
  const fromHash = () => activate(location.hash === '#orcamento' ? 1 : 0);
  addEventListener('hashchange', fromHash);
  fromHash();
}

document.querySelectorAll('.contact-form').forEach((form) => {
  const status = form.querySelector('.form-status');
  const submit = form.querySelector('button[type="submit"]');
  const originalLabel = submit.innerHTML;
  const showStatus = (message, kind) => {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = false;
    status.focus();
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || submit.disabled) return;
    submit.disabled = true;
    submit.textContent = 'Enviando…';
    status.hidden = true;
    let response;
    let result;
    try {
      response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
        signal: AbortSignal.timeout(25000),
      });
      result = await response.json();
    } catch (error) {
      console.error('Não foi possível confirmar o envio do formulário.', error);
      showStatus('Não foi possível confirmar o envio. Seus dados continuam no formulário. Antes de tentar novamente, você também pode falar com a equipe por e-mail ou WhatsApp.', 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalLabel;
    }
    if (!result) return;
    if (response.ok && result.ok === true) {
      form.reset();
      showStatus(result.message, 'success');
    } else {
      showStatus(typeof result.message === 'string' ? result.message : 'O servidor não confirmou o envio. Tente novamente ou use um dos canais de contato.', 'error');
    }
  });
});
