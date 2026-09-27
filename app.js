const INITIAL = {
  updated: "26/09/2026",
  period: "2026-09",
  income: 1535,
  expenses: 1385,
  contribution: 150,
  balance: 0,
  invested: 31835.24,
  portfolio: 31835.24,
  grossBalance: 31896.29,
  capitalGain: 61.05,
  dividends: 2585.83,
  emergencyReserve: 16620,
  goal: {
    name: "R$ 100 mil investidos até os 24 anos",
    target: 100000,
    current: 31835.24,
    remaining: 68164.76,
    progress: 0.3183524,
    deadline: "2029-05-31",
    monthly: 1624.49
  },
  categories: [
    { name: "Moradia", value: 1000 },
    { name: "Alimentação", value: 0 },
    { name: "Transporte", value: 210 },
    { name: "Contas", value: 50 },
    { name: "Saúde", value: 100 },
    { name: "Lazer", value: 0 },
    { name: "Compras", value: 0 },
    { name: "Assinaturas", value: 0 },
    { name: "Outros", value: 25 }
  ],
  assets: [
    { name: "Caixa", share: 0.22 },
    { name: "REITs", share: 0.25 },
    { name: "Ações BR", share: 0.25 },
    { name: "Criptomoedas", share: 0.03 },
    { name: "Exterior", share: 0.25 }
  ],
  tickers: [
    "GGRC11", "XPML11", "CPTS11", "GARE11", "VGHF11", "NEWL11", "HGLG11", "BTLG11",
    "TAEE11", "KLBN11", "KLBN4", "ITSA4", "CMIG4", "SAPR4", "BBAS3", "CXSE3", "AURE3",
    "BTC", "ETH", "IVVB11", "NASD11", "C6 CDB"
  ],
  retirement: {
    age: 22,
    retireAge: 24,
    invested: 32000,
    monthly: 2326.93,
    rate: 0.10,
    target: 100000,
    passive: 1000,
    passiveRate: 0.01
  },
  history: {
    income: [7717.91, 4760, 6665, 1530, 1535, 1535, 3573.36, 290, 250, null, null, null],
    expenses: [198, 220, 1686, 473.5, 1440, 824, 170, 1917, 145, null, null, null],
    labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  },
  historyYears: { income: 2026, expenses: 2025 },
  transactions: [
    { description: "Salário líquido (Janderson)", category: "Salário/Renda", type: "RECEITA", value: 1535, status: "RECEBIDO", date: null },
    { description: "Moradia (aluguel/financiamento)", category: "Moradia", type: "DESPESA", value: 1000, status: "PENDENTE", date: null },
    { description: "Plano de saúde", category: "Saúde", type: "DESPESA", value: 100, status: "PENDENTE", date: null },
    { description: "Combustível", category: "Transporte", type: "DESPESA", value: 150, status: "PENDENTE", date: null },
    { description: "Telefonia/celular", category: "Contas", type: "DESPESA", value: 50, status: "PENDENTE", date: null },
    { description: "Óleo da moto", category: "Transporte", type: "DESPESA", value: 60, status: "PENDENTE", date: null },
    { description: "Corte de cabelo", category: "Outros", type: "DESPESA", value: 25, status: "PENDENTE", date: null }
  ],
  rentability: 0.001917686,
  annualRentability: 0.083143
};

let data = structuredClone(INITIAL);
let selectedMonth = "9";
let selectedYear = "2026";
let selectedType = "all";
let selectedCategory = "all";
let redrawRetirementChart = null;
let cashflowHoverIdx = -1;
let cashflowBars = [];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const money = n => n == null || !Number.isFinite(Number(n)) ? "Dados não disponíveis" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = n => n == null || !Number.isFinite(Number(n)) ? "Dados não disponíveis" : (Number(n) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
const val = (n, suffix = "") => n == null || !Number.isFinite(Number(n)) ? "Dados não disponíveis" : Number(n).toLocaleString("pt-BR") + suffix;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const total = x => x.reduce((a, b) => a + (Number(b.value) || 0), 0);

function showToast(message, type = 'info') {
  const container = $('#toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span style="font-weight:700;color:${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--coral)' : 'var(--blue-light)'}">${icon}</span><span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getOrCreateTooltip(chartWrap) {
  let tip = chartWrap.querySelector('.chart-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    chartWrap.appendChild(tip);
  }
  return tip;
}

function calculateHealthScore() {
  const p = periodData();
  let score = 50;
  if (p.income && p.income > 0) {
    const expenses = p.expenses || 0;
    const contribution = p.contribution || 0;
    const balance = p.income - expenses - contribution;

    const savingRate = balance / p.income;
    if (savingRate >= 0.20) score += 25;
    else if (savingRate >= 0.10) score += 15;
    else if (savingRate >= 0) score += 5;
    else score -= 15;

    const investRate = contribution / p.income;
    if (investRate >= 0.20) score += 25;
    else if (investRate >= 0.10) score += 18;
    else if (investRate > 0) score += 10;

    const expRate = expenses / p.income;
    if (expRate <= 0.60) score += 20;
    else if (expRate <= 0.80) score += 10;
    else if (expRate > 1.0) score -= 20;

    const cashShare = (data.assets.find(a => a.name === 'Caixa')?.share) || 0.22;
    const cashMonths = expenses > 0 ? (data.portfolio * cashShare) / expenses : 0;
    if (cashMonths >= 6) score += 15;
    else if (cashMonths >= 3) score += 8;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

function updateHealthScoreBadge() {
  const scoreEl = $('#healthScore');
  const dotEl = $('#scoreDot');
  if (!scoreEl) return;
  const score = calculateHealthScore();
  let label = 'Excelente';
  let color = 'var(--green)';
  if (score < 40) { label = 'Atenção'; color = 'var(--coral)'; }
  else if (score < 70) { label = 'Moderada'; color = 'var(--gold)'; }
  else if (score < 85) { label = 'Boa'; color = '#82b9ff'; }

  scoreEl.textContent = `${score}/100 (${label})`;
  if (dotEl) {
    dotEl.style.background = color;
    dotEl.style.boxShadow = `0 0 6px ${color}`;
  }
}

function filtered() {
  const q = ($('#txSearch')?.value || '').toLowerCase().trim();
  return data.transactions.filter(t => {
    const matchesType = selectedType === "all" || t.type.toLowerCase().includes(selectedType);
    const matchesCat = selectedCategory === "all" || t.category === selectedCategory;
    if (!matchesType || !matchesCat) return false;
    if (!q) return true;
    return (
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q)) ||
      String(t.value).includes(q)
    );
  });
}

function metric(icon, label, value, desc, color, comparison = 'Mês anterior: dados não disponíveis') {
  return `<article class="metric" style="--accent:${color}"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-desc">${desc}</div><div class="metric-compare">${comparison}</div></article>`;
}

function periodData(year = Number(selectedYear), month = Number(selectedMonth)) {
  // If viewing the budget month (typically September 2026)
  if (year === Number(data.period.slice(0, 4)) && month === Number(data.period.slice(5, 7))) {
    return {
      income: data.income,
      expenses: data.expenses,
      contribution: data.contribution,
      balance: data.balance,
      categories: data.categories,
      categoryAvailable: true,
      source: 'orçamento mensal detalhado'
    };
  }

  // Look in the monthly history tracking table
  if (month >= 1 && month <= 12) {
    const mIdx = month - 1;
    const hInc = data.history.income[mIdx];
    const hExp = data.history.expenses[mIdx];

    if (hInc != null || hExp != null) {
      const inc = hInc ?? null;
      const exp = hExp ?? null;
      const bal = inc != null && exp != null ? inc - exp : (inc ?? (exp != null ? -exp : null));
      return {
        income: inc,
        expenses: exp,
        contribution: null,
        balance: bal,
        categories: [],
        categoryAvailable: false,
        source: 'histórico mensal registrado'
      };
    }
  }

  return {
    income: null,
    expenses: null,
    contribution: null,
    balance: null,
    categories: [],
    categoryAvailable: false,
    source: null
  };
}

function previousPeriod() {
  let y = Number(selectedYear), m = Number(selectedMonth) - 1;
  if (m < 1) { m = 12; y--; }
  return periodData(y, m);
}

function comparison(current, previous, sameSource) {
  if (!sameSource || current == null || previous == null) return 'Mês anterior: dados não disponíveis';
  const diff = current - previous;
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '•';
  const ratio = previous === 0 ? '' : ` · ${Math.abs(diff / previous * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return `${arrow} ${money(Math.abs(diff))}${ratio} vs. mês anterior`;
}

function renderMetrics() {
  const p = periodData(), prev = previousPeriod(), same = !!(p.source && prev.source);
  let inc = p.income, exp = p.expenses, inv = p.contribution;
  if (selectedCategory !== 'all') exp = p.categoryAvailable ? (p.categories.find(x => x.name === selectedCategory)?.value ?? 0) : null;
  if (selectedType === 'receita') { exp = null; inv = null; }
  else if (selectedType === 'despesa') { inc = null; inv = null; }
  else if (selectedType === 'investimento') { inc = null; exp = null; }

  const result = inc != null && exp != null ? inc - exp : null;
  const balance = result != null && inv != null ? result - inv : result;
  const saving = balance != null && inc ? balance / inc : null;
  const investRate = inc != null && inv != null && inc ? inv / inc : null;

  const metrics = [
    metric('◈', 'Patrimônio total', money(data.portfolio), `Última posição · ${data.updated}`, '#81e0b2'),
    metric('◉', 'Saldo do mês', money(balance), p.contribution != null ? 'Renda menos despesas e aporte' : 'Receita menos despesas', '#82b9ff', comparison(balance, prev.balance, same)),
    metric('↗', 'Receita do mês', money(inc), p.source || 'Dados não disponíveis', '#81e0b2', comparison(inc, prev.income, same)),
    metric('⌁', 'Despesas do mês', money(exp), p.source || 'Dados não disponíveis', '#ff8d83', comparison(exp, prev.expenses, same)),
    metric('＋', 'Investimentos do mês', money(inv), inv != null ? 'Aporte orçado' : 'Sem aporte registrado', '#82b9ff', comparison(inv, prev.contribution, same)),
    metric('±', 'Resultado do mês', money(result), 'Receitas menos despesas', '#f2cb7c', comparison(result, prev.income != null && prev.expenses != null ? prev.income - prev.expenses : null, same)),
    metric('▥', 'Total investido', money(data.invested), `Última posição · ${data.updated}`, '#81e0b2'),
    metric('◎', 'Metas financeiras', pct(data.goal.progress), 'Meta principal · R$ 100 mil', '#82b9ff'),
    metric('⌂', 'Taxa de economia', pct(saving), 'Após despesas e aportes', '#81e0b2'),
    metric('◌', 'Taxa investida', pct(investRate), 'Aporte ÷ renda do mês', '#82b9ff')
  ];
  $('#metrics').innerHTML = metrics.join('');
}

const palette = ['#81e0b2', '#82b9ff', '#f2cb7c', '#ff8d83', '#bd9dfc', '#66d6cf', '#eaa972', '#98adba', '#d1d875'];

function renderCategories() {
  const p = periodData();
  if (!p.categoryAvailable || selectedType === 'receita' || selectedType === 'investimento') {
    $('#categoryChart').innerHTML = '<div class="empty">Detalhamento por categorias disponível no mês orçado (Setembro/2026). Para os outros meses, a planilha consolidou apenas os totais históricos.</div>';
    return;
  }
  const cats = p.categories.filter(x => x.value > 0 && (selectedCategory === 'all' || x.name === selectedCategory)).sort((a, b) => b.value - a.value);
  const sum = total(cats);
  if (!sum) {
    $('#categoryChart').innerHTML = '<div class="empty">Dados não disponíveis para esta seleção.</div>';
    return;
  }
  let acc = 0;
  const stops = cats.map((x, i) => {
    const start = acc;
    acc += x.value / sum * 100;
    return `${palette[i % palette.length]} ${start}% ${acc}%`;
  }).join(',');

  $('#categoryChart').innerHTML = `
    <div class="donut" style="background:conic-gradient(${stops})">
      <div class="donut-total">${money(sum)}<small>despesas</small></div>
    </div>
    <div class="cat-legend">
      ${cats.slice(0, 8).map((c, i) => `
        <div class="cat-row">
          <i class="cat-color" style="background:${palette[i % palette.length]}"></i>
          <span>${esc(c.name)}</span>
          <strong>${money(c.value)}</strong>
        </div>
      `).join('')}
    </div>`;
}

function drawChart() {
  const canvas = $('#cashflowChart');
  if (!canvas) return;
  const wrap = canvas.closest('.chart-wrap');
  const tip = wrap ? getOrCreateTooltip(wrap) : null;
  const ctx = canvas.getContext('2d'), rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width, h = rect.height, pad = { l: 42, r: 8, t: 14, b: 25 }, p = periodData();
  let vals = [p.income, p.expenses, p.contribution];
  if (selectedCategory !== 'all') vals[1] = p.categoryAvailable ? (p.categories.find(x => x.name === selectedCategory)?.value ?? 0) : null;
  if (selectedType === 'receita') vals = [p.income, null, null];
  if (selectedType === 'despesa') vals = [null, p.expenses, null];
  if (selectedType === 'investimento') vals = [null, null, p.contribution];

  ctx.clearRect(0, 0, w, h);
  const finite = vals.filter(Number.isFinite);
  if (!finite.length) {
    ctx.fillStyle = '#96a6af';
    ctx.textAlign = 'center';
    ctx.font = '12px DM Sans';
    ctx.fillText('Dados não disponíveis para este período', w / 2, h / 2);
    if (tip) tip.classList.remove('visible');
    return;
  }
  const max = Math.max(1, ...finite) * 1.2;
  const colors = ['#81e0b2', '#ff8d83', '#82b9ff'];
  const labels = ['Receita', 'Despesas', 'Aporte'];
  ctx.font = '10px DM Sans';

  for (let j = 0; j < 4; j++) {
    const y = pad.t + (h - pad.t - pad.b) * j / 3;
    ctx.strokeStyle = '#28343c';
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = '#82919a';
    ctx.textAlign = 'right';
    ctx.fillText(money(max * (1 - j / 3)).replace('R$ ', ''), pad.l - 5, y + 3);
  }

  const bw = Math.min(55, (w - pad.l - pad.r) / 6);
  cashflowBars = [];

  vals.forEach((v, i) => {
    const x = pad.l + (w - pad.l - pad.r) * (i * 2 + 1) / 6 - bw / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a99a2';
    ctx.fillText(labels[i], x + bw / 2, h - 6);
    if (v == null) return;
    const barh = (h - pad.t - pad.b) * v / max;
    const y = h - pad.b - barh;

    const isHovered = (cashflowHoverIdx === i);
    cashflowBars.push({ idx: i, x, y, w: bw, h: barh, label: labels[i], value: v, color: colors[i] });

    ctx.fillStyle = colors[i];
    ctx.globalAlpha = isHovered ? 1 : 0.85;
    roundRect(ctx, x, y, bw, barh, 5);
    ctx.globalAlpha = 1;

    if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = isHovered ? '#ffffff' : '#c3d0d5';
    ctx.font = isHovered ? 'bold 11px DM Sans' : '10px DM Sans';
    ctx.fillText(money(v), x + bw / 2, Math.max(10, y - 6));
    ctx.font = '10px DM Sans';
  });

  if (!canvas._hasHoverEvents) {
    canvas._hasHoverEvents = true;
    canvas.addEventListener('mousemove', e => {
      const cr = canvas.getBoundingClientRect();
      const mx = e.clientX - cr.left;
      const my = e.clientY - cr.top;
      const hovered = cashflowBars.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y - 20 && my <= b.y + b.h + 10);
      if (hovered) {
        if (cashflowHoverIdx !== hovered.idx) {
          cashflowHoverIdx = hovered.idx;
          drawChart();
        }
        if (tip) {
          const ratio = p.income && hovered.idx !== 0 ? ` (${((hovered.value / p.income) * 100).toFixed(1)}% da renda)` : '';
          tip.innerHTML = `<span>${hovered.label}</span><br><b>${money(hovered.value)}</b>${ratio}`;
          tip.style.left = `${hovered.x + hovered.w / 2}px`;
          tip.style.top = `${hovered.y}px`;
          tip.classList.add('visible');
        }
      } else if (cashflowHoverIdx !== -1) {
        cashflowHoverIdx = -1;
        drawChart();
        if (tip) tip.classList.remove('visible');
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (cashflowHoverIdx !== -1) {
        cashflowHoverIdx = -1;
        drawChart();
      }
      if (tip) tip.classList.remove('visible');
    });
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, Math.max(0, w), Math.max(1, h), [r, r, 0, 0]);
  } else {
    c.rect(x, y, Math.max(0, w), Math.max(1, h));
  }
  c.fill();
}

function renderGoal(target = '#goalSummary') {
  const g = data.goal, progress = g.progress ?? (g.target ? g.current / g.target : null);
  $(target).innerHTML = `
    <div class="progress-head"><div><p class="eyebrow">${esc(g.name)}</p><b>${money(g.current)}</b></div><span>${pct(progress)}</span></div>
    <div class="progress"><i style="width:${Math.min(100, Math.max(0, (progress || 0) * 100))}%"></i></div>
    <div class="goal-stats"><span>Objetivo <b>${money(g.target)}</b></span><span>Falta <b>${money(g.remaining)}</b></span></div>
    <div class="detail-row"><span>Prazo previsto</span><b>${g.deadline ? new Date(`${g.deadline}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Dados não disponíveis'}</b></div>
    <div class="detail-row"><span>Aporte mensal necessário (fórmula da planilha)</span><b>${money(g.monthly)}</b></div>`;
}

function renderAlerts() {
  const p = periodData(), a = [];
  if (p.income != null && p.expenses != null && p.expenses > p.income) a.push(['alert-marker', 'As despesas do período superam a renda registrada.']);
  if (p.income != null && p.expenses != null && p.contribution != null && p.income === p.expenses + p.contribution) a.push(['alert-marker', 'A renda do período está totalmente distribuída entre despesas e aporte.']);
  if (data.goal.progress >= 0.8) a.push(['alert-marker pos', 'A meta está próxima de ser alcançada.']);
  if (data.portfolio > 0) a.push(['alert-marker pos', 'A planilha registra patrimônio e carteira de investimentos consolidada.']);
  a.push(['alert-marker', p.source ? `Período exibido: ${p.source}.` : 'Não há dados registrados para este mês.']);
  $('#alerts').innerHTML = a.map(([c, t]) => `<div class="alert-row"><i class="${c}"></i>${esc(t)}</div>`).join('');
}

function renderHealth() {
  const p = periodData();
  const saving = p.income != null && p.expenses != null && p.income ? (p.income - p.expenses - (p.contribution || 0)) / p.income : null;
  const invest = p.income != null && p.contribution != null && p.income ? p.contribution / p.income : null;
  const expense = p.income != null && p.expenses != null && p.income ? p.expenses / p.income : null;

  const cashShare = (data.assets.find(a => a.name === 'Caixa')?.share) || 0.22;
  const cashReserve = data.portfolio * cashShare;
  const cashMonths = p.expenses ? cashReserve / p.expenses : null;
  const score = calculateHealthScore();

  const items = [
    ['Score de saúde', `${score}/100`, score >= 70 ? 'Excelente estabilidade' : (score >= 40 ? 'Estabilidade moderada' : 'Atenção necessária')],
    ['Taxa de economia', pct(saving), 'Após despesas e aporte'],
    ['Taxa de investimento', pct(invest), 'Aporte ÷ renda registrada'],
    ['Despesas / receitas', pct(expense), 'Despesas ÷ renda registrada'],
    ['Reserva em caixa', cashMonths == null ? 'Dados não disponíveis' : `${cashMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`, 'Caixa planejado ÷ despesa mensal']
  ];
  $('#health').innerHTML = items.map(i => `<div class="health-card"><small>${i[0].toUpperCase()}</small><b>${i[1]}</b><span>${i[2]}</span></div>`).join('');
  updateHealthScoreBadge();
}

function renderPatrimonio() {
  const g = data.goal;
  $('#patrimonioPage').innerHTML = `
    <div class="page-cards">
      ${metric('◈', 'Patrimônio atual', money(data.portfolio), `Posição informada em ${data.updated}`, '#81e0b2')}
      ${metric('↗', 'Saldo Bruto', money(data.grossBalance), 'Valor bruto acumulado', '#82b9ff')}
      ${metric('◎', 'Meta principal', pct(g.progress), money(g.target), '#f2cb7c')}
    </div>
    <div class="grid-two">
      <article class="card">
        <p class="eyebrow">POSIÇÃO REGISTRADA</p>
        <h3>Composição disponível</h3>
        <p class="muted">A planilha lista os ativos por ticker e classe, mas o valor total está consolidado em uma única célula (${money(data.portfolio)}). A alocação real por ativo requer o preenchimento de quantidades na planilha.</p>
        <div class="detail-row"><span>Ganho de capital registrado</span><b>${money(data.capitalGain)} (${pct(data.rentability)})</b></div>
        <div class="detail-row"><span>Proventos acumulados</span><b>${money(data.dividends)}</b></div>
        <div class="detail-row"><span>Última posição informada</span><b>${data.updated}</b></div>
      </article>
      <article class="card">
        <p class="eyebrow">RENDIMENTO DA CARTEIRA</p>
        <h3>Indicadores registrados</h3>
        <div class="detail-row"><span>Rentabilidade acumulada (planilha)</span><b>${pct(data.annualRentability)}</b></div>
        <div class="detail-row"><span>Aporte mensal</span><b>${money(data.contribution)}</b></div>
        <div class="detail-row"><span>Total aplicado</span><b>${money(data.invested)}</b></div>
        <p class="fine-print">Variação e proventos calculados a partir dos campos preenchidos na aba Patrimônio.</p>
      </article>
    </div>`;
}

function assetClass(t) {
  if (['BTC', 'ETH'].includes(t)) return 'Cripto';
  if (['IVVB11', 'NASD11'].includes(t)) return 'Exterior';
  if (t === 'C6 CDB' || t.includes('CDB') || t.includes('Tesouro') || t.includes('Renda Fixa')) return 'Renda fixa';
  const stockUnits = ['TAEE11', 'KLBN11', 'SAPR11', 'BPAC11', 'ALUP11', 'SANB11', 'ENGI11', 'TIET11', 'SULA11'];
  if (stockUnits.includes(t)) return 'Ações';
  if (t.endsWith('11')) return 'FIIs';
  return 'Ações';
}

function renderInvestments() {
  const max = Math.max(0, ...data.assets.map(a => a.share));
  const alloc = data.assets.map(a => `
    <div class="allocation-item">
      <strong>${esc(a.name)}</strong>
      <small>${a.share ? pct(a.share) : 'Saldo indisponível'}</small>
      <div class="mini-bar"><i style="width:${max ? 100 * a.share / max : 0}%"></i></div>
    </div>`).join('');

  $('#investimentosPage').innerHTML = `
    <div class="page-cards">
      ${metric('◈', 'Patrimônio investido', money(data.invested), 'Total consolidado na planilha', '#81e0b2')}
      ${metric('＋', 'Aporte mensal', money(data.contribution), 'Aba Patrimônio · valor registrado', '#82b9ff')}
      ${metric('⌁', 'Rentabilidade', pct(data.rentability), 'Indicador da aba Patrimônio', '#f2cb7c')}
    </div>
    <div class="grid-two">
      <article class="card">
        <p class="eyebrow">ALOCAÇÃO ALVO</p>
        <h3>Distribuição planejada</h3>
        <p class="muted">Percentuais ideais registrados na planilha; os valores atuais por classe seguem as metas cadastradas.</p>
        <div class="allocation">${alloc}</div>
      </article>
      <article class="card">
        <p class="eyebrow">ATIVOS CADASTRADOS</p>
        <h3>Carteira identificada (${data.tickers.length} ativos)</h3>
        <p class="muted">Ativos listados na planilha com classificação corrigida.</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Ativo</th><th>Classe</th><th>Valor atual</th></tr></thead>
            <tbody>
              ${data.tickers.map(t => `<tr><td>${esc(t)}</td><td><span class="pill">${assetClass(t)}</span></td><td>Dados não disponíveis</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </article>
    </div>
    <article class="card section-space">
      <p class="eyebrow">RENDA PASSIVA</p>
      <h3>Proventos e dividendos</h3>
      <div class="detail-row"><span>Total acumulado de proventos pagos</span><b>${money(data.dividends)}</b></div>
      <p class="muted">Valor consolidado na aba Patrimônio desde o início da carteira (21/08/2023). A planilha traz o total acumulado, sem histórico de pagamentos mês a mês.</p>
    </article>`;
}

function renderGoals() {
  const g = data.goal;
  $('#metasPage').innerHTML = `
    <article class="card">${renderGoalHtml(g)}</article>
    <div class="grid-two section-space">
      <article class="card">
        <p class="eyebrow">RESERVA DE EMERGÊNCIA</p>
        <h3>Referência do controle</h3>
        <div class="detail-row"><span>Reserva ideal (12 meses de despesas previstas)</span><b>${money(data.emergencyReserve ?? null)}</b></div>
        <p class="muted">Valor calculado originalmente na aba Controle Lançamentos: R$ 16.620. O cálculo utiliza despesas planejadas, não movimentações com data.</p>
      </article>
      <article class="card">
        <p class="eyebrow">OUTROS OBJETIVOS</p>
        <h3>Metas adicionais</h3>
        <div class="empty">A planilha contém uma meta preenchida. Metas adicionais não foram encontradas.</div>
      </article>
    </div>`;
}

function renderGoalHtml(g) {
  const p = g.progress ?? (g.target ? g.current / g.target : null);
  return `
    <div class="card-head"><div><p class="eyebrow">OBJETIVO ATIVO</p><h3>${esc(g.name)}</h3></div><span class="tag">Prazo ${g.deadline ? new Date(`${g.deadline}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'não informado'}</span></div>
    <div class="progress-head"><div><p class="eyebrow">ACUMULADO</p><b>${money(g.current)}</b></div><span>${pct(p)}</span></div>
    <div class="progress"><i style="width:${Math.min(100, Math.max(0, (p || 0) * 100))}%"></i></div>
    <div class="goal-stats"><span>Valor objetivo <b>${money(g.target)}</b></span><span>Valor restante <b>${money(g.remaining)}</b></span></div>
    <div class="detail-row"><span>Aporte mensal necessário (fórmula da planilha)</span><b>${money(g.monthly)}</b></div>`;
}

function project(start, monthly, annual, years) {
  const n = Math.round(years * 12);
  if (!n) return start;
  if (!annual || annual <= 0) return start + monthly * n;
  const rate = Math.pow(1 + annual, 1 / 12) - 1;
  if (rate === 0) return start + monthly * n;
  return start * Math.pow(1 + rate, n) + monthly * ((Math.pow(1 + rate, n) - 1) / rate);
}

function renderRetirement() {
  const r = data.retirement;
  $('#retirementPage').innerHTML = `
    <div class="page-cards">
      ${metric('◈', 'Patrimônio para simulação', money(r.invested), 'Valor inicial informado na aba', '#81e0b2')}
      ${metric('◷', 'Patrimônio projetado', money(project(r.invested, r.monthly, r.rate, Math.max(0, r.retireAge - r.age))), `Aos ${val(r.retireAge, ' anos')} · projeção matemática`, '#82b9ff')}
      ${metric('↗', 'Renda mensal desejada', money(r.passive), 'Meta de renda da planilha', '#f2cb7c')}
    </div>
    <div class="grid-two">
      <article class="card">
        <p class="eyebrow">PREMISSAS ORIGINAIS</p>
        <h3>Dados cadastrados</h3>
        <div class="detail-row"><span>Idade atual</span><b>${val(r.age, ' anos')}</b></div>
        <div class="detail-row"><span>Idade planejada</span><b>${val(r.retireAge, ' anos')}</b></div>
        <div class="detail-row"><span>Aporte mensal sugerido</span><b>${money(r.monthly)}</b></div>
        <div class="detail-row"><span>Rentabilidade real anual estimada</span><b>${pct(r.rate)}</b></div>
        <div class="detail-row"><span>Patrimônio alvo</span><b>${money(r.target)}</b></div>
        <p class="fine-print">A planilha também contém valor manual de patrimônio alvo para simulação, distinto do valor do portfólio na aba Patrimônio.</p>
      </article>
      <article class="card">
        <p class="eyebrow">SIMULADOR</p>
        <h3>Teste outros aportes</h3>
        <p class="muted">Projeção composta mensalmente, com taxa anual da própria planilha.</p>
        <div class="simulator">
          <label>Aporte mensal<input id="simContribution" type="number" min="0" step="50" value="${r.monthly}"></label>
          <label>Idade de aposentadoria<input id="simAge" type="number" min="${r.age}" max="100" value="${r.retireAge}"></label>
          <button class="btn-primary" id="simulateBtn">Atualizar projeção</button>
        </div>
        <div id="simulationOutput" class="detail-row" style="margin-top:18px">
          <span>Patrimônio projetado</span><b>${money(project(r.invested, r.monthly, r.rate, Math.max(0, r.retireAge - r.age)))}</b>
        </div>
        <p class="fine-print">Simulação indicativa, sem garantia de retorno. Não representa recomendação financeira.</p>
      </article>
    </div>
    <article class="card section-space">
      <div class="card-head">
        <div><p class="eyebrow">CENÁRIO COM PREMISSAS DA PLANILHA</p><h3>Projeção do patrimônio</h3></div>
        <span class="tag">Rentabilidade real anual ${pct(r.rate)}</span>
      </div>
      <div class="chart-wrap"><canvas id="projectionChart" aria-label="Projeção de patrimônio até a idade planejada"></canvas></div>
      <div class="legend"><span><i class="dot blue"></i>Patrimônio projetado com aportes mensais informados</span></div>
      <p class="chart-foot">Projeção matemática; valores reais podem variar. Não inclui mudanças futuras de aporte ou rentabilidade.</p>
    </article>`;

  let projectionHoverX = null;
  let cachedPts = [];

  const drawProjection = (monthly, targetAge) => {
    const canvas = $('#projectionChart');
    if (!canvas) return;
    const wrap = canvas.closest('.chart-wrap');
    const tip = wrap ? getOrCreateTooltip(wrap) : null;
    const ctx = canvas.getContext('2d'), rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!rect.width || !rect.height) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const inputContr = Number($('#simContribution')?.value);
    const inputAge = Number($('#simAge')?.value);
    const mon = Number.isFinite(monthly) ? monthly : (Number.isFinite(inputContr) ? inputContr : r.monthly);
    const age = Number.isFinite(targetAge) ? targetAge : (Number.isFinite(inputAge) ? inputAge : r.retireAge);

    const w = rect.width, h = rect.height, p = { l: 50, r: 12, t: 14, b: 24 };
    const years = Math.max(1, Math.min(60, age - r.age));
    const pts = Array.from({ length: years + 1 }, (_, i) => ({
      year: r.age + i,
      yearsPassed: i,
      value: project(r.invested, mon, r.rate, i),
      totalContributed: r.invested + (mon * i * 12)
    }));
    const max = Math.max(1, pts[pts.length - 1]?.value ?? 1);

    ctx.clearRect(0, 0, w, h);
    ctx.font = '10px DM Sans';
    for (let i = 0; i < 4; i++) {
      const y = p.t + (h - p.t - p.b) * i / 3;
      ctx.strokeStyle = '#28343c';
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(w - p.r, y);
      ctx.stroke();
      ctx.fillStyle = '#82919a';
      ctx.textAlign = 'right';
      ctx.fillText(money(max * (1 - i / 3)).replace('R$ ', ''), p.l - 6, y + 3);
    }

    cachedPts = pts.map((pt, i) => {
      const x = p.l + (w - p.l - p.r) * i / years;
      const y = h - p.b - (h - p.t - p.b) * pt.value / max;
      return { ...pt, screenX: x, screenY: y };
    });

    ctx.beginPath();
    cachedPts.forEach((pt, i) => {
      i ? ctx.lineTo(pt.screenX, pt.screenY) : ctx.moveTo(pt.screenX, pt.screenY);
    });
    ctx.lineTo(w - p.r, h - p.b);
    ctx.lineTo(p.l, h - p.b);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, p.t, 0, h - p.b);
    grad.addColorStop(0, '#82b9ff44');
    grad.addColorStop(1, '#82b9ff00');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    cachedPts.forEach((pt, i) => {
      i ? ctx.lineTo(pt.screenX, pt.screenY) : ctx.moveTo(pt.screenX, pt.screenY);
    });
    ctx.strokeStyle = '#82b9ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (projectionHoverX != null) {
      let closest = cachedPts[0];
      let minDist = Infinity;
      cachedPts.forEach(pt => {
        const d = Math.abs(pt.screenX - projectionHoverX);
        if (d < minDist) { minDist = d; closest = pt; }
      });

      if (closest) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.moveTo(closest.screenX, p.t);
        ctx.lineTo(closest.screenX, h - p.b);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(closest.screenX, closest.screenY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (tip) {
          tip.innerHTML = `<span>Idade: <b>${closest.year} anos</b> (${closest.yearsPassed} anos de aporte)</span><br>Patrimônio: <b>${money(closest.value)}</b><br><small style="color:var(--text-muted)">Total aportado: ${money(closest.totalContributed)}</small>`;
          tip.style.left = `${closest.screenX}px`;
          tip.style.top = `${closest.screenY}px`;
          tip.classList.add('visible');
        }
      }
    } else {
      if (tip) tip.classList.remove('visible');
    }

    if (!canvas._hasHoverEvents) {
      canvas._hasHoverEvents = true;
      canvas.addEventListener('mousemove', e => {
        const cr = canvas.getBoundingClientRect();
        projectionHoverX = e.clientX - cr.left;
        drawProjection(mon, age);
      });
      canvas.addEventListener('mouseleave', () => {
        projectionHoverX = null;
        drawProjection(mon, age);
        if (tip) tip.classList.remove('visible');
      });
    }
  };

  redrawRetirementChart = () => drawProjection();
  requestAnimationFrame(drawProjection);

  $('#simulateBtn').onclick = () => {
    const m = Number($('#simContribution').value), age = Number($('#simAge').value);
    $('#simulationOutput').innerHTML = `<span>Patrimônio projetado em ${age} anos de idade</span><b>${money(project(r.invested, m, r.rate, Math.max(0, age - r.age)))}</b>`;
    drawProjection(m, age);
  };
}

function renderReports() {
  const p = periodData();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const cats = p.categoryAvailable ? p.categories.slice().sort((a, b) => b.value - a.value) : [];

  $('#reportsPage').innerHTML = `
    <article class="card">
      <div class="card-head">
        <div><p class="eyebrow">RESUMO DO PERÍODO SELECIONADO</p><h3>${monthNames[Number(selectedMonth) - 1]} de ${selectedYear}</h3></div>
        <span class="tag">${p.source || 'Sem dados registrados'}</span>
      </div>
      <div class="page-cards section-space">
        ${metric('↗', 'Receitas', money(p.income), 'Fonte disponível no período', '#81e0b2')}
        ${metric('⌁', 'Despesas', money(p.expenses), 'Fonte disponível no período', '#ff8d83')}
        ${metric('±', 'Resultado', money(p.income != null && p.expenses != null ? p.income - p.expenses : null), 'Receitas menos despesas', '#82b9ff')}
      </div>
      <h3>Despesas por categoria</h3>
      ${cats.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Categoria</th><th>Valor</th><th>Parte das despesas</th></tr></thead>
            <tbody>
              ${cats.map(c => `<tr><td>${esc(c.name)}</td><td>${money(c.value)}</td><td>${p.expenses ? pct(c.value / p.expenses) : 'Dados não disponíveis'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<div class="empty">Detalhamento por categoria registrado apenas para o orçamento mensal (Setembro). Nos outros meses, consulte os totais da tabela abaixo.</div>'}
    </article>
    <article class="card section-space">
      <p class="eyebrow">HISTÓRICO NA PLANILHA</p>
      <h3>Totais mensais registrados</h3>
      <p class="muted">Receitas e despesas extraídas da planilha de controle. Períodos sem preenchimento na planilha exibem "Dados não disponíveis".</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Mês</th><th>Receita registrada</th><th>Despesa registrada</th><th>Saldo do mês</th></tr></thead>
          <tbody>
            ${data.history.labels.map((m, i) => {
              const inc = data.history.income[i];
              const exp = data.history.expenses[i];
              const bal = inc != null && exp != null ? inc - exp : null;
              return `<tr>
                <td><strong>${m}</strong></td>
                <td>${money(inc)}</td>
                <td>${money(exp)}</td>
                <td style="color:${bal > 0 ? 'var(--green)' : (bal < 0 ? 'var(--coral)' : 'inherit')}">${money(bal)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </article>`;
}

function renderControl() {
  const tx = filtered();
  $('#controlPage').innerHTML = `
    <div class="notice">
      <span class="notice-icon">i</span>
      <span>Encontrados ${data.transactions.length} lançamentos preenchidos (incluindo receitas e despesas). Datas individuais não preenchidas na planilha de origem; os totais refletem valores orçados.</span>
    </div>
    <article class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            ${tx.map(t => `
              <tr>
                <td>${esc(t.description)}</td>
                <td>${esc(t.category)}</td>
                <td><span class="pill" style="${t.type === 'RECEITA' ? 'color:#81e0b2;border-color:#315244;background:#172720;' : ''}">${esc(t.type)}</span></td>
                <td>${money(t.value)}</td>
                <td>${esc(t.status || 'Dados não disponíveis')}</td>
                <td>${t.date ? esc(t.date) : 'Dados não disponíveis'}</td>
              </tr>
            `).join('') || '<tr><td colspan="6">Dados não disponíveis para os filtros aplicados</td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
    <article class="card section-space">
      <p class="eyebrow">ENTRADAS REGISTRADAS</p>
      <h3>Renda mensal</h3>
      <div class="detail-row"><span>Total de entradas</span><b>${money(data.income)}</b></div>
      <p class="muted">A aba Controle Lançamentos registra renda líquida mensal total.</p>
    </article>`;
}

function renderAll() {
  renderMetrics();
  renderCategories();
  renderGoal();
  renderAlerts();
  renderHealth();
  renderPatrimonio();
  renderInvestments();
  renderGoals();
  renderRetirement();
  renderReports();
  renderControl();
  requestAnimationFrame(drawChart);
  if (typeof redrawRetirementChart === 'function') {
    requestAnimationFrame(redrawRetirementChart);
  }
  $('#syncText').textContent = `Planilha · ${data.updated}`;
}

function pageFromHash() {
  let key = location.hash.replace('#', '') || 'dashboard';
  if (!$(`#page-${key}`)) key = 'dashboard';
  $$('.page').forEach(x => x.classList.toggle('active', x.id === `page-${key}`));
  $$('[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === key));
  $('#crumbPage').textContent = ({
    dashboard: 'Dashboard',
    patrimonio: 'Patrimônio',
    investimentos: 'Investimentos',
    metas: 'Metas financeiras',
    aposentadoria: 'Aposentadoria',
    relatorios: 'Relatórios',
    controle: 'Controle original'
  })[key] || 'Dashboard';
  $('#sidebar').classList.remove('open');

  if (key === 'dashboard') {
    requestAnimationFrame(drawChart);
  } else if (key === 'aposentadoria' && typeof redrawRetirementChart === 'function') {
    requestAnimationFrame(redrawRetirementChart);
  }
}

function csvExport() {
  try {
    const selected = periodData();
    const rows = [
      ['CONTROLE FINANCEIRO JM', 'Relatório de ' + selectedMonth + '/' + selectedYear],
      ['Receitas', selected.income],
      ['Despesas', selected.expenses],
      ['Investimentos', selected.contribution],
      ['Resultado líquido', selected.income != null && selected.expenses != null ? selected.income - selected.expenses : null],
      ['Patrimônio', data.portfolio],
      ['Saldo Bruto', data.grossBalance],
      ['Ganho de Capital', data.capitalGain],
      ['Proventos Acumulados', data.dividends],
      ['Meta', data.goal.name],
      ['Objetivo', data.goal.target],
      ['Acumulado', data.goal.current],
      [],
      ['Categoria', 'Valor'],
      ...(selected.categoryAvailable ? data.categories : []).map(c => [c.name, c.value])
    ];
    const csv = '\ufeff' + rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `relatorio-controle-financeiro-jm-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Relatório CSV exportado com sucesso!', 'success');
  } catch (err) {
    showToast('Erro ao exportar CSV: ' + err.message, 'error');
  }
}

function cell(s, a) {
  const c = s?.[a];
  return c?.v ?? null;
}

function num(s, a) {
  const n = Number(cell(s, a));
  return Number.isFinite(n) ? n : null;
}

function parseWorkbook(file) {
  if (!window.XLSX) throw Error('A biblioteca de leitura Excel não está disponível. Conecte-se à internet e tente novamente.');
  const wb = XLSX.read(file, { type: 'array', cellDates: true });
  const dash = wb.Sheets['DASHBOARD'] || wb.Sheets['Dashboard'];
  const ctrl = wb.Sheets['CONTROLE LANCAMENTOS'] || wb.Sheets['CONTROLE LANÇAMENTOS'] || wb.Sheets['Controle Lancamentos'] || wb.Sheets['Controle Lançamentos'];
  const pat = wb.Sheets['PATRIMÔNIO'] || wb.Sheets['PATRIMONIO'] || wb.Sheets['Patrimônio'] || wb.Sheets['Patrimonio'];
  const ret = wb.Sheets['APOSENTADORIA'] || wb.Sheets['Aposentadoria'];

  if (!dash || !ctrl || !pat) throw Error('Não encontrei as abas DASHBOARD, CONTROLE LANCAMENTOS e PATRIMÔNIO.');

  const gtarget = num(pat, 'B28');
  const gcur = num(pat, 'C28');
  const cats = [];
  for (let r = 14; r <= 22; r++) {
    const name = cell(dash, `E${r}`), value = num(dash, `F${r}`);
    if (name) cats.push({ name: String(name), value: value ?? 0 });
  }

  const tx = [];
  // Parse income entries from CONTROLE LANCAMENTOS A17:D24
  for (let r = 17; r <= 24; r++) {
    const desc = cell(ctrl, `A${r}`), v = num(ctrl, `D${r}`);
    if (desc && v > 0) {
      tx.push({
        description: String(desc).trim(),
        category: 'Salário/Renda',
        type: 'RECEITA',
        value: v,
        status: 'RECEBIDO',
        date: null
      });
    }
  }

  // Parse expenses from CONTROLE LANCAMENTOS H18:K47
  for (let r = 18; r <= 47; r++) {
    const description = cell(ctrl, `H${r}`), v = num(ctrl, `K${r}`);
    if (description && v > 0) {
      tx.push({
        description: String(description).trim(),
        category: String(cell(ctrl, `I${r}`) || 'Outros').trim(),
        type: String(cell(ctrl, `J${r}`) || 'DESPESA').trim().toUpperCase(),
        value: v,
        status: String(cell(ctrl, `M${r}`) || 'PENDENTE').trim(),
        date: cell(ctrl, `G${r}`) ? new Date(cell(ctrl, `G${r}`)).toLocaleDateString('pt-BR') : null
      });
    }
  }

  const assets = [['Caixa', 'I2'], ['REITs', 'I3'], ['Ações BR', 'I4'], ['Criptomoedas', 'I5'], ['Exterior', 'I6']].map(([name, a]) => ({ name, share: num(pat, a) || 0 }));
  const target = gtarget ?? num(dash, 'C17');
  const current = gcur ?? num(pat, 'J9');
  const dateRaw = cell(dash, 'C5');
  const period = dateRaw instanceof Date ? `${dateRaw.getFullYear()}-${String(dateRaw.getMonth() + 1).padStart(2, '0')}` : INITIAL.period;

  // Dynamically extract tickers from PATRIMÔNIO column A
  const tickers = [];
  for (let r = 2; r <= 35; r++) {
    const t = cell(pat, `A${r}`);
    if (t && String(t).trim() && !String(t).toUpperCase().includes('ATIVO') && !String(t).toUpperCase().includes('META')) {
      tickers.push(String(t).trim());
    }
  }

  const incCells = ['R16', 'U16', 'X16', 'R25', 'U25', 'X25', 'R35', 'U35', 'X35', 'R45', 'U45', 'X45'];
  const expCells = ['AA21', 'AD21', 'AG21', 'AA31', 'AD31', 'AG31', 'AA41', 'AD41', 'AG41', 'AA50', 'AD50', 'AG50'];

  return {
    ...structuredClone(INITIAL),
    updated: new Date().toLocaleDateString('pt-BR'),
    period,
    income: num(ctrl, 'D25'),
    expenses: num(ctrl, 'K50'),
    contribution: num(pat, 'J10'),
    balance: num(dash, 'B8'),
    invested: num(pat, 'J9'),
    portfolio: num(pat, 'J9'),
    grossBalance: num(pat, 'O3') ?? INITIAL.grossBalance,
    capitalGain: num(pat, 'O4') ?? INITIAL.capitalGain,
    dividends: num(pat, 'N9') ?? INITIAL.dividends,
    goal: {
      name: String(cell(pat, 'A28') || INITIAL.goal.name),
      target,
      current,
      remaining: num(pat, 'D28'),
      progress: num(pat, 'F28'),
      deadline: cell(pat, 'E28') instanceof Date ? cell(pat, 'E28').toISOString().slice(0, 10) : INITIAL.goal.deadline,
      monthly: num(pat, 'G28')
    },
    categories: cats,
    assets,
    tickers: tickers.length ? tickers : INITIAL.tickers,
    retirement: {
      age: num(ret, 'H20'),
      retireAge: num(ret, 'H21'),
      invested: num(ret, 'H22'),
      monthly: num(ret, 'H23'),
      rate: num(ret, 'H24'),
      target: num(ret, 'H30'),
      passive: num(ret, 'G35'),
      passiveRate: num(ret, 'H35')
    },
    transactions: tx,
    emergencyReserve: num(ctrl, 'D31'),
    history: {
      income: incCells.map(a => num(ctrl, a)),
      expenses: expCells.map(a => num(ctrl, a)),
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    },
    historyYears: {
      income: Number(String(cell(ctrl, 'Q14') || '').match(/\d{4}/)?.[0] || 2026),
      expenses: Number(String(cell(ctrl, 'Z14') || '').match(/\d{4}/)?.[0] || 2025)
    },
    rentability: num(pat, 'O5'),
    annualRentability: num(pat, 'O11')
  };
}

const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const availableYears = [...new Set([Number(data.period.slice(0, 4)), data.historyYears.income, data.historyYears.expenses])].sort((a, b) => a - b);

$('#yearFilter').innerHTML = availableYears.map(y => `<option value="${y}" ${y === Number(selectedYear) ? 'selected' : ''}>${y}</option>`).join('');
$('#yearFilter').value = selectedYear;
$('#monthFilter').innerHTML = monthLabels.map((m, i) => `<option value="${i + 1}" ${i + 1 === Number(selectedMonth) ? 'selected' : ''}>${m}</option>`).join('');
$('#monthFilter').value = selectedMonth;

const updatePeriod = () => {
  selectedYear = $('#yearFilter').value;
  selectedMonth = $('#monthFilter').value;
  const pd = periodData(), months = monthLabels;
  const mIndex = Number(selectedMonth) - 1;
  const mName = months[mIndex] || `Mês ${selectedMonth}`;
  $('#chartPeriod').textContent = `${mName} · ${selectedYear}`;
  $('#chartSource').textContent = pd.source ? `Fonte: ${pd.source}.` : 'Dados não disponíveis para este período.';
  $('#dataNotice').innerHTML = `<span class="notice-icon">i</span><span><b>${mName} de ${selectedYear}:</b> ${pd.source ? `dados encontrados em ${pd.source}` : 'não há totais registrados na planilha para este período'}.${pd.categoryAvailable ? ' Detalhamento por categoria disponível.' : ' A planilha traz os totais consolidados para este mês.'}</span>`;
  renderMetrics();
  renderCategories();
  renderAlerts();
  renderHealth();
  renderReports();
  renderControl();
  requestAnimationFrame(drawChart);
};

$('#yearFilter').onchange = updatePeriod;
$('#monthFilter').onchange = updatePeriod;

$('#categoryFilter').innerHTML = '<option value="all">Todas</option>' + INITIAL.categories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
$('#categoryFilter').onchange = e => {
  selectedCategory = e.target.value;
  renderMetrics();
  renderCategories();
  renderHealth();
  renderControl();
  requestAnimationFrame(drawChart);
};

$('#typeFilter').onchange = e => {
  selectedType = e.target.value;
  renderMetrics();
  renderCategories();
  renderControl();
  requestAnimationFrame(drawChart);
};

$('#navigation').onclick = e => {
  const item = e.target.closest('[data-page]');
  if (item) location.hash = item.dataset.page;
};

document.addEventListener('click', e => {
  const a = e.target.closest('[data-page]');
  if (a) {
    location.hash = a.dataset.page;
    return;
  }
  const g = e.target.closest('[data-goto]');
  if (g) location.hash = g.dataset.goto;
});

window.addEventListener('hashchange', pageFromHash);

$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#settingsBtn').onclick = () => $('#settingsModal').classList.add('open');
$('#closeModal').onclick = () => $('#settingsModal').classList.remove('open');
$('#settingsModal').onclick = e => {
  if (e.target.id === 'settingsModal') e.currentTarget.classList.remove('open');
};

$('#exportBtn').onclick = csvExport;

$('#excelFile').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  $('#uploadStatus').textContent = 'Lendo a planilha…';
  try {
    data = parseWorkbook(await f.arrayBuffer());
    selectedYear = data.period.slice(0, 4);
    selectedMonth = String(Number(data.period.slice(5, 7)));
    selectedCategory = 'all';
    const years = [...new Set([Number(data.period.slice(0, 4)), data.historyYears.income, data.historyYears.expenses])].sort((a, b) => a - b);
    $('#yearFilter').innerHTML = years.map(y => `<option value="${y}" ${y === Number(selectedYear) ? 'selected' : ''}>${y}</option>`).join('');
    $('#yearFilter').value = selectedYear;
    $('#monthFilter').innerHTML = monthLabels.map((m, i) => `<option value="${i + 1}" ${i + 1 === Number(selectedMonth) ? 'selected' : ''}>${m}</option>`).join('');
    $('#monthFilter').value = selectedMonth;
    $('#categoryFilter').innerHTML = '<option value="all">Todas</option>' + data.categories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    updatePeriod();
    renderAll();
    $('#uploadStatus').textContent = `Planilha carregada com sucesso · ${data.updated}`;
    $('#settingsModal').classList.remove('open');
    showToast('Planilha sincronizada e atualizada com sucesso!', 'success');
  } catch (err) {
    $('#uploadStatus').textContent = err.message;
    showToast(err.message, 'error');
  }
};

const searchInput = $('#txSearch');
if (searchInput) {
  searchInput.oninput = () => renderControl();
}

window.addEventListener('resize', () => {
  requestAnimationFrame(drawChart);
  if (typeof redrawRetirementChart === 'function') {
    requestAnimationFrame(redrawRetirementChart);
  }
});

renderAll();
updatePeriod();
pageFromHash();
