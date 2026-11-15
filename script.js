/* Catálogo 3D — dados salvos no navegador (localStorage). */
const ADMIN_PIN = '45622960894'; // TROQUE esta senha. Protege apenas a edição neste navegador.
const CATEGORIAS = ['Chaveiros', 'Decoração', 'Acessórios', 'Bonecos'];
const CORES = {amarelo:'#f5d90a',roxo:'#8e5ad7',verde:'#2fb344','verde-água':'#2cc4a4',azul:'#2f7de1',vermelho:'#e03a3a',rosa:'#e8559b',preto:'#222',branco:'#f4f4f4',cinza:'#8a8f98',marrom:'#7a4a32',laranja:'#f28c28',dourado:'#d4a437'};

const grupo = (nome, lista) => ({ nome, valores: lista.split(',').map(t => {
  const m = t.trim().match(/^(.*?)\s*\+\s*([\d.,]+)$/);
  return m ? { nome: m[1].trim(), extra: parseFloat(m[2].replace(',', '.')) } : { nome: t.trim(), extra: 0 };
}) });
const COR7 = 'Amarelo, Roxo, Verde-água, Azul, Rosa, Preto, Branco';
const PADRAO = [
  {id:'p1',nome:'chaveiro polvo',cat:'Chaveiros',preco:7,emoji:'🐙',cor:'#6b46c1',variacoes:[grupo('Cor',COR7),grupo('Acessório','Argola padrão, Mosquetão +3')]},
  {id:'p2',nome:'chaveiro suporte de celular',cat:'Chaveiros',preco:7,emoji:'📱',cor:'#2f6fcf',variacoes:[grupo('Cor','Azul, Cinza, Preto, Roxo'),grupo('Acessório','Com argola, Sem argola')]},
  {id:'p3',nome:'chaveiro giratório de time',cat:'Chaveiros',preco:7,emoji:'⚽',cor:'#1f7a4a',variacoes:[grupo('Time','Corinthians, Palmeiras, São Paulo, Santos, Flamengo')]},
  {id:'p4',nome:'chaveiro de cruz',cat:'Chaveiros',preco:5,emoji:'✝️',cor:'#7a4a32',variacoes:[grupo('Cor','Marrom e branco, Preto e branco, Azul e branco')]},
  {id:'p5',nome:'chaveiro de dragão flexível',cat:'Chaveiros',preco:7,emoji:'🐉',cor:'#2f86b8',variacoes:[grupo('Cor','Azul, Verde-água, Roxo, Vermelho, Dourado')]},
  {id:'p6',nome:'abridor de refri de esmalte + nfc',cat:'Chaveiros',preco:10,emoji:'💅',cor:'#c23f80',variacoes:[grupo('Cor','Rosa, Preto, Roxo, Vermelho')]},
  {id:'p7',nome:'chaveiro mídia social com aproximação nfc',cat:'Chaveiros',preco:10,emoji:'📲',cor:'#3a3f38',variacoes:[grupo('Rede','Instagram, WhatsApp, TikTok, Facebook, YouTube'),grupo('Cor','Preto e branco, Preto e dourado')]},
  {id:'p8',nome:'chaveiro personalizado com logo e nfc',cat:'Chaveiros',preco:10,emoji:'🏷️',cor:'#6b6f68',variacoes:[grupo('Formato','Redondo, Quadrado'),grupo('Cor','Branco, Preto')]},
  {id:'p9',nome:'dispensador de palito de dente',cat:'Acessórios',preco:20,emoji:'🪥',cor:'#a33636',variacoes:[grupo('Cor','Preto e vermelho, Preto, Branco')]},
  {id:'p10',nome:'kit bandeja de natal',cat:'Decoração',preco:55,emoji:'🎄',cor:'#b03a2e',variacoes:[grupo('Embalagem','Normal, Para presente +5')]},
  {id:'p11',nome:'suporte controle ps5 reforçado',cat:'Acessórios',preco:20,emoji:'🎮',cor:'#34406b',variacoes:[grupo('Cor','Branco, Preto')]},
  {id:'p12',nome:'suporte de fone para monitor',cat:'Acessórios',preco:15,emoji:'🎧',cor:'#2d332c',variacoes:[grupo('Cor','Preto, Branco, Cinza')]}
];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRL = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Sem espaço para salvar. Use fotos menores.'); } };

const state = {
  produtos: load('c3d_produtos', PADRAO),
  carrinho: load('c3d_carrinho', []),
  config: load('c3d_config', { whatsapp: '' }),
  categorias: load('c3d_categorias', CATEGORIAS),
  admin: sessionStorage.getItem('c3d_admin') === '1',
  cat: 'Todos', busca: '', ordem: 'def', atual: null, sel: []
};
const dlg = $('#dlg');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}
const temExtra = p => (p.variacoes || []).some(g => g.valores.some(v => v.extra > 0));
const fotosDe = p => p.fotos?.length ? p.fotos : (p.img ? [{ src: p.img, opcao: '' }] : []);
const capa = p => fotosDe(p)[0]?.src || '';
const thumb = (p, cls) => `<button class="${cls}${capa(p) ? ' has-img' : ''}" data-abrir="${esc(p.id)}" aria-label="Ver ${esc(p.nome)}" style="background-color:${esc(p.cor || '#333')};${capa(p) ? `background-image:url('${esc(capa(p))}')` : ''}">${capa(p) ? '' : esc(p.emoji || '📦')}</button>`;
function render() {
  const cats = [
    'Todos',
    ...new Set([
      ...state.categorias,
      ...state.produtos.map(p => p.cat).filter(Boolean)
    ])
  ];
  if (!cats.includes(state.cat)) state.cat = 'Todos';
  $('#chips').innerHTML = cats.map(c => `<button class="chip" aria-pressed="${c === state.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  let lista = state.produtos.filter(p => (state.cat === 'Todos' || p.cat === state.cat) && p.nome.toLowerCase().includes(state.busca));
  if (state.ordem === 'asc') lista.sort((a, b) => a.preco - b.preco);
  if (state.ordem === 'desc') lista.sort((a, b) => b.preco - a.preco);
  if (state.ordem === 'az') lista.sort((a, b) => a.nome.localeCompare(b.nome));
  $('#resultInfo').textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');
  $('#grid').innerHTML = lista.length ? lista.map(p => `
    <article class="card">${thumb(p, 'thumb')}
      <div class="cbody"><span class="cat">${esc(p.cat)}</span><h3>${esc(p.nome)}</h3>
        <div class="cfoot"><span class="price">${temExtra(p) ? '<small>a partir de</small>' : ''}${BRL(p.preco)}</span>
        <button class="btn sm" data-abrir="${esc(p.id)}">Escolher</button></div></div>
      ${state.admin ? `<div class="cadmin"><button class="btn ghost sm" data-editar="${esc(p.id)}">Editar</button><button class="btn danger sm" data-excluir="${esc(p.id)}">Excluir</button></div>` : ''}
    </article>`).join('') : '<p class="empty">Nenhum produto encontrado. Tente outra busca.</p>';
  $('#cartCount').textContent = state.carrinho.length;
  const wa = state.config.whatsapp.replace(/\D/g, '');
  $('#waLink').href = wa ? 'https://wa.me/' + wa : '#';
  const bar = $('#adminBar'); bar.hidden = !state.admin;
  bar.innerHTML = state.admin ? `<button class="btn sm" data-a="novo">Novo produto</button><button class="btn ghost sm" data-a="categoria">+ nova categoria</button><button class="btn ghost sm" data-a="delcat">- remover categoria</button><button class="btn ghost sm" data-a="wa">WhatsApp: ${esc(state.config.whatsapp || 'definir')}</button><button class="btn ghost sm" data-a="exp">Exportar backup</button><button class="btn ghost sm" data-a="imp">Importar backup</button><button class="btn ghost sm" data-a="reset">Restaurar catálogo inicial</button><button class="btn ghost sm" data-a="sair">Sair do modo lojista</button>` : '';
}

const precoAtual = () => Number(state.atual.preco) + state.atual.variacoes.reduce((s, g, i) => s + (g.valores[state.sel[i]]?.extra || 0), 0);
function abrirProduto(id) {
  const p = state.produtos.find(x => x.id === id); if (!p) return;
  state.atual = p; state.sel = p.variacoes.map(() => 0);
  dlg.innerHTML = `<div class="dlg"><div class="big" id="foto" style="background-color:${esc(p.cor)};${capa(p) ? `background-image:url('${esc(capa(p))}')` : ''}">${capa(p) ? '' : esc(p.emoji)}</div>
      ${fotosDe(p).length > 1 ? `<div class="miniaturas">${fotosDe(p).map((f, i) => `<button class="mini" data-foto="${i}" style="background-image:url('${esc(f.src)}')" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}    <h2>${esc(p.nome)}</h2>
      ${p.variacoes.map((g, i) => `<div class="grp"><b>${esc(g.nome)}</b><div class="opts">${g.valores.map((v, j) => `<button class="opt" aria-pressed="${j === 0}" data-g="${i}" data-v="${j}">${CORES[v.nome.toLowerCase()] ? `<span class="dot" style="background:${CORES[v.nome.toLowerCase()]}"></span>` : ''}${esc(v.nome)}${v.extra ? ` <small>+${BRL(v.extra)}</small>` : ''}</button>`).join('')}</div></div>`).join('')}
    <div><label for="obs">Observações (nome, texto, logo)</label><textarea id="obs" rows="2" placeholder="Opcional"></textarea></div>
    <div class="row"><span class="price" id="pAtual">${BRL(precoAtual())}</span><button class="btn" data-add>Adicionar ao pedido</button><button class="btn ghost" data-fechar>Fechar</button></div></div>`;
  dlg.showModal();
}
function abrirCarrinho() {
  const total = state.carrinho.reduce((s, i) => s + i.preco, 0);
  dlg.innerHTML = `<div class="dlg"><h2>Seu pedido</h2>${state.carrinho.length ? state.carrinho.map((i, k) => `<div class="line"><div><b>${esc(i.nome)}</b><span>${esc(i.desc)}</span></div><div><b>${BRL(i.preco)}</b><br><button class="btn ghost sm" data-rm="${k}">Remover</button></div></div>`).join('') + `<div class="line"><span>Total</span><span class="total">${BRL(total)}</span></div><button class="btn" data-enviar>Enviar pedido pelo WhatsApp</button>` : '<p class="empty">Seu pedido está vazio. Escolha um produto para começar.</p>'}<button class="btn ghost" data-fechar>Fechar</button></div>`;
  if (!dlg.open) dlg.showModal();
}
function enviar() {
  const total = state.carrinho.reduce((s, i) => s + i.preco, 0);
  const msg = 'Olá! Quero fazer este pedido:\n\n' + state.carrinho.map(i => `• ${i.nome} (${i.desc}): ${BRL(i.preco)}`).join('\n') + `\n\nTotal: ${BRL(total)}`;
  const wa = state.config.whatsapp.replace(/\D/g, '');
  if (!wa) { navigator.clipboard?.writeText(msg); return toast('WhatsApp não configurado. Pedido copiado.'); }
  window.open('https://wa.me/' + 19981796411 + '?text=' + encodeURIComponent(msg), '_blank');
}

const varTexto = v => (v || []).map(g => g.nome + ': ' + g.valores.map(x => x.nome + (x.extra ? ' +' + x.extra : '')).join(', ')).join('\n');
const varParse = t => t.split('\n').map(l => l.trim()).filter(l => l.includes(':')).map(l => { const i = l.indexOf(':'); return grupo(l.slice(0, i).trim(), l.slice(i + 1)); }).filter(g => g.valores.some(v => v.nome));
function formProduto(p) {
  const novo = !p; p = p || { nome: '', cat: 'Chaveiros', preco: '', emoji: '📦', cor: '#3a3f38', variacoes: [] };
  state.atual = p;
  state.fotosForm = structuredClone(fotosDe(p));
  const cats = [
  ...new Set([
    ...state.categorias,
    ...state.produtos.map(x => x.cat)
  ])
];
  dlg.innerHTML = `<div class="dlg"><h2>${novo ? 'Novo produto' : 'Editar produto'}</h2>
    <div><label>Nome</label><input id="fNome" value="${esc(p.nome)}"></div>
    <div class="row"><div style="flex:1"><label>Categoria</label><select id="fCat">${cats.map(c => `<option ${c === p.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div style="flex:1"><label>Preço base (R$)</label><input id="fPreco" type="number" step="0.5" min="0" value="${esc(p.preco)}"></div></div>
    <div class="row"><div style="flex:1"><label>Emoji (sem foto)</label><input id="fEmoji" value="${esc(p.emoji)}"></div>
    <div style="flex:1"><label>Cor de fundo</label><input id="fCor" type="color" value="${esc(p.cor)}" style="height:44px;padding:3px"></div></div>
    <div><label>Fotos do produto (pode escolher várias)</label><input id="fImg" type="file" accept="image/*" multiple><div id="fFotos"></div></div>    <div><label>Variações: uma por linha, no formato Nome: opção, opção +extra</label><textarea id="fVar" rows="5" placeholder="Cor: Azul, Preto, Dourado +2&#10;Acessório: Argola, Mosquetão +3">${esc(varTexto(p.variacoes))}</textarea></div>
    <div class="row"><button class="btn" data-salvar>Salvar produto</button><button class="btn ghost" data-fechar>Cancelar</button></div></div>`;
  if (!dlg.open) dlg.showModal();
  desenharFotos();
}
function reduzir(file) { // reduz a foto para caber no armazenamento
  return new Promise((ok, erro) => { const r = new FileReader(); r.onerror = erro; r.onload = () => { const im = new Image(); im.onerror = erro; im.onload = () => {
    const s = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .82)); };
    im.src = r.result; }; r.readAsDataURL(file); });
}
async function salvarProduto() {
  const nome = $('#fNome').value.trim(); if (!nome) return toast('Informe o nome do produto.');
  const p = { ...state.atual, nome, cat: $('#fCat').value, preco: parseFloat($('#fPreco').value) || 0, emoji: $('#fEmoji').value || '📦', cor: $('#fCor').value, variacoes: varParse($('#fVar').value), fotos: state.fotosForm};
  delete p.img
  if (p.id) state.produtos = state.produtos.map(x => x.id === p.id ? p : x);
  else { p.id = 'p' + Date.now().toString(36); state.produtos.push(p); }
  save('c3d_produtos', state.produtos); dlg.close(); render(); toast('Produto salvo');
}

document.addEventListener('click', e => {
  const t = e.target, q = a => t.closest(`[${a}]`), d = a => q(a)?.getAttribute(a);
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
    const p = state.atual, desc = p.variacoes.map((g, i) => g.nome + ': ' + g.valores[state.sel[i]].nome).join(', '), obs = $('#obs').value.trim();
    state.carrinho.push({ nome: p.nome, desc: desc + (obs ? (desc ? ' | ' : '') + 'Obs: ' + obs : ''), preco: precoAtual() });
    save('c3d_carrinho', state.carrinho); dlg.close(); render(); toast('Adicionado ao pedido');
  }
  else if (q('data-rm')) { state.carrinho.splice(+d('data-rm'), 1); save('c3d_carrinho', state.carrinho); render(); abrirCarrinho(); }
  else if (q('data-enviar')) enviar();
  else if (q('data-editar')) formProduto(state.produtos.find(p => p.id === d('data-editar')));
  else if (q('data-excluir')) { if (confirm('Excluir este produto?')) { state.produtos = state.produtos.filter(p => p.id !== d('data-excluir')); save('c3d_produtos', state.produtos); render(); } }
  else if (q('data-salvar')) salvarProduto();
  else if (q('data-a')) acaoAdmin(d('data-a'));
  else if (t.closest('#btnAdmin')) {
    if (state.admin) return toast('Modo lojista já está ativo');
    if (prompt('Senha do lojista:') === ADMIN_PIN) { state.admin = true; sessionStorage.setItem('c3d_admin', '1'); render(); toast('Modo lojista ativado'); document.getElementById('produtos').scrollIntoView(); }
    else toast('Senha incorreta');
  }
});
function acaoAdmin(a) {
  if (a === 'novo') formProduto();
  if (a === 'sair') { state.admin = false; sessionStorage.removeItem('c3d_admin'); render(); }
  if (a === 'wa') { const n = prompt('WhatsApp com DDI e DDD (Ex: 19 9 9999-9999):', state.config.whatsapp); if (n !== null) { state.config.whatsapp = n.replace(/\D/g, ''); save('c3d_config', state.config); render(); } }
  if (a === 'reset' && confirm('Voltar ao catálogo inicial? Seus produtos adicionados serão apagados.')) { state.produtos = structuredClone(PADRAO); save('c3d_produtos', state.produtos); render(); }
  if (a === 'exp') { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify({ produtos: state.produtos, config: state.config }, null, 1)], { type: 'application/json' })); l.download = 'catalogo-3d-backup.json'; l.click(); }
  if (a === 'imp') { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); if (!Array.isArray(d.produtos)) throw 0; state.produtos = d.produtos; state.config = d.config || state.config; save('c3d_produtos', state.produtos); save('c3d_config', state.config); render(); toast('Backup importado'); } catch { toast('Arquivo de backup inválido'); } }; i.click(); }
  if (a === 'categoria') {
  const nome = (prompt('Digite o nome da nova categoria:') || '').trim();
  if (!nome) return;

  if (state.categorias.some(c => c.toLowerCase() === nome.toLowerCase())) {
    return toast('Essa categoria já existe.');
  }

  state.categorias.push(nome);
  save('c3d_categorias', state.categorias);
  render();
  toast('Categoria criada');
}
  if (a === 'delcat') {
  const nome = prompt('Digite o nome da categoria que quer remover:');
  if (!nome) return;

  const alvo = state.categorias.find(c => c.toLowerCase() === nome.trim().toLowerCase());
  if (!alvo) return toast('Categoria não encontrada.');

  if (state.produtos.some(p => p.cat === alvo)) {
    return toast('Ainda há produtos nessa categoria. Mude ou exclua eles primeiro.');
  }

  state.categorias = state.categorias.filter(c => c !== alvo);
  save('c3d_categorias', state.categorias);
  render();
  toast('Categoria removida');
  }
}
$('#search').addEventListener('input', e => { state.busca = e.target.value.toLowerCase().trim(); render(); });
$('#sort').addEventListener('change', e => { state.ordem = e.target.value; render(); });
render();

function mostrarFoto(src) {
  const el = $('#foto'); if (!el || !src) return;
  el.style.backgroundImage = `url('${src}')`; el.textContent = '';
}

function desenharFotos() {
  $('#fFotos').innerHTML = state.fotosForm.map((f, i) => `<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><img src="${esc(f.src)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px"><input data-fop="${i}" value="${esc(f.opcao)}" placeholder="Opção desta foto (ex.: Azul)"><button class="btn danger sm" data-fdel="${i}">Remover</button></div>`).join('');
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'fImg') return;
  for (const file of e.target.files) {
    try { state.fotosForm.push({ src: await reduzir(file), opcao: '' }); } catch { toast('Não consegui ler uma das imagens.'); }
  }
  e.target.value = ''; desenharFotos();
});
document.addEventListener('input', e => {
  if (e.target.dataset.fop !== undefined) state.fotosForm[+e.target.dataset.fop].opcao = e.target.value;
});
