const BASE='https://api.themoviedb.org/3';
export default async (req) => {
  const url=new URL(req.url); const path=url.searchParams.get('path')||'trending/all/week';
  if(!/^[a-zA-Z0-9_\-/]+$/.test(path) || path.includes('..')) return new Response(JSON.stringify({error:'Invalid path'}),{status:400,headers:{'content-type':'application/json'}});
  const key=process.env.TMDB_API_KEY;
  if(!key) return new Response(JSON.stringify({error:'TMDB API is not configured yet. Add TMDB_API_KEY in Netlify environment variables.'}),{status:503,headers:{'content-type':'application/json'}});
  const params=new URLSearchParams(url.searchParams); params.delete('path'); params.set('api_key',key); params.set('language','en-US');
  const upstream=await fetch(BASE+'/'+path+'?'+params.toString(),{headers:{accept:'application/json'}});
  const body=await upstream.text();
  return new Response(body,{status:upstream.status,headers:{'content-type':'application/json','cache-control':'public, max-age=300, s-maxage=900'}});
};