/* Catálogo 3D — produtos e categorias ficam no arquivo catalogo.json do seu repositório GitHub. */
const WHATSAPP = '5519981796411';    // DDI 55 + DDD + número. Igual em todos os dispositivos.
const REPO_MANUAL = '';   // Só preencha se NÃO usar endereço github.io. Ex.: 'meuusuario/meu-catalogo'
const BRANCH = 'main';    // ramo do seu repositório
const REPO = (() => {
  if (REPO_MANUAL.includes('/')) { const [owner, repo] = REPO_MANUAL.split('/'); return { owner, repo }; }
  const h = location.hostname;
  if (h.endsWith('.github.io')) return { owner: h.split('.')[0], repo: location.pathname.split('/')[1] || h };
  return null;
})();
const CATEGORIAS = ['Chaveiros', 'Decoração', 'Acessórios', 'Bonecos'];
const CORES = {amarelo:'#f5d90a',roxo:'#8e5ad7',verde:'#2fb344','verde-água':'#2cc4a4',azul:'#2f7de1',vermelho:'#e03a3a',rosa:'#e8559b',preto:'#222',branco:'#f4f4f4',cinza:'#8a8f98',marrom:'#7a4a32',laranja:'#f28c28',dourado:'#d4a437'};

const grupo = (nome, lista) => ({ nome, valores: lista.split(',').map(t => {
  const m = t.trim().match(/^(.*?)\s*\+\s*([\d.,]+)$/);
  return m ? { nome: m[1].trim(), extra: parseFloat(m[2].replace(',', '.')) } : { nome: t.trim(), extra: 0 };
}) });
const COR7 = 'Amarelo, Roxo, Verde-água, Azul, Rosa, Preto, Branco';
const PADRAO = [
];

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRL = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n));
const normalizar = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Sem espaço para salvar. Use menos fotos ou fotos menores.'); } };

try { localStorage.removeItem('c3d_token'); sessionStorage.removeItem('c3d_token'); sessionStorage.removeItem('c3d_admin'); } catch {}
let adminToken = '';
const state = {
  produtos: structuredClone(PADRAO),
  categorias: [...CATEGORIAS], carregando: true, acesso: null,
  carrinho: load('c3d_carrinho', []),
  calculos: load('c3d_calculos2', []), calcPadrao: load('c3d_calcpadrao', {}), calcAtual: '',
  admin: false,
  cat: 'Todos', busca: '', ordem: 'def', atual: null, sel: [], fotosForm: []
};
const dlg = $('#dlg');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- produtos e fotos ---------- */
const temExtra = p => (p.variacoes || []).some(g => g.valores.some(v => v.extra > 0));
const fotosDe = p => p.fotos?.length ? p.fotos : (p.img ? [{ src: p.img, opcao: '' }] : []);
const capa = p => fotosDe(p)[0]?.src || '';
const thumb = (p, cls) => `<button class="${cls}${capa(p) ? ' has-img' : ''}" data-abrir="${esc(p.id)}" aria-label="Ver ${esc(p.nome)}" style="background-color:${esc(p.cor || '#333')};${capa(p) ? `background-image:url('${esc(capa(p))}')` : ''}">${capa(p) ? '' : esc(p.emoji || '📦')}</button>`;
function mostrarFoto(src) {
  const el = $('#foto'); if (!el || !src) return;
  el.style.backgroundImage = `url('${src}')`; el.textContent = '';
}

/* ---------- lista de produtos ---------- */
function render() {
  const cats = ['Todos', ...new Set([...state.categorias, ...state.produtos.flatMap(p => [p.cat, p.cat2]).filter(Boolean)])];
  if (!cats.includes(state.cat)) state.cat = 'Todos';
  $('#chips').innerHTML = cats.map(c => `<button class="chip" aria-pressed="${c === state.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const lista = state.produtos.filter(p => (state.cat === 'Todos' || p.cat === state.cat || p.cat2 === state.cat) && normalizar(p.nome + ' ' + p.cat + ' ' + (p.cat2 || '')).includes(normalizar(state.busca)));
  if (state.ordem === 'asc') lista.sort((a, b) => a.preco - b.preco);
  if (state.ordem === 'desc') lista.sort((a, b) => b.preco - a.preco);
  if (state.ordem === 'az') lista.sort((a, b) => a.nome.localeCompare(b.nome));
  $('#resultInfo').textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');
  $('#grid').innerHTML = lista.length ? lista.map(p => `
    <article class="card">${thumb(p, 'thumb')}
      <div class="cbody"><span class="cat">${esc(p.cat)}${p.cat2 ? ' • ' + esc(p.cat2) : ''}</span><h3>${esc(p.nome)}</h3><span class="cat">${p.disponibilidade === 'esgotado' ? 'Esgotado' : p.disponibilidade === 'pronta' ? 'Pronta entrega' : 'Sob encomenda'}</span>
        <div class="cfoot"><span class="price">${temExtra(p) ? '<small>a partir de</small>' : ''}${BRL(p.preco)}</span>
        <button class="btn sm" data-abrir="${esc(p.id)}">Escolher</button></div></div>
      ${state.admin ? `<div class="cadmin"><button class="btn ghost sm" data-editar="${esc(p.id)}">Editar</button><button class="btn danger sm" data-excluir="${esc(p.id)}">Excluir</button></div>` : ''}
    </article>`).join('') : `<p class="empty">${state.carregando ? 'Carregando produtos…' : 'Nenhum produto encontrado. Tente outra busca.'}</p>`;
  $('#cartCount').textContent = state.carrinho.reduce((n,i)=>n+(i.qtd||1),0);
  $('#waLink').href = 'https://wa.me/' + WHATSAPP;
  const bar = $('#adminBar'); bar.hidden = !state.admin;
  bar.innerHTML = state.admin ? `
    <button class="btn sm" data-a="novo">Novo produto</button>
    <button class="btn sm" data-a="calc">Calculadora</button>
    <button class="btn ghost sm" data-a="categoria">+ nova categoria</button>
    <button class="btn ghost sm" data-a="delcat">- remover categoria</button>
    <button class="btn ghost sm" data-a="exp">Exportar backup</button>
    <button class="btn ghost sm" data-a="imp">Importar backup</button>
    <button class="btn ghost sm" data-a="reset">Restaurar catálogo inicial</button>
    
    <button class="btn ghost sm" data-a="senha">Cadastrar / alterar senha</button><button class="btn ghost sm" data-a="token">Trocar token do GitHub</button>
    <button class="btn ghost sm" data-a="sair">Sair do modo lojista</button>` : '';
}

/* ---------- janela do produto ---------- */
const precoAtual = () => Number(state.atual.preco) + state.atual.variacoes.reduce((s, g, i) => s + (g.valores[state.sel[i]]?.extra || 0), 0);
function abrirProduto(id) {
  const p = state.produtos.find(x => x.id === id); if (!p) return;
  state.atual = p; state.sel = p.variacoes.map(() => 0);
  const fotos = fotosDe(p);
  dlg.innerHTML = `<div class="dlg">
    <div class="big" id="foto" style="background-color:${esc(p.cor)};${capa(p) ? `background-image:url('${esc(capa(p))}')` : ''}">${capa(p) ? '' : esc(p.emoji)}</div>
    ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((f, i) => `<button class="mini" data-foto="${i}" style="background-image:url('${esc(f.src)}')" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}
    <h2>${esc(p.nome)}</h2>${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}<span class="cat">${p.disponibilidade === 'esgotado' ? 'Esgotado' : p.disponibilidade === 'pronta' ? 'Pronta entrega' : 'Sob encomenda'}</span>
    ${p.variacoes.map((g, i) => `<div class="grp"><b>${esc(g.nome)}</b><div class="opts">${g.valores.map((v, j) => `<button class="opt" aria-pressed="${j === 0}" data-g="${i}" data-v="${j}">${CORES[v.nome.toLowerCase()] ? `<span class="dot" style="background:${CORES[v.nome.toLowerCase()]}"></span>` : ''}${esc(v.nome)}</button>`).join('')}</div></div>`).join('')}
    <div><label for="obs">Observações (nome, texto, logo)</label><textarea id="obs" rows="2" placeholder="Opcional"></textarea></div>
    <div class="row"><span class="price" id="pAtual">${BRL(precoAtual())}</span><button class="btn" data-add ${p.disponibilidade === 'esgotado' ? 'disabled' : ''}>Adicionar ao pedido</button><button class="btn ghost" data-fechar>Fechar</button></div></div>`;
  dlg.showModal();
}

/* ---------- pedido ---------- */
function abrirCarrinho() {
  const total = state.carrinho.reduce((s, i) => s + i.preco * (i.qtd || 1), 0);
  dlg.innerHTML = `<div class="dlg cart-panel"><h2>Seu carrinho</h2>${state.carrinho.length ? state.carrinho.map((i, k) => `<div class="line"><div><b>${esc(i.nome)}</b><span>${esc(i.desc)}</span></div><div><b>${BRL(i.preco * (i.qtd || 1))}</b><br><button class="btn ghost sm" data-qty="${k}" data-delta="-1" aria-label="Diminuir quantidade">−</button> <span style="display:inline">${i.qtd || 1}</span> <button class="btn ghost sm" data-qty="${k}" data-delta="1" aria-label="Aumentar quantidade">+</button><br><button class="btn ghost sm" data-rm="${k}">Remover</button></div></div>`).join('') + `<div class="line"><span>Total</span><span class="total">${BRL(total)}</span></div><button class="btn" data-enviar>Enviar pedido pelo WhatsApp</button>` : '<p class="empty">Seu pedido está vazio. Escolha um produto para começar.</p>'}<button class="btn ghost" data-fechar>Fechar</button></div>`;
  if (!dlg.open) dlg.showModal();
}
function enviar() {
  const total = state.carrinho.reduce((s, i) => s + i.preco * (i.qtd || 1), 0);
  const msg = 'Olá! Quero fazer este pedido:\n\n' + state.carrinho.map(i => `• ${i.qtd || 1} × ${i.nome} (${i.desc}): ${BRL(i.preco * (i.qtd || 1))}`).join('\n') + `\n\nTotal: ${BRL(total)}`;
  window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
}

/* ---------- formulário do lojista ---------- */
const varTexto = v => (v || []).map(g => g.nome + ': ' + g.valores.map(x => x.nome + (x.extra ? ' +' + x.extra : '')).join(', ')).join('\n');
const varParse = t => t.split('\n').map(l => l.trim()).filter(l => l.includes(':')).map(l => { const i = l.indexOf(':'); return grupo(l.slice(0, i).trim(), l.slice(i + 1)); }).filter(g => g.valores.some(v => v.nome));

function formProduto(p) {
  const novo = !p;
  p = p || { nome: '', cat: state.categorias[0] || 'Chaveiros', preco: '', emoji: '📦', cor: '#3a3f38', variacoes: [] };
  state.atual = p;
  state.fotosForm = structuredClone(fotosDe(p));
  const cats = [...new Set([...state.categorias, ...state.produtos.map(x => x.cat)])];
  dlg.innerHTML = `<div class="dlg"><h2>${novo ? 'Novo produto' : 'Editar produto'}</h2>
    <div><label>Nome</label><input id="fNome" value="${esc(p.nome)}"></div><div><label>Descrição</label><textarea id="fDesc" rows="3">${esc(p.descricao || '')}</textarea></div><div><label>Disponibilidade</label><select id="fDisp">${[['encomenda','Sob encomenda'],['pronta','Pronta entrega'],['esgotado','Esgotado']].map(([v,n])=>`<option value="${v}" ${v===(p.disponibilidade||'encomenda')?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="row"><div style="flex:1"><label>Categoria</label><select id="fCat">${cats.map(c => `<option ${c === p.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div style="flex:1"><label>Categoria 2 (opcional)</label><select id="fCat2"><option value="">— nenhuma —</option>${cats.map(c => `<option ${c === p.cat2 ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
    <div><label>Preencher com um cálculo salvo na calculadora</label><select id="fCalc"><option value="">— escolher —</option>${state.calculos.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('')}</select></div>
    <div class="row"><div style="flex:1"><label>Custo (R$)</label><input id="fCusto" type="number" step="0.01" min="0" inputmode="decimal"></div>
    <div style="flex:1"><label>Markup (×)</label><input id="fMk" type="number" step="0.1" min="0" inputmode="decimal"></div>
    <div style="flex:1"><label>Preço base (R$)</label><input id="fPreco" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(p.preco)}"></div></div>
    <p style="margin:0;color:var(--mu);font-size:13px">Custo e markup só ajudam a calcular o preço e não são publicados. O que vale é o preço base.</p>
    <div class="row"><div style="flex:1"><label>Emoji (sem foto)</label><input id="fEmoji" value="${esc(p.emoji)}"></div>
    <div style="flex:1"><label>Cor de fundo</label><input id="fCor" type="color" value="${esc(p.cor)}" style="height:44px;padding:3px"></div></div>
    <div><label>Fotos do produto (pode escolher várias)</label><input id="fImg" type="file" accept="image/*" multiple><div id="fFotos"></div></div>
    <div><label>Variações: uma por linha, no formato Nome: opção, opção +extra</label><textarea id="fVar" rows="5" placeholder="Cor: Azul, Preto, Dourado +2&#10;Acessório: Argola, Mosquetão +3">${esc(varTexto(p.variacoes))}</textarea></div>
    <div class="row"><button class="btn" data-salvar>Salvar produto</button><button class="btn ghost" data-fechar>Cancelar</button></div></div>`;
  if (!dlg.open) dlg.showModal();
  desenharFotos();
}
function desenharFotos() {
  $('#fFotos').innerHTML = state.fotosForm.map((f, i) => `<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><img src="${esc(f.src)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px"><input data-fop="${i}" value="${esc(f.opcao)}" placeholder="Opção desta foto (ex.: Azul)"><button class="btn danger sm" data-fdel="${i}">Remover</button></div>`).join('');
}
function reduzir(file) { // reduz a foto para caber no armazenamento
  return new Promise((ok, erro) => { const r = new FileReader(); r.onerror = erro; r.onload = () => { const im = new Image(); im.onerror = erro; im.onload = () => {
    const s = Math.min(1, 560 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/webp', .82)); };
    im.src = r.result; }; r.readAsDataURL(file); });
}
function salvarProduto() {
  const nome = $('#fNome').value.trim(); if (!nome) return toast('Informe o nome do produto.');
  if (!$('#fPreco').value || !Number.isFinite(Number($('#fPreco').value)) || Number($('#fPreco').value)<0) return toast('Informe um preço válido.');
  const p = { ...state.atual, nome, descricao: $('#fDesc').value.trim(), disponibilidade: $('#fDisp').value, cat: $('#fCat').value, cat2: $('#fCat2').value === $('#fCat').value ? '' : $('#fCat2').value, preco: parseFloat($('#fPreco').value) || 0, emoji: $('#fEmoji').value || '📦', cor: $('#fCor').value, variacoes: varParse($('#fVar').value), fotos: state.fotosForm };
  delete p.img;
  if (p.id) state.produtos = state.produtos.map(x => x.id === p.id ? p : x);
  else { p.id = 'p' + Date.now().toString(36); state.produtos.push(p); }
  dlg.close(); render(); salvarTudo();
}

/* ---------- ações do lojista ---------- */
function acaoAdmin(a) {
  if (a === 'novo') formProduto();
  else if (a === 'calc') abrirCalculadora();
  else if (a === 'sair') { state.admin = false; adminToken = ''; render(); }
  
  else if (a === 'senha') cadastrarSenha();
  else if (a === 'token') { state.admin=false; adminToken=''; render(); entrarLojista(); }
  else if (a === 'categoria') {
    const nome = (prompt('Nome da nova categoria:') || '').trim(); if (!nome) return;
    if (state.categorias.some(c => c.toLowerCase() === nome.toLowerCase())) return toast('Essa categoria já existe.');
    state.categorias.push(nome); render(); salvarTudo();
  }
  else if (a === 'delcat') {
    const nome = (prompt('Nome da categoria que quer remover:') || '').trim().toLowerCase(); if (!nome) return;
    const alvo = state.categorias.find(c => c.toLowerCase() === nome);
    if (!alvo) return toast('Categoria não encontrada.');
    if (state.produtos.some(p => p.cat === alvo || p.cat2 === alvo)) return toast('Ainda há produtos nessa categoria. Mude ou exclua eles primeiro.');
    state.categorias = state.categorias.filter(c => c !== alvo); render(); salvarTudo();
  }
  else if (a === 'reset') {
    if (!confirm('Voltar ao catálogo inicial? Seus produtos e categorias adicionados serão apagados.')) return;
    if (!confirm('O catálogo inicial está vazio. Confirma apagar todos os produtos?')) return;
    state.produtos = structuredClone(PADRAO); state.categorias = [...CATEGORIAS];
    render(); salvarTudo();
  }
  else if (a === 'exp') {
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([JSON.stringify({ produtos: state.produtos, categorias: state.categorias, calculos: state.calculos }, null, 1)], { type: 'application/json' }));
    l.download = 'catalogo-3d-backup.json'; l.click();
  }
  else if (a === 'imp') {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
    i.onchange = async () => {
      try {
        const d = JSON.parse(await i.files[0].text()); if (!Array.isArray(d.produtos)) throw 0;
        state.produtos = d.produtos; if (Array.isArray(d.categorias)) state.categorias = d.categorias;
        if (Array.isArray(d.calculos)) { state.calculos = d.calculos; save('c3d_calculos2', state.calculos); }
        render(); salvarTudo();
      } catch { toast('Arquivo de backup inválido'); }
    };
    i.click();
  }
}

/* ---------- calculadora de custo e markup (igual à planilha; fica salva só neste aparelho, pois custo não deve ser público) ---------- */
const num = x => parseFloat(String(x ?? '').replace(',', '.')) || 0;
const precoDe = (custo, mk) => Math.round(custo * mk * 100) / 100;
const PADROES = ['kg', 'potencia', 'kwh', 'fixoMes', 'unidMes', 'vida', 'maquina', 'falhas', 'unid', 'markup', 'imposto', 'cartao', 'anuncio'];
function calcular(c) {
  const tempo = num(c.tempo);
  const material = num(c.peso) / 1000 * num(c.kg);
  const energia = num(c.potencia) * tempo * num(c.kwh) / 1000;
  const acess = (c.acess || []).reduce((t, a) => t + num(a.qtd) * num(a.custo), 0);
  const fixo = num(c.fixoMes) / (num(c.unidMes) || 1) * (num(c.unid) || 1);
  const amort = num(c.vida) ? num(c.maquina) / num(c.vida) * tempo : 0;
  const falhas = num(c.falhas) / 100 * (material + energia + amort) * 0.7;
  const total = material + energia + acess + fixo + amort + falhas;
  const un = total / (num(c.unid) || 1);
  const preco = un * num(c.markup), lojista = preco / 2;
  const bruto = preco - un, brutoL = lojista - un;
  const liquido = bruto - preco * (num(c.imposto) + num(c.cartao) + num(c.anuncio)) / 100;
  const liquidoL = brutoL - lojista * num(c.imposto) / 100;
  return { material, energia, acess, fixo, amort, falhas, total, un, preco, lojista, bruto, brutoL, liquido, liquidoL };
}
function recalcForm() {
  const c = parseFloat($('#fCusto').value), m = parseFloat($('#fMk').value);
  if (c >= 0 && m >= 0) $('#fPreco').value = precoDe(c, m).toFixed(2);
}
function lerCalc() {
  const v = id => $('#' + id).value;
  return { id: state.calcAtual, nome: v('cNome').trim(), tempo: v('cTempo'), peso: v('cPeso'), unid: v('cUnid'), kg: v('cKg'), potencia: v('cPot'), kwh: v('cKwh'),
    fixoMes: v('cFixo'), unidMes: v('cUnidMes'), vida: v('cVida'), maquina: v('cMaq'), falhas: v('cFalhas'), markup: v('cMk'), imposto: v('cImp'), cartao: v('cCart'), anuncio: v('cAnun'),
    acess: [...document.querySelectorAll('.ac-row')].map(r => ({ nome: r.querySelector('.ac-n').value, qtd: r.querySelector('.ac-q').value, custo: r.querySelector('.ac-c').value })) };
}
function atualizarCalc() {
  const o = $('#cOut'); if (!o) return;
  const c = lerCalc(), r = calcular(c), caixa = (v, t) => `<div><b>${v}</b><span>${t}</span></div>`;
  $('#cEnergia').textContent = BRL(r.energia);
  $('#cConsumo').textContent = `${(num(c.potencia)*num(c.tempo)/1000).toLocaleString('pt-BR',{maximumFractionDigits:4})} kWh`;
  $('#cMaterial').textContent = BRL(r.material);
  o.innerHTML = caixa(BRL(r.total), 'Custo total') + caixa(BRL(r.un), 'Custo unitário') + caixa(BRL(r.preco), 'Preço consumidor')
    + caixa(BRL(r.lojista), 'Preço lojista') + caixa(BRL(r.bruto), 'Lucro bruto') + caixa(BRL(r.liquido), 'Lucro líquido')
    + caixa(BRL(r.brutoL), 'Lucro bruto lojista') + caixa(BRL(r.liquidoL), 'Lucro líq. lojista')
    + caixa(r.preco ? (r.liquido / r.preco * 100).toFixed(1).replace('.', ',') + '%' : '0%', 'Margem líquida');
  $('#cDet').textContent = `Material ${BRL(r.material)} • Energia ${BRL(r.energia)} • Acessórios ${BRL(r.acess)} • Fixo ${BRL(r.fixo)} • Máquina ${BRL(r.amort)} • Falhas ${BRL(r.falhas)}`;
}
function abrirCalculadora(c) {
  c = c || { id: '', nome: '', acess: [{ nome: '', qtd: 1, custo: '' }], ...state.calcPadrao };
  state.calcAtual = c.id || '';
  const f = (id, label, val) => `<div style="flex:1;min-width:0"><label>${label}</label><input id="${id}" type="number" step="any" min="0" inputmode="decimal" value="${esc(val ?? '')}"></div>`;
  const linhas = (c.acess || []).map((a, i) => `<div class="ac-row"><input class="ac-n" placeholder="Item (ex.: embalagem)" value="${esc(a.nome)}"><input class="ac-q" type="number" step="any" min="0" inputmode="decimal" placeholder="Qtd" value="${esc(a.qtd)}"><input class="ac-c" type="number" step="any" min="0" inputmode="decimal" placeholder="R$ un." value="${esc(a.custo)}"><button class="btn danger sm" data-cacdel="${i}" aria-label="Remover item">×</button></div>`).join('');
  dlg.innerHTML = `<div class="dlg"><h2>Calculadora</h2><div id="cForm" style="display:flex;flex-direction:column;gap:12px">
    <div><label>Nome do produto</label><input id="cNome" value="${esc(c.nome)}" placeholder="ex.: suporte controle ps5"></div>
    <div class="row">${f('cTempo', 'Horas de impressão (total)', c.tempo)}${f('cPeso', 'Gramas (total)', c.peso)}${f('cUnid', 'Unidades', c.unid ?? 1)}</div>
    <h3 class="calc-sec">Filamento</h3><div class="row">${f('cKg', 'Custo do filamento por kg (R$)', c.kg)}</div><div class="calc-out"><div><b id="cMaterial">—</b><span>Custo do filamento utilizado</span></div></div>
    <h3 class="calc-sec">Impressora e energia</h3><div class="row">${f('cPot', 'Consumo médio da impressora (W)', c.potencia)}${f('cKwh', 'Tarifa de energia (R$/kWh)', c.kwh)}</div><div class="calc-out" aria-live="polite"><div><b id="cConsumo">—</b><span>Energia consumida</span></div><div><b id="cEnergia">—</b><span>Custo de energia</span></div></div><small style="color:var(--mu)">Watts ÷ 1.000 × horas × tarifa do kWh</small>
    <h3 class="calc-sec">Acessórios e embalagens</h3>${linhas}<div><button class="btn ghost sm" data-cadd>+ Adicionar acessório ou embalagem</button></div>
    <h3 class="calc-sec">Custo fixo</h3><div class="row">${f('cFixo', 'Custo fixo mensal (R$)', c.fixoMes)}${f('cUnidMes', 'Unidades por mês', c.unidMes ?? 1)}</div>
    <h3 class="calc-sec">Máquina e falhas</h3><div class="row">${f('cVida', 'Vida útil (horas)', c.vida)}${f('cMaq', 'Valor da máquina (R$)', c.maquina)}${f('cFalhas', '% de falhas', c.falhas)}</div>
    <h3 class="calc-sec">Precificação</h3><div class="row">${f('cMk', 'Markup (×)', c.markup)}${f('cImp', 'Imposto (%)', c.imposto)}</div>
    <div class="row">${f('cCart', 'Tx cartão (%)', c.cartao)}${f('cAnun', 'Custo de anúncio (%)', c.anuncio)}</div></div>
    <div class="calc-out" id="cOut"></div><p id="cDet" style="margin:0;color:var(--mu);font-size:13px"></p>
    <div class="row"><button class="btn" data-csalvar>Salvar cálculo</button><button class="btn ghost" data-fechar>Fechar</button></div>
    <h3>Cálculos salvos</h3>
    ${state.calculos.length ? state.calculos.map(x => { const r = calcular(x); return `<div class="csalvo"><div><b>${esc(x.nome)}</b><span>Custo ${BRL(r.un)} • Markup ${esc(x.markup)}× → ${BRL(r.preco)}</span></div><div class="row"><button class="btn ghost sm" data-cabrir="${esc(x.id)}">Abrir</button><button class="btn danger sm" data-cdel="${esc(x.id)}">Excluir</button></div></div>`; }).join('') : '<p style="color:var(--mu)">Nenhum cálculo salvo ainda.</p>'}</div>`;
  if (!dlg.open) dlg.showModal();
  atualizarCalc();
}
function salvarCalculo() {
  const c = lerCalc(); if (!c.nome) return toast('Dê um nome ao cálculo (o modelo).');
  c.acess = c.acess.filter(a => a.nome || num(a.custo));
  const ex = state.calculos.find(x => x.id === c.id) || state.calculos.find(x => x.nome.toLowerCase() === c.nome.toLowerCase());
  if (ex) Object.assign(ex, c, { id: ex.id }); else { c.id = 'c' + Date.now().toString(36); state.calculos.push(c); }
  state.calcPadrao = Object.fromEntries(PADROES.map(k => [k, c[k]]));
  save('c3d_calculos2', state.calculos); save('c3d_calcpadrao', state.calcPadrao);
  abrirCalculadora(); toast('Cálculo salvo');
}

/* ---------- publicar para todos os dispositivos (GitHub) ---------- */
const b64 = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(bin); };
async function publicar(texto) {
  if (!REPO) throw new Error('repositório não encontrado (preencha REPO_MANUAL)');
  const t = adminToken; if (!state.admin || !t) throw new Error('Entre na área do lojista');
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/catalogo.json`;
  const h = { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' };
  const falha = r => { if ([401, 403, 404].includes(r.status)) { adminToken=''; state.admin=false; render(); } return new Error('GitHub respondeu ' + r.status + ' (confira o token)'); };
  let sha;
  const g = await fetch(url + '?ref=' + BRANCH, { headers: h, cache: 'no-store' });
  if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw falha(g);
  const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify({ message: 'Atualiza catálogo', content: b64(texto), branch: BRANCH, sha }) });
  if (!r.ok) throw falha(r);
}
async function salvarTudo() {
  toast('Publicando…');
  try {
    await publicar(JSON.stringify({ produtos: state.produtos, categorias: state.categorias, acesso: state.acesso }));
    toast('Publicado! Aparece para todos em 1 a 2 minutos.');
  } catch (err) { toast('Não publicou: ' + err.message); }
}
async function carregar() {
  try {
    let dados = null;
    const t = adminToken;
    if (t && REPO) { // lojista: lê a versão mais recente direto do GitHub
      const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/catalogo.json?ref=${BRANCH}`, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' });
      if (r.ok) dados = await r.json();
    }
    if (!dados) { const r = await fetch('catalogo.json', { cache: 'no-store' }); if (r.ok) dados = await r.json(); }
    if (dados && Array.isArray(dados.produtos)) { state.produtos = dados.produtos; if (Array.isArray(dados.categorias)) state.categorias = dados.categorias; state.acesso = dados.acesso || null; }
  } catch { /* sem catalogo.json: usa os produtos iniciais */ }
  state.carregando = false; render();
}

/* ---------- entrada do lojista ---------- */
const bytes64 = b => btoa(String.fromCharCode(...b));
const de64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function chaveSenha(senha,salt) {
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(senha),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function campoSecreto(titulo,duplo=false,alternativa=false) {
 return new Promise(resolve=>{
 dlg.innerHTML='<form class="dlg"><h2>'+titulo+'</h2><label for="segredo">Senha ou token</label><input id="segredo" type="password" required autocomplete="off">'+(duplo?'<label for="confirmacao">Confirme a senha</label><input id="confirmacao" type="password" required autocomplete="new-password">':'')+'<button class="btn" type="submit">Confirmar</button>'+(alternativa?'<button type="button" class="btn ghost" id="usarToken">Usar token do GitHub</button>':'')+'<button type="button" class="btn ghost" id="cancelarSegredo">Cancelar</button></form>';
 const fim=v=>{dlg.removeEventListener('close',cancelar);dlg.close();dlg.innerHTML='';resolve(v);};
 const cancelar=()=>{dlg.innerHTML='';resolve(null);};
 dlg.addEventListener('close',cancelar,{once:true});
 $('#cancelarSegredo').onclick=()=>fim(null);
 if(alternativa) $('#usarToken').onclick=()=>fim({token:true});
 dlg.querySelector('form').onsubmit=e=>{e.preventDefault();const v=$('#segredo').value;if(duplo&&(v.length<5||v!==$('#confirmacao').value))return toast('Use pelo menos 5 caracteres e confirme a senha.');fim({valor:v});};
 if(!dlg.open)dlg.showModal();
 });
}
async function cadastrarSenha(){
 if(!state.admin||!adminToken)return;
 const entrada=await campoSecreto('Cadastrar senha',true);if(!entrada)return;
 const anterior=state.acesso;
 try{
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await chaveSenha(entrada.valor,salt);
 const cifrado=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(adminToken));
 state.acesso={v:2,salt:bytes64(salt),iv:bytes64(iv),data:bytes64(new Uint8Array(cifrado))};
 await publicar(JSON.stringify({produtos:state.produtos,categorias:state.categorias,acesso:state.acesso}));
 toast('Senha cadastrada!');
 }catch(e){state.acesso=anterior;toast('Não foi possível cadastrar a senha.');}
}
async function entrarLojista() {
  if (state.admin) return toast('Modo lojista já está ativo');
  if (!REPO || state.carregando) return toast('Aguarde o catálogo carregar.');
  let t;
  if(state.acesso?.v===2){
   const entrada=await campoSecreto('Área do lojista',false,true);if(!entrada)return;
   if(!entrada.token){try{const a=state.acesso;const key=await chaveSenha(entrada.valor,de64(a.salt));t=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:de64(a.iv)},key,de64(a.data)));}catch{return toast('Senha incorreta.');}}
  }
  if(!t){const entrada=await campoSecreto('Token do GitHub');if(!entrada)return;t=entrada.valor.trim();}
  if(!t)return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json'},cache:'no-store'});
    const d = r.ok ? await r.json() : null;
    if (!d || !d.permissions?.push) throw new Error('Sem permissão de escrita');
    const data = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/catalogo.json?ref=${BRANCH}`,{headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github.raw+json'},cache:'no-store'});
    if (!data.ok) throw new Error('Não foi possível verificar o catálogo');
    const catalogo=await data.json();
    if(!Array.isArray(catalogo.produtos)) throw new Error('Catálogo inválido');
    state.produtos=catalogo.produtos; state.acesso=catalogo.acesso||null;
    if(Array.isArray(catalogo.categorias)) state.categorias=catalogo.categorias;
    adminToken=t; state.admin=true; render(); toast('Modo lojista ativado');
  } catch(err) { adminToken=''; state.admin=false; render(); toast('Acesso negado: '+err.message); }
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target; if (!state.admin && t.closest('[data-editar],[data-excluir],[data-salvar],[data-a],[data-csalvar],[data-cdel]')) return; const q = a => t.closest(`[${a}]`), d = a => q(a)?.getAttribute(a);
  if (t === dlg) return dlg.close();
  if (q('data-cat')) { state.cat = d('data-cat'); render(); }
  else if (q('data-foto')) mostrarFoto(fotosDe(state.atual)[+d('data-foto')].src);
  else if (q('data-fdel')) { state.fotosForm.splice(+d('data-fdel'), 1); desenharFotos(); }
  else if (q('data-abrir')) abrirProduto(d('data-abrir'));
  else if (q('data-fechar')) dlg.close();
  else if (t.closest('#btnCart')) abrirCarrinho();
  else if (q('data-g')) {
    const b = q('data-g'), g = +b.dataset.g;
    state.sel[g] = +b.dataset.v;
    b.parentNode.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#pAtual').textContent = BRL(precoAtual());
    const nomes = state.atual.variacoes.map((gr, i) => gr.valores[state.sel[i]].nome.toLowerCase());
    const f = fotosDe(state.atual).find(x => x.opcao && nomes.includes(x.opcao.toLowerCase()));
    if (f) mostrarFoto(f.src);
  }
  else if (q('data-add')) {
    if(state.atual.disponibilidade === 'esgotado') return toast('Produto esgotado.');
    const p = state.atual, desc = p.variacoes.map((g, i) => g.nome + ': ' + g.valores[state.sel[i]].nome).join(', '), obs = $('#obs').value.trim();
    const detalhe = desc + (obs ? (desc ? ' | ' : '') + 'Obs: ' + obs : ''); const igual=state.carrinho.find(i=>i.id===p.id && i.desc===detalhe && i.preco===precoAtual()); if(igual) igual.qtd=(igual.qtd||1)+1; else state.carrinho.push({id:p.id,nome:p.nome,desc:detalhe,preco:precoAtual(),qtd:1});
    save('c3d_carrinho', state.carrinho); dlg.close(); render(); toast('Adicionado ao pedido');
  }
  else if (q('data-qty')) { const i=state.carrinho[+d('data-qty')]; if(i){i.qtd=Math.max(1,Math.min(999,(i.qtd||1)+Number(d('data-delta'))));save('c3d_carrinho',state.carrinho);render();abrirCarrinho();} }
  else if (q('data-rm')) { state.carrinho.splice(+d('data-rm'), 1); save('c3d_carrinho', state.carrinho); render(); abrirCarrinho(); }
  else if (q('data-enviar')) enviar();
  else if (q('data-editar')) formProduto(state.produtos.find(p => p.id === d('data-editar')));
  else if (q('data-excluir')) { if (confirm('Excluir este produto?')) { state.produtos = state.produtos.filter(p => p.id !== d('data-excluir')); render(); salvarTudo(); } }
  else if (q('data-salvar')) salvarProduto();
  else if (q('data-cadd')) { const c = lerCalc(); c.acess.push({ nome: '', qtd: 1, custo: '' }); abrirCalculadora(c); }
  else if (q('data-cacdel')) { const c = lerCalc(); c.acess.splice(+d('data-cacdel'), 1); abrirCalculadora(c); }
  else if (q('data-csalvar')) salvarCalculo();
  else if (q('data-cabrir')) abrirCalculadora(state.calculos.find(c => c.id === d('data-cabrir')));
  else if (q('data-cdel')) { state.calculos = state.calculos.filter(c => c.id !== d('data-cdel')); save('c3d_calculos2', state.calculos); abrirCalculadora(); }
  else if (q('data-a')) acaoAdmin(d('data-a'));
  else if (t.closest('#btnAdmin')) entrarLojista();
});
document.addEventListener('change', async e => {
  if (e.target.id === 'fCalc') { const c = state.calculos.find(x => x.id === e.target.value); if (c) { $('#fCusto').value = calcular(c).un.toFixed(2); $('#fMk').value = num(c.markup) || ''; recalcForm(); } return; }
  if (e.target.id !== 'fImg') return;
  for (const file of e.target.files) {
    try { state.fotosForm.push({ src: await reduzir(file), opcao: '' }); } catch { toast('Não consegui ler uma das imagens.'); }
  }
  e.target.value = ''; desenharFotos();
});
document.addEventListener('input', e => {
  if (e.target.id === 'fCusto' || e.target.id === 'fMk') recalcForm();
  if (e.target.closest('#cForm')) atualizarCalc();
  if (e.target.dataset.fop !== undefined) state.fotosForm[+e.target.dataset.fop].opcao = e.target.value;
});
$('#search').addEventListener('input', e => { state.busca = e.target.value.toLowerCase().trim(); render(); });
$('#sort').addEventListener('change', e => { state.ordem = e.target.value; render(); });
render();
carregar();
