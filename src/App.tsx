import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clapperboard, Compass, Film, Filter, Flame, Grid2X2, Heart,
  Info, Menu, Play, Plus, Search, SlidersHorizontal, Sparkles, Star, Tv, X
} from 'lucide-react';
import { discover, poster, type Media } from './api';

type Kind = 'movie' | 'tv' | 'all';
type Page = 'home' | 'movies' | 'series' | 'watchlist';
type Detail = Media & {
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
  videos?: { results?: { key: string; site: string; type: string; official?: boolean }[] };
  recommendations?: { results?: Media[] };
  credits?: { cast?: { id: number; name: string; character: string; profile_path: string | null }[] };
};
type Genre = { id: number; name: string };
const IMG = 'https://image.tmdb.org/t/p/';
const movieGenres: Genre[] = [
  {id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},
  {id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:14,name:'Fantasy'},
  {id:27,name:'Horror'},{id:9648,name:'Mystery'},{id:10749,name:'Romance'},
  {id:878,name:'Sci-Fi'},{id:53,name:'Thriller'}
];
const tvGenres: Genre[] = [
  {id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},
  {id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},
  {id:10765,name:'Sci-Fi & Fantasy'},{id:9648,name:'Mystery'}
];
const titleOf = (m: Media) => m.title || m.name || 'Untitled';
const yearOf = (m: Media) => (m.release_date || m.first_air_date || '').slice(0,4);
const kindOf = (m: Media): 'movie' | 'tv' => m.media_type === 'tv' || (!m.media_type && !!m.name) ? 'tv' : 'movie';
const ratingOf = (m: Media) => Number(m.vote_average || 0).toFixed(1);
const image = (path: string | null | undefined, size = 'w500') => path ? IMG + size + path : '';
const readSaved = (): Media[] => {
  try { const v = JSON.parse(localStorage.getItem('movclip-watchlist') || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const sections = [
  { id:'trending/all/week', title:'Trending this week', note:'The stories everyone is talking about', eyebrow:'IN THE SPOTLIGHT' },
  { id:'movie/popular', title:'Popular movies', note:'Big-screen stories worth your time', eyebrow:'MOVIE NIGHT' },
  { id:'tv/popular', title:'Popular series', note:'Your next weekend obsession', eyebrow:'BINGE-WORTHY' },
  { id:'movie/top_rated', title:'Top rated movies', note:'The highest-rated stories in the collection', eyebrow:'THE HALL OF FAME' },
  { id:'tv/top_rated', title:'Critically loved series', note:'Exceptional stories, episode after episode', eyebrow:'SERIES SELECTS' },
  { id:'movie/upcoming', title:'Coming soon', note:'A first look at what is on the horizon', eyebrow:'ON THE HORIZON' }
];
async function getTitles(path: string, params = '') {
  const data = await discover(path, params);
  return (data.results || []) as Media[];
}
function App() {
  const [page,setPage] = useState<Page>('home');
  const [mobileOpen,setMobileOpen] = useState(false);
  const [rows,setRows] = useState<Record<string,Media[]>>({});
  const [heroItems,setHeroItems] = useState<Media[]>([]);
  const [heroIndex,setHeroIndex] = useState(0);
  const [saved,setSaved] = useState<Media[]>(readSaved);
  const [query,setQuery] = useState('');
  const [searchResults,setSearchResults] = useState<Media[]>([]);
  const [searchLoading,setSearchLoading] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [genre,setGenre] = useState<number | null>(null);
  const [genreName,setGenreName] = useState('');
  const [catalogue,setCatalogue] = useState<Media[]>([]);
  const [cataloguePage,setCataloguePage] = useState(1);
  const [catalogueLoading,setCatalogueLoading] = useState(false);
  const [sort,setSort] = useState('popularity.desc');
  const [active,setActive] = useState<Media | null>(null);
  const [detail,setDetail] = useState<Detail | null>(null);
  const [detailLoading,setDetailLoading] = useState(false);
  const [trailerOpen,setTrailerOpen] = useState(false);
  const [toast,setToast] = useState('');
  const rowRefs = useRef<Record<string,HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hero = heroItems[heroIndex] || null;
  const searchMode = query.trim().length >= 2;
  const currentGenres = page === 'series' ? tvGenres : movieGenres;
  const visibleSaved = saved;

  useEffect(() => {
    let live = true;
    Promise.all(sections.map(async s => [s.id, await getTitles(s.id)] as const))
      .then(entries => {
        if (!live) return;
        const next = Object.fromEntries(entries) as Record<string,Media[]>;
        setRows(next);
        const picks = (next['trending/all/week'] || []).filter(m => m.backdrop_path && m.overview);
        setHeroItems(picks.slice(0,10));
        setError('');
      })
      .catch(e => { if (live) setError(e?.message || 'Could not connect to the movie catalogue.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => { localStorage.setItem('movclip-watchlist',JSON.stringify(saved)); },[saved]);
  useEffect(() => {
    if (heroItems.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex(i => (i + 1) % heroItems.length), 8500);
    return () => window.clearInterval(timer);
  },[heroItems.length]);
  useEffect(() => {
    let live = true;
    if (!searchMode) { setSearchResults([]); setSearchLoading(false); return () => { live = false; }; }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      discover('search/multi','&query=' + encodeURIComponent(query.trim()))
        .then(d => { if (live) setSearchResults((d.results || []).filter((m:Media) => m.poster_path && (m.media_type === 'movie' || m.media_type === 'tv'))); })
        .catch(() => { if (live) setSearchResults([]); })
        .finally(() => { if (live) setSearchLoading(false); });
    },350);
    return () => { live = false; window.clearTimeout(timer); };
  },[query,searchMode]);
  useEffect(() => {
    if (page !== 'movies' && page !== 'series') return;
    let live = true;
    setCatalogueLoading(true);
    const type = page === 'movies' ? 'movie' : 'tv';
    const sortField = page === 'series' ? sort.replace('primary_release_date','first_air_date') : sort;
    const params = '&page=' + cataloguePage + '&sort_by=' + sortField + (genre ? '&with_genres=' + genre : '');
    discover('discover/' + type,params)
      .then(d => { if (live) setCatalogue(d.results || []); })
      .catch(() => { if (live) setCatalogue([]); })
      .finally(() => { if (live) setCatalogueLoading(false); });
    return () => { live = false; };
  },[page,cataloguePage,genre,sort]);

  useEffect(() => {
    let live = true;
    if (!active) { setDetail(null); setDetailLoading(false); setTrailerOpen(false); return () => { live = false; }; }
    setDetailLoading(true);
    setDetail(null);
    const type = kindOf(active);
    Promise.all([
      discover(type + '/' + active.id),
      discover(type + '/' + active.id + '/videos'),
      discover(type + '/' + active.id + '/recommendations'),
      discover(type + '/' + active.id + '/credits')
    ]).then(([d,v,r,c]) => {
      if (live) setDetail({...active,...d,videos:v,recommendations:r,credits:c});
    }).catch(() => { if (live) setDetail(active); })
      .finally(() => { if (live) setDetailLoading(false); });
    return () => { live = false; };
  },[active]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInputRef.current?.focus(); }
      if (event.key === 'Escape') { setActive(null); setTrailerOpen(false); setMobileOpen(false); }
    };
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  },[]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''),2200);
    return () => window.clearTimeout(id);
  },[toast]);

  const isSaved = (m:Media) => saved.some(x => x.id === m.id && kindOf(x) === kindOf(m));
  const toggleSave = (m:Media) => {
    const exists = isSaved(m);
    setSaved(list => exists ? list.filter(x => !(x.id === m.id && kindOf(x) === kindOf(m))) : [m,...list]);
    setToast(exists ? 'Removed from your watchlist' : 'Added to your watchlist');
  };
  const openTitle = (m:Media) => { setActive(m); setTrailerOpen(false); };
  const changePage = (next:Page) => {
    setPage(next); setQuery(''); setGenre(null); setGenreName(''); setCataloguePage(1); setMobileOpen(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const chooseGenre = (g:Genre) => {
    setGenre(g.id); setGenreName(g.name); setCataloguePage(1);
    if (page === 'home') setPage('movies');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const heroImage = image(hero?.backdrop_path,'original');
  const trailer = detail?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
    || detail?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Teaser');
  const titlePage = page === 'movies' ? 'Movies' : page === 'series' ? 'Series' : 'My watchlist';
  const pageItems = page === 'watchlist' ? visibleSaved : catalogue;
  const pageTitle = genreName ? genreName + ' films' : page === 'movies' ? 'Discover movies' : page === 'series' ? 'Discover series' : 'Your saved collection';

  return <div className="app">
    <header className="site-header">
      <a className="wordmark" href="#" onClick={e => {e.preventDefault();changePage('home');}}>
        <span className="wordmark-icon"><Clapperboard size={18}/></span><span>movclip</span><b>®</b>
      </a>
      <nav className={mobileOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation">
        <button className={page === 'home' && !searchMode ? 'active' : ''} onClick={() => changePage('home')}>Discover</button>
        <button className={page === 'movies' ? 'active' : ''} onClick={() => changePage('movies')}>Movies</button>
        <button className={page === 'series' ? 'active' : ''} onClick={() => changePage('series')}>Series</button>
        <button className={page === 'watchlist' ? 'active' : ''} onClick={() => changePage('watchlist')}>My list <span className="nav-badge">{saved.length}</span></button>
      </nav>
      <div className="header-right">
        <label className="search-field"><Search size={16}/><input ref={searchInputRef} value={query} onChange={e => {setQuery(e.target.value);setMobileOpen(false);}} placeholder="Search any title..." aria-label="Search movies and series"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button>}<kbd>⌘ K</kbd></label>
        <button className="mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation">{mobileOpen ? <X/> : <Menu/>}</button>
      </div>
    </header>

    {searchMode ? <main className="catalogue-page">
      <div className="page-topline"><span><Search size={13}/> SEARCH RESULTS</span><span>{searchLoading ? 'Searching…' : searchResults.length + ' TITLES'}</span></div>
      <h1>Find your <em>next favourite.</em></h1><p className="page-lead">Showing movie and series matches for “{query.trim()}”.</p>
      {searchLoading ? <SkeletonGrid/> : searchResults.length ? <MediaGrid items={searchResults} saved={saved} onOpen={openTitle} onSave={toggleSave}/> : <EmptyState title="No titles found" text="Try a different title, actor or keyword."/>}
    </main> : page === 'home' ? <>
      <section className="hero" style={heroImage ? {backgroundImage:'linear-gradient(90deg,#08090d 0%,rgba(8,9,13,.92) 25%,rgba(8,9,13,.62) 54%,rgba(8,9,13,.13) 100%),linear-gradient(0deg,#08090d 0%,transparent 50%),url('+heroImage+')'} : undefined}>
        <div className="hero-grain"/>
        <div className="hero-inner">
          <div className="hero-label"><span className="label-mark"><Sparkles size={12}/></span> THE MOVCLIP SPOTLIGHT <i/></div>
          <div className="hero-copy">
            <div className="hero-overline"><span className="gold-dot"/> FEATURED DISCOVERY <span className="hero-divider"/> {hero ? (kindOf(hero) === 'tv' ? 'SERIES' : 'FILM') : 'YOUR NEXT WATCH'}</div>
            <h1>{hero ? titleOf(hero) : 'Stories worth staying in for.'}</h1>
            {hero && <div className="hero-facts"><span className="hero-rating"><Star size={13} fill="currentColor"/>{ratingOf(hero)}</span><span>{yearOf(hero) || 'New'}</span><span className="fact-separator"/><span>{kindOf(hero) === 'tv' ? 'TV SERIES' : 'FEATURE FILM'}</span><span className="fact-separator"/><span>TMDB</span></div>}
            <p>{hero?.overview || 'A considered collection of films and series for your next great watch.'}</p>
            <div className="hero-buttons"><button className="btn-primary" onClick={() => hero && openTitle(hero)}><Play size={15} fill="currentColor"/> Explore title <ArrowRight size={15}/></button><button className="btn-quiet" onClick={() => hero && toggleSave(hero)}>{hero && isSaved(hero) ? <Check size={16}/> : <Plus size={16}/>} {hero && isSaved(hero) ? 'In your list' : 'Add to watchlist'}</button></div>
          </div>
        </div>
        <div className="hero-bottom"><div className="hero-pagination"><span>{String(heroIndex + 1).padStart(2,'0')}</span><div className="hero-progress"><i style={{width: ((heroIndex + 1) / Math.max(heroItems.length,1) * 100) + '%'}}/></div><span>{String(Math.max(heroItems.length,1)).padStart(2,'0')}</span></div><div className="hero-controls"><button onClick={() => setHeroIndex(i => (i - 1 + heroItems.length) % Math.max(heroItems.length,1))} aria-label="Previous featured title"><ChevronLeft size={17}/></button><button onClick={() => setHeroIndex(i => (i + 1) % Math.max(heroItems.length,1))} aria-label="Next featured title"><ChevronRight size={17}/></button></div><span className="hero-credit">FEATURED FROM TMDB</span></div>
      </section>

      <main className="home-content">
        <div className="intro-row"><div><span className="eyebrow"><Compass size={13}/> YOUR CINEMA COMPANION</span><h2>Good stories.<br/><em>Great discoveries.</em></h2></div><p>Browse the latest buzz, timeless favourites and new worlds to get lost in. Save the titles you love and build a watchlist of your own.</p></div>
        <section className="genre-discovery"><div className="section-head"><div><span className="eyebrow">BROWSE BY GENRE</span><h3>Set the mood.</h3></div><button className="text-link" onClick={() => changePage('movies')}>Explore catalogue <ArrowRight size={14}/></button></div><div className="genre-tiles">
          {[
            {name:'Action',id:28,sub:'High stakes, fast pace',symbol:'01'},
            {name:'Thriller',id:53,sub:'Keep guessing',symbol:'02'},
            {name:'Sci-Fi',id:878,sub:'Beyond the ordinary',symbol:'03'},
            {name:'Horror',id:27,sub:'For the brave',symbol:'04'},
            {name:'Drama',id:18,sub:'Stories that stay',symbol:'05'}
          ].map(g => <button className="genre-tile" key={g.id} onClick={() => chooseGenre({id:g.id,name:g.name})}><span>{g.symbol}</span><strong>{g.name}</strong><small>{g.sub}</small><ArrowUpRightIcon/></button>)}
        </div></section>
        {sections.map((s,i) => <MediaSection key={s.id} section={s} items={rows[s.id] || []} index={i+1} saved={saved} onSave={toggleSave} onOpen={openTitle} register={el => {rowRefs.current[s.id] = el;}} onNext={() => rowRefs.current[s.id]?.scrollBy({left:600,behavior:'smooth'})} onPrev={() => rowRefs.current[s.id]?.scrollBy({left:-600,behavior:'smooth'})}/>)}
        <section className="watchlist-promo"><div className="promo-icon"><Bookmark size={20}/></div><div><span className="eyebrow">MAKE IT YOURS</span><h3>Your own little corner of cinema.</h3><p>Keep the films and series you want to come back to, all in one place.</p></div><button className="btn-primary" onClick={() => changePage('watchlist')}>Open my list <ArrowRight size={15}/></button><div className="promo-watermark"><Clapperboard size={120}/></div></section>
      </main>
    </> : <main className="catalogue-page">
      <div className="page-topline"><span>{page === 'watchlist' ? <><Bookmark size={13}/> YOUR COLLECTION</> : page === 'movies' ? <><Film size={13}/> MOVIE LIBRARY</> : <><Tv size={13}/> SERIES LIBRARY</>}</span><span>{page === 'watchlist' ? saved.length + ' SAVED' : 'DISCOVER SOMETHING NEW'}</span></div>
      <div className="catalogue-heading"><div><h1>{page === 'watchlist' ? <>Your <em>watchlist.</em></> : <>{pageTitle.split(' ')[0]} <em>{pageTitle.split(' ').slice(1).join(' ')}</em></>}</h1><p className="page-lead">{page === 'watchlist' ? 'All the stories you have saved, ready when you are.' : 'A world of stories, carefully organised for your next discovery.'}</p></div>
      {page !== 'watchlist' && <label className="sort-select"><SlidersHorizontal size={14}/><select value={sort} onChange={e => {setSort(e.target.value);setCataloguePage(1);}}><option value="popularity.desc">Most popular</option><option value="vote_average.desc">Top rated</option><option value="primary_release_date.desc">Newest first</option><option value="primary_release_date.asc">Oldest first</option></select><ChevronDown size={13}/></label>}</div>
      {page !== 'watchlist' && <div className="filter-line"><span><Filter size={13}/> FILTER BY GENRE</span><div className="filter-chips"><button className={!genre ? 'selected' : ''} onClick={() => {setGenre(null);setGenreName('');setCataloguePage(1);}}>All</button>{currentGenres.map(g => <button key={g.id} className={genre === g.id ? 'selected' : ''} onClick={() => {setGenre(genre === g.id ? null : g.id);setGenreName(genre === g.id ? '' : g.name);setCataloguePage(1);}}>{g.name}</button>)}</div></div>}
      {page === 'watchlist' ? saved.length ? <MediaGrid items={saved} saved={saved} onOpen={openTitle} onSave={toggleSave}/> : <EmptyState title="Your list is waiting" text="Tap the bookmark on any movie or series to save it here." action={() => changePage('home')}/> : catalogueLoading ? <SkeletonGrid/> : catalogue.length ? <MediaGrid items={pageItems} saved={saved} onOpen={openTitle} onSave={toggleSave}/> : <EmptyState title="Nothing to show yet" text="Try another genre or sort option."/>}
      {page !== 'watchlist' && <div className="pagination"><button disabled={cataloguePage <= 1} onClick={() => {setCataloguePage(p => Math.max(1,p-1));window.scrollTo({top:0,behavior:'smooth'});}}><ArrowLeft size={15}/> Previous</button><span>PAGE <b>{cataloguePage}</b> <i/> 500</span><button onClick={() => {setCataloguePage(p => p+1);window.scrollTo({top:0,behavior:'smooth'});}}>Next <ArrowRight size={15}/></button></div>}
    </main>}

    <footer className="site-footer"><div className="footer-main"><a className="wordmark" href="#" onClick={e => {e.preventDefault();changePage('home');}}><span className="wordmark-icon"><Clapperboard size={17}/></span><span>movclip</span><b>®</b></a><p>Discover stories. Find your next favourite.</p><button onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Back to top <ArrowDown size={13}/></button></div><div className="footer-legal"><span>© 2026 MOVCLIP</span><span>Movie and TV data provided by TMDB. Movclip is not endorsed or certified by TMDB.</span><span>BUILT FOR THE LOVE OF STORIES</span></div></footer>

    {loading && <div className="loading-indicator"><i/> Loading the catalogue</div>}
    {error && <div className="error-message"><Info size={15}/>{error} Please check the TMDB_API_KEY environment variable in Netlify.</div>}
    {toast && <div className="toast"><Check size={15}/>{toast}</div>}

    {active && <div className="modal-scrim" onClick={() => setActive(null)}><section className="detail-panel" role="dialog" aria-modal="true" aria-label={titleOf(detail || active)} onClick={e => e.stopPropagation()}>
      <button className="detail-close" onClick={() => setActive(null)} aria-label="Close details"><X size={19}/></button>
      <div className="detail-cover" style={detail?.backdrop_path ? {backgroundImage:'linear-gradient(0deg,#101116 0%,rgba(16,17,22,.08) 85%),url('+image(detail.backdrop_path,'w1280')+')'} : undefined}><span className="cover-chip">{kindOf(active) === 'tv' ? 'SERIES' : 'FILM'} <i/> TMDB</span></div>
      <div className="detail-content"><div className="detail-overline"><span className="eyebrow">TITLE OVERVIEW</span><span className="detail-year">{yearOf(detail || active) || '—'}</span></div><h2>{titleOf(detail || active)}</h2>{detail?.tagline && <p className="detail-tagline">{detail.tagline}</p>}<div className="detail-stats"><span className="hero-rating"><Star size={14} fill="currentColor"/>{ratingOf(detail || active)}</span>{detail?.runtime ? <span>{detail.runtime} min</span> : detail?.episode_run_time?.[0] ? <span>{detail.episode_run_time[0]} min / ep</span> : null}<span>{kindOf(active) === 'tv' ? 'TV series' : 'Movie'}</span>{detail?.genres?.slice(0,3).map(g => <span key={g.id}>{g.name}</span>)}</div><p className="detail-overview">{detail?.overview || active.overview || 'A story waiting to be discovered.'}</p>
        <div className="detail-actions"><button className="btn-primary" onClick={() => toggleSave(active)}>{isSaved(active) ? <Check size={16}/> : <Plus size={16}/>} {isSaved(active) ? 'Saved to my list' : 'Add to my list'}</button>{trailer && <button className="btn-quiet" onClick={() => setTrailerOpen(true)}><Play size={15} fill="currentColor"/> Watch trailer</button>}</div>
        {detailLoading && <div className="detail-loading">Loading title details…</div>}
        {detail?.credits?.cast?.length ? <div className="cast-section"><span className="eyebrow">THE CAST</span><div className="cast-list">{detail.credits.cast.slice(0,6).map(person => <div className="cast-person" key={person.id}>{person.profile_path ? <img src={image(person.profile_path,'w185')} alt=""/> : <span className="cast-placeholder"/>}<strong>{person.name}</strong><small>{person.character}</small></div>)}</div></div> : null}
        {detail?.recommendations?.results?.length ? <div className="recommend-section"><span className="eyebrow">YOU MAY ALSO LIKE</span><div className="recommend-row">{detail.recommendations.results.slice(0,5).map(m => <button key={m.id} onClick={() => openTitle(m)}>{m.poster_path && <img src={image(m.poster_path,'w185')} alt=""/>}<span>{titleOf(m)}</span></button>)}</div></div> : null}
        <div className="detail-disclaimer"><Info size={14}/> Movclip is a discovery catalogue. Streaming availability depends on your region and subscriptions.</div>
      </div>
    </section></div>}
    {trailerOpen && trailer && <div className="trailer-scrim" onClick={() => setTrailerOpen(false)}><div className="trailer-window" onClick={e => e.stopPropagation()}><button onClick={() => setTrailerOpen(false)} aria-label="Close trailer"><X/></button><iframe src={'https://www.youtube-nocookie.com/embed/'+trailer.key+'?autoplay=1'} title="Official trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div>}
  </div>;
}
function ArrowUpRightIcon() { return <ArrowRight size={15}/>; }
function MediaSection({section,items,index,saved,onSave,onOpen,register,onNext,onPrev}:{section:{id:string;title:string;note:string;eyebrow:string};items:Media[];index:number;saved:Media[];onSave:(m:Media)=>void;onOpen:(m:Media)=>void;register:(el:HTMLDivElement|null)=>void;onNext:()=>void;onPrev:()=>void}) {
  return <section className="media-section"><div className="section-heading"><div><span className="eyebrow">{section.eyebrow}</span><h3>{section.title}</h3><p>{section.note}</p></div><div className="row-navigation"><span>{String(index).padStart(2,'0')} / 06</span><button onClick={onPrev} aria-label={'Previous '+section.title}><ChevronLeft size={17}/></button><button onClick={onNext} aria-label={'Next '+section.title}><ChevronRight size={17}/></button></div></div>{items.length ? <div className="poster-row" ref={register}>{items.slice(0,18).map(m => <PosterCard key={kindOf(m)+'-'+m.id} item={m} saved={saved.some(x => x.id === m.id && kindOf(x) === kindOf(m))} onOpen={() => onOpen(m)} onSave={() => onSave(m)}/>)}</div> : <div className="row-skeleton"><span/><span/><span/><span/><span/></div>}</section>;
}
function PosterCard({item,saved,onOpen,onSave}:{item:Media;saved:boolean;onOpen:()=>void;onSave:()=>void}) {
  return <article className="poster-card"><button className="poster-image" onClick={onOpen} aria-label={'Open '+titleOf(item)}>{item.poster_path ? <img src={image(item.poster_path)} alt={titleOf(item)} loading="lazy"/> : <span className="poster-empty"><Clapperboard size={25}/></span>}<span className="poster-hover"><span><Play size={16} fill="currentColor"/></span> View details</span></button><button className={saved ? 'poster-save is-saved' : 'poster-save'} onClick={onSave} aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}>{saved ? <Check size={14}/> : <Plus size={14}/>}</button><div className="poster-caption"><strong>{titleOf(item)}</strong><span><i><Star size={10} fill="currentColor"/>{ratingOf(item)}</i>{yearOf(item) || '—'}<b/> {kindOf(item) === 'tv' ? 'Series' : 'Film'}</span></div></article>;
}
function MediaGrid({items,saved,onOpen,onSave}:{items:Media[];saved:Media[];onOpen:(m:Media)=>void;onSave:(m:Media)=>void}) {
  return <div className="media-grid">{items.map(m => <PosterCard key={kindOf(m)+'-'+m.id} item={m} saved={saved.some(x => x.id === m.id && kindOf(x) === kindOf(m))} onOpen={() => onOpen(m)} onSave={() => onSave(m)}/>)}</div>;
}
function SkeletonGrid() { return <div className="media-grid">{Array.from({length:12},(_,i) => <div className="skeleton-card" key={i}><span/><i/><b/></div>)}</div>; }
function EmptyState({title,text,action}:{title:string;text:string;action?:()=>void}) { return <div className="empty-state"><span><Bookmark size={24}/></span><h3>{title}</h3><p>{text}</p>{action && <button className="btn-primary" onClick={action}>Explore titles <ArrowRight size={14}/></button>}</div>; }
export default App;
