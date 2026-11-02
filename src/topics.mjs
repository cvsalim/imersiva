import { arrow, cta, closing } from './layout.mjs';

export const topics = [
  {
    slug: 'astronomia', name: 'Astronomia', title: 'Um olhar para o universo',
    description: 'Planetas, estrelas e novas perspectivas para explorar o céu.',
    caption: 'Curiosidade em outra dimensão',
    art: 'solar-art', illustration: '<span class="sun"></span><span class="planet"></span><span class="orbit-line"></span>',
    headline: 'O céu é o começo<br>de uma <span>grande descoberta.</span>',
    introduction: 'A astronomia convida a olhar para cima, fazer perguntas e descobrir que fazemos parte de um universo muito maior.',
    heading: 'Uma viagem pelo universo.<br>Sem sair da escola.',
    explanation: 'No planetário itinerante, a projeção hemisférica utiliza a superfície do domo para envolver o campo de visão. É uma forma de apresentar temas do universo com outras perspectivas e aproximar os alunos da astronomia.',
    possibilities: [
      ['Planetas e Sistema Solar', 'Um ponto de partida para conversar sobre a Terra, outros planetas e nosso lugar no espaço.'],
      ['Estrelas e o céu', 'Temas que convidam a observar o céu e ampliar as perguntas sobre o universo.'],
      ['Olhar científico', 'Possibilidades para conectar a curiosidade dos estudantes com projetos e conversas em sala.'],
    ],
  },
  {
    slug: 'nosso-planeta', name: 'Nosso planeta', title: 'Uma Terra de descobertas',
    description: 'Oceanos e vida na Terra: conexões para olhar o nosso mundo de um jeito novo.',
    caption: 'Ciência para ampliar horizontes',
    art: 'earth-art', illustration: '',
    headline: 'Um novo olhar<br>para o <span>nosso planeta.</span>',
    introduction: 'A viagem também pode ser para perto: oceanos e vida na Terra oferecem caminhos para descobrir o mundo em que vivemos.',
    heading: 'Um mundo de perguntas.<br>Uma Terra para conhecer.',
    explanation: 'O acervo apresentado pela IMERSIVA inclui temas sobre oceanos e vida na Terra. Durante o planejamento, conversamos com a escola para escolher conteúdos disponíveis que façam sentido para a idade e o contexto das turmas.',
    possibilities: [
      ['Oceanos', 'Uma possibilidade de explorar temas relacionados aos oceanos e ampliar a curiosidade sobre nosso planeta.'],
      ['Vida na Terra', 'Conteúdos que aproximam os estudantes de perguntas sobre a vida e o mundo ao nosso redor.'],
      ['Conexões com a escola', 'Uma programação que pode dialogar com temas e projetos já trabalhados pelos professores.'],
    ],
  },
  {
    slug: 'ciencia', name: 'Ciência', title: 'Perguntas que movem',
    description: 'Do corpo humano às descobertas científicas, aprender começa com uma pergunta.',
    caption: 'Aprender também é se encantar',
    art: 'science-art', illustration: '<span></span><i></i><b></b>',
    headline: 'Toda descoberta<br>começa com uma <span>pergunta.</span>',
    introduction: 'Observar, perguntar e querer entender um pouco mais: a ciência começa com a curiosidade sobre o que acontece ao nosso redor.',
    heading: 'Ciência para conhecer.<br>Curiosidade para continuar.',
    explanation: 'Além da astronomia, a apresentação comercial da IMERSIVA contempla conteúdos sobre o corpo humano e possibilidades de oficinas pedagógicas e experiências complementares. A composição da visita é combinada com a escola.',
    possibilities: [
      ['Corpo humano', 'Uma das áreas temáticas do acervo, com seleção de títulos conforme a turma e a disponibilidade.'],
      ['Oficinas pedagógicas', 'Possibilidades de aproximar conceitos científicos por meio de observação e atividades complementares.'],
      ['Outras perspectivas', 'Realidade virtual, exposição e acervo podem compor a proposta. Consulte a disponibilidade e a adequação para os alunos.'],
    ],
  },
];

export const topicCards = `<div class="topic-grid">${topics.map((topic) => `<article class="topic-card"><a class="topic-card-link" href="/${topic.slug}/" aria-labelledby="card-${topic.slug}-title"><div class="topic-art ${topic.art}" aria-hidden="true">${topic.illustration}</div><div class="card-content"><span class="tag">${topic.name}</span><h3 id="card-${topic.slug}-title">${topic.title}</h3><p>${topic.description}</p><span class="card-foot">${topic.caption} ${arrow}</span></div></a></article>`).join('')}</div>`;

export const topicPages = topics.map((topic) => ({
  slug: topic.slug,
  title: `${topic.name} para escolas`,
  description: `${topic.description} Conheça as possibilidades da IMERSIVA para escolas de São José dos Campos e do Vale do Paraíba.`,
  content: `<section class="page-hero container"><a class="text-link" href="/experiencia/">Voltar à experiência ${arrow}</a><p class="eyebrow">Explore · ${topic.name}</p><h1>${topic.headline}</h1><p>${topic.introduction}</p>${cta('Pedir orçamento para minha escola')}</section>
    <section class="split-section container"><div><p class="eyebrow">${topic.name} em outra perspectiva</p><h2>${topic.heading}</h2><p>${topic.explanation}</p><p>As imagens são ilustrativas. Os temas abaixo são possibilidades de abordagem, não uma lista de sessões garantidas. Títulos, formatos e disponibilidade são confirmados na proposta.</p></div><div class="topic-detail-art topic-art ${topic.art}" role="img" aria-label="Ilustração do tema ${topic.name}">${topic.illustration}</div></section>
    <section class="section container"><p class="eyebrow">Possibilidades para despertar curiosidade</p><h2>Novas perguntas.<br>Novos caminhos.</h2><div class="feature-grid">${topic.possibilities.map(([title, text]) => `<article class="feature-card"><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
    <section class="split-section container preparation"><div><p class="eyebrow">Para a realidade da sua escola</p><h2>Uma programação<br>planejada em conjunto.</h2><p>Conte quais turmas vão participar, o período desejado e os assuntos que a escola gostaria de explorar. A equipe conversa com vocês sobre conteúdo, linguagem e organização da visita.</p><a class="text-link" href="/para-escolas/">Veja como preparar sua escola ${arrow}</a></div><ul class="check-list"><li><strong>Faixa etária e contexto</strong><span>Consideramos as etapas de ensino e os projetos da escola no planejamento.</span></li><li><strong>Conteúdo e formato</strong><span>A seleção depende do acervo e das experiências disponíveis para a proposta.</span></li><li><strong>Estrutura e cuidados</strong><span>Espaço, acesso e necessidades de acompanhamento são avaliados antes da confirmação.</span></li></ul></section>
    <section class="section container"><div class="section-heading"><div><p class="eyebrow">Continue explorando</p><h2>Mais caminhos para descobrir.</h2></div><a class="text-link" href="/experiencia/">Conheça a experiência completa ${arrow}</a></div><div class="topic-navigation">${topics.filter((other) => other.slug !== topic.slug).map((other) => `<a class="feature-card" href="/${other.slug}/"><span class="eyebrow">${other.name}</span><h3>${other.title}</h3><p>${other.description}</p><span class="text-link">Explorar ${arrow}</span></a>`).join('')}</div></section>${closing}`,
}));
