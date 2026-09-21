(() => {
  const apiUrl = window.MAPFORGE_API_URL || '';
  const supabaseUrl = window.MAPFORGE_SUPABASE_URL || '';
  const anonKey = window.MAPFORGE_SUPABASE_ANON_KEY || '';
  if (!apiUrl || apiUrl.startsWith('REMPLACE_') || !anonKey || anonKey.startsWith('REMPLACE_')) return;
  const sb = window.supabase.createClient(supabaseUrl, anonKey);
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('a.btn.primary[href*="buy.stripe.com"]');
    if (!link) return;
    event.preventDefault();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      if (confirm('Tu dois être connecté à ton compte MapForge pour acheter cette map.\n\nClique sur OK pour ouvrir Mon espace.')) location.href = 'espace.html';
      return;
    }
    const original = link.textContent;
    link.textContent = 'Préparation du paiement…';
    link.style.pointerEvents = 'none';
    try {
      const r = await fetch(apiUrl.replace(/\/$/, '') + '/api/checkout', { method:'POST', headers:{ Authorization:'Bearer '+session.access_token, 'Content-Type':'application/json' }, body:JSON.stringify({product:'redwood'}) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || 'Impossible de préparer le paiement.');
      location.href = d.url;
    } catch (e) {
      alert(e.message || 'Une erreur est survenue.');
      link.textContent = original;
      link.style.pointerEvents = '';
    }
  });
})();
