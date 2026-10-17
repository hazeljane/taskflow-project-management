import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardList, Clock3, Code2, FolderKanban, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X, Eye, FileCheck2, MessageSquare
} from 'lucide-react';
import { api, send } from './api';

const moneyDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
const initials = (name = '') => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
const statusClass = (status = '') => ({
  'Assigned': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-orange-100 text-orange-700',
  'Submitted': 'bg-blue-100 text-blue-700',
  'Pending Review': 'bg-blue-100 text-blue-700',
  'Revision Requested': 'bg-rose-100 text-rose-700',
  'Approved': 'bg-emerald-100 text-emerald-700'
}[status] || 'bg-slate-100 text-slate-700');

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [section, setSection] = useState('Overview');
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [projectModal, setProjectModal] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function loadWorkspace() {
    const [p, s] = await Promise.all([api('/projects'), api('/submissions')]);
    setProjects(p.projects || []);
    setSubmissions(s.submissions || []);
    if (user?.role === 'admin') {
      const m = await api('/users');
      setMembers(m.users || []);
    }
  }

  useEffect(() => {
    api('/auth/me').then(({ user }) => setUser(user)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadWorkspace().catch((err) => setNotice(err.message));
    // Data is refreshed after successful actions; user identity controls role-specific requests.
  }, [user?.id]);

  async function authenticate(event) {
    event.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const result = await api(authMode === 'login' ? '/auth/login' : '/auth/register', send('POST', body));
      setUser(result.user);
      setSection('Overview');
      navigate('/');
    } catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } finally {
      setUser(null); setProjects([]); setSubmissions([]); setMembers([]); setSection('Overview'); navigate('/');
    }
  }

  async function refresh() {
    try { await loadWorkspace(); setNotice('Workspace updated.'); }
    catch (err) { setNotice(err.message); }
  }

  if (checking) return <div className="grid min-h-screen place-items-center bg-peach text-caramel"><div className="rounded-2xl bg-white p-8 shadow-soft">Loading TaskFlow…</div></div>;
  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={authenticate} error={authError} busy={authBusy} />;

  const admin = user.role === 'admin';
  const navItems = admin
    ? [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Projects', icon: FolderKanban }, { label: 'Team Members', icon: Users }, { label: 'Submissions', icon: FileCheck2 }, { label: 'Activity Log', icon: Activity }, { label: 'Settings', icon: Settings }]
    : [{ label: 'Overview', icon: LayoutDashboard }, { label: 'My Projects', icon: FolderKanban }, { label: 'My Submissions', icon: FileCheck2 }, { label: 'Settings', icon: Settings }];
  const pending = submissions.filter(s => s.status === 'Pending Review').length;
  const completed = projects.filter(p => p.status === 'Approved').length;
  const filteredProjects = projects.filter(p => `${p.title} ${p.assignedTo?.name || ''} ${p.status}`.toLowerCase().includes(search.toLowerCase()));

  async function createProject(event) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      await api('/projects', send('POST', body));
      setProjectModal(false); await refresh(); setNotice('Project assigned successfully.');
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  async function updateProgress(projectId, progress) {
    try { await api(`/projects/${projectId}/progress`, send('PATCH', { progress: Number(progress) })); await refresh(); }
    catch (err) { setNotice(err.message); }
  }

  async function submitProject(event, project) {
    event.preventDefault(); setBusy(true);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api(`/projects/${project._id}/submissions`, send('POST', body));
      await refresh(); setNotice('Your work was submitted for review.');
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  async function reviewSubmission(event) {
    event.preventDefault(); setBusy(true);
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api(`/submissions/${reviewItem._id}/review`, send('PATCH', body));
      setReviewItem(null); await refresh(); setNotice('Review saved and member notified in their workspace.');
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#fff8f2] text-ink">
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${mobileNav ? 'fixed inset-0 z-40 flex' : 'hidden'} lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col bg-gradient-to-b from-[#ffd9b8] via-[#ffad70] to-[#ed6b18] p-5 text-ink`}>
          <div className="mb-10 flex items-center justify-between gap-3 px-2 pt-2">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/75 text-orange-600 shadow-sm"><Code2 size={25}/></div><div><div className="text-lg font-black tracking-tight">TASKFLOW</div><div className="text-[10px] font-bold tracking-[.32em]">PROJECT HUB</div></div></div>
            <button className="lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X/></button>
          </div>
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-black/55">Workspace</div>
          <nav className="space-y-1.5">
            {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setSection(label); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${section === label ? 'border border-white/80 bg-white/60 shadow-sm' : 'hover:bg-white/30'}`}><Icon size={18}/>{label}{label === 'Submissions' && pending > 0 && admin && <span className="ml-auto rounded-full bg-orange-600 px-2 py-0.5 text-xs text-white">{pending}</span>}</button>)}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/50 bg-white/25 p-4"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60"><CircleHelp size={19}/></div><p className="font-bold">Keep work moving.</p><p className="mt-1 text-xs leading-5 text-black/65">Clear updates. Helpful feedback. Better projects.</p></div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 xl:p-8">
          <header className="mb-7 flex flex-wrap items-center gap-4">
            <button onClick={() => setMobileNav(true)} className="rounded-xl border border-orange-100 bg-white p-2 lg:hidden" aria-label="Open navigation"><Menu/></button>
            <div className="min-w-[220px] flex-1"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-600">{admin ? 'Admin workspace' : 'Team workspace'}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{section === 'Overview' ? (admin ? 'Project Overview' : 'My Workspace') : section}</h1><p className="mt-1 text-sm text-slate-500">{admin ? 'Manage projects, track progress, and support your team.' : 'Stay on top of assignments and share your latest work.'}</p></div>
            <div className="relative hidden w-full max-w-sm sm:block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or members…" className="field pl-11"/></div>
            <button className="relative rounded-xl border border-orange-100 bg-white p-3 text-slate-600" title={`${pending} pending submissions`}><Bell size={19}/>{pending > 0 && admin && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">{pending}</span>}</button>
            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-2 pr-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 font-bold text-orange-800">{initials(user.name)}</div><div className="hidden sm:block"><p className="text-sm font-bold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role === 'admin' ? 'Administrator' : user.title || 'Team Member'}</p></div><button onClick={logout} title="Sign out" className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-orange-50"><LogOut size={17}/></button></div>
          </header>

          {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16}/></button></div>}
          {section === 'Overview' && <Overview admin={admin} user={user} projects={projects} members={members} submissions={submissions} onCreate={() => setProjectModal(true)} onReview={setReviewItem} onProgress={updateProgress} onSubmit={submitProject} busy={busy}/>}
          {(section === 'Projects' || section === 'My Projects') && <ProjectsSection admin={admin} projects={filteredProjects} members={members} onCreate={() => setProjectModal(true)} onProgress={updateProgress} onSubmit={submitProject} busy={busy}/>}
          {section === 'Team Members' && <MembersSection members={members} projects={projects}/>}
          {(section === 'Submissions' || section === 'My Submissions') && <SubmissionsSection admin={admin} submissions={submissions} onReview={setReviewItem}/>}
          {section === 'Activity Log' && <ActivitySection projects={projects} submissions={submissions}/>}
          {section === 'Settings' && <SettingsSection user={user} onLogout={logout}/>}
        </main>
      </div>
      {projectModal && <Modal title="Assign a new project" onClose={() => setProjectModal(false)}><form onSubmit={createProject} className="space-y-4">
        <Field label="Project title"><input name="title" required maxLength="120" className="field" placeholder="e.g. Portfolio Redesign"/></Field>
        <Field label="Project brief"><textarea name="description" maxLength="2000" rows="3" className="field" placeholder="Describe the expected outcome…"/></Field>
        <Field label="Assign to"><select name="assignedTo" required className="field"><option value="">Choose a team member</option>{members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.title}</option>)}</select>{members.length === 0 && <p className="mt-1 text-xs text-orange-700">Create a member account first, then refresh this page.</p>}</Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Due date"><input name="dueDate" type="date" required min={new Date().toISOString().slice(0,10)} className="field"/></Field><Field label="Priority"><select name="priority" className="field"><option>Medium</option><option>High</option><option>Low</option></select></Field></div>
        <button disabled={busy || !members.length} className="btn-primary w-full">{busy ? 'Assigning…' : 'Assign project'}</button>
      </form></Modal>}
      {reviewItem && <Modal title="Review submission" onClose={() => setReviewItem(null)}><form onSubmit={reviewSubmission} className="space-y-4">
        <div className="rounded-xl bg-orange-50 p-4"><p className="font-bold">{reviewItem.project?.title || 'Project submission'}</p><p className="mt-1 text-sm text-slate-500">Submitted by {reviewItem.submittedBy?.name}</p><a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 underline" href={reviewItem.link} target="_blank" rel="noreferrer"><Eye size={16}/> Open submitted work</a><p className="mt-3 whitespace-pre-wrap text-sm">{reviewItem.notes || 'No additional notes.'}</p></div>
        <Field label="Decision"><select name="status" className="field" defaultValue="Approved"><option>Approved</option><option>Revision Requested</option></select></Field>
        <Field label="Feedback for the team member"><textarea name="feedback" rows="4" maxLength="3000" className="field" placeholder="Explain what is good or what needs to change…"/></Field>
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Saving…' : 'Save review'}</button>
      </form></Modal>}
    </div>
  );
}

function AuthScreen({ mode, setMode, onSubmit, error, busy }) {
  return <div className="grid min-h-screen bg-[#fff4e9] lg:grid-cols-[1fr_1fr]">
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#ffe1c6] via-[#ffad70] to-[#ed6b18] p-12 lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/75 text-orange-700"><Code2 size={28}/></div><div><p className="text-xl font-black">TASKFLOW</p><p className="text-[10px] font-bold tracking-[.35em]">PROJECT HUB</p></div></div><div className="relative z-10 max-w-xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/30 px-4 py-2 text-sm font-semibold"><ShieldCheck size={16}/> Your team's work, in one place</div><h1 className="text-5xl font-black leading-tight tracking-tight">Better projects.<br/>Stronger teams.<br/><span className="text-white">Clear progress.</span></h1><p className="mt-6 max-w-md leading-7 text-black/65">Assign work, share updates, and turn feedback into better results with a simple collaborative workspace.</p><div className="mt-9 grid max-w-lg grid-cols-3 gap-3">{[['01','Assign'],['02','Submit'],['03','Review']].map(([n,t]) => <div key={n} className="rounded-2xl border border-white/60 bg-white/30 p-4"><p className="text-xs font-bold text-orange-800">{n}</p><p className="mt-2 font-bold">{t}</p></div>)}</div></div><p className="text-sm font-medium text-black/60">TASKFLOW • Project management made clearer</p><div className="pointer-events-none absolute -bottom-20 -right-10 h-80 w-80 rounded-full border-[45px] border-white/15"/></section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><p className="text-xl font-black">TASKFLOW</p><p className="text-xs tracking-[.3em]">PROJECT HUB</p></div><div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-orange-600">{mode === 'login' ? 'Welcome back' : 'Join your workspace'}</p><h2 className="mt-2 text-3xl font-black">{mode === 'login' ? 'Sign in to TaskFlow' : 'Create your account'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Use your account to continue to your workspace.' : 'New accounts are team member accounts.'}</p></div>
      <form onSubmit={onSubmit} className="space-y-4">{mode === 'register' && <Field label="Full name"><input name="name" required minLength="2" maxLength="80" autoComplete="name" className="field" placeholder="Your full name"/></Field>}<Field label="Email address"><input name="email" type="email" required maxLength="254" autoComplete="email" className="field" placeholder="you@example.com"/></Field><Field label="Password"><input name="password" type="password" required minLength={mode === 'register' ? 10 : 1} maxLength="128" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field" placeholder={mode === 'register' ? 'At least 10 characters' : 'Enter your password'}/></Field>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}<button disabled={busy} className="btn-primary w-full">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>
      <p className="mt-6 text-center text-sm text-slate-500">{mode === 'login' ? "Don't have a team account?" : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-orange-700 hover:underline">{mode === 'login' ? 'Create account' : 'Sign in'}</button></p><p className="mt-5 text-center text-xs leading-5 text-slate-400">Admin accounts are provisioned by the server administrator. Public registration cannot create an admin account.</p>
    </div></section>
  </div>;
}

function Overview({ admin, user, projects, members, submissions, onCreate, onReview, onProgress, onSubmit, busy }) {
  const inProgress = projects.filter(p => p.status === 'In Progress').length;
  const completed = projects.filter(p => p.status === 'Approved').length;
  const pending = submissions.filter(s => s.status === 'Pending Review').length;
  const average = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
  const cards = admin
    ? [{ label: 'Total Projects', value: projects.length, icon: FolderKanban, foot: 'Across your workspace' }, { label: 'In Progress', value: inProgress, icon: Clock3, foot: 'Active assignments' }, { label: 'Awaiting Review', value: pending, icon: Eye, foot: 'Need your attention' }, { label: 'Approved', value: completed, icon: CheckCircle2, foot: 'Completed projects' }]
    : [{ label: 'My Projects', value: projects.length, icon: FolderKanban, foot: 'Assigned to you' }, { label: 'In Progress', value: inProgress, icon: Clock3, foot: 'Work underway' }, { label: 'Awaiting Review', value: submissions.filter(s => s.status === 'Pending Review').length, icon: Eye, foot: 'Submitted by you' }, { label: 'Approved', value: completed, icon: CheckCircle2, foot: 'Work accepted' }];
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, foot }) => <div key={label} className="panel p-5"><div className="flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700"><Icon size={21}/></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{label === 'Awaiting Review' && value ? 'Action needed' : 'Live'}</span></div><p className="mt-5 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-2 text-xs text-slate-400">{foot}</p></div>)}</div>
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 p-5"><div><h2 className="font-extrabold">{admin ? 'Project Progress' : 'Your Assignments'}</h2><p className="mt-1 text-xs text-slate-500">{admin ? 'Track every assigned project and its current status.' : 'Update progress and submit completed work.'}</p></div>{admin && <button onClick={onCreate} className="btn-primary"><Plus size={16}/> Assign project</button>}</div>
        {projects.length === 0 ? <Empty title="No projects yet" text={admin ? 'Assign the first project to a team member.' : 'Your admin has not assigned a project yet.'} /> : <ProjectList admin={admin} projects={projects.slice(0,5)} onProgress={onProgress} onSubmit={onSubmit} busy={busy}/>}
      </section>
      <section className="panel"><div className="border-b border-orange-100 p-5"><h2 className="font-extrabold">{admin ? 'Recent Submissions' : 'Latest Feedback'}</h2><p className="mt-1 text-xs text-slate-500">{admin ? 'Review work submitted by your team.' : 'Updates on your submitted work.'}</p></div><div className="space-y-3 p-4">{submissions.length === 0 ? <Empty title="Nothing here yet" text={admin ? 'New submissions will appear here.' : 'Your submitted projects will show here.'}/> : submissions.slice(0,4).map(s => <div key={s._id} className="rounded-2xl border border-orange-100 bg-white/70 p-4"><div className="flex items-start gap-3"><Avatar name={s.submittedBy?.name || user.name}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.project?.title || 'Project submission'}</p><p className="mt-0.5 text-xs text-slate-500">{admin ? s.submittedBy?.name : `Submitted ${moneyDate(s.createdAt)}`}</p><div className="mt-2"><Status status={s.status}/></div>{s.feedback && <p className="mt-2 text-xs leading-5 text-slate-600">Feedback: {s.feedback}</p>}</div>{admin && s.status === 'Pending Review' && <button onClick={() => onReview(s)} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600">Review</button>}</div></div>)}</div></section>
    </div>
    <section className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-extrabold">{admin ? 'Team Snapshot' : 'My Progress'}</h2><p className="mt-1 text-xs text-slate-500">{admin ? 'Current completion by team member.' : 'Your average progress across assigned projects.'}</p></div><div className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">{average}% average</div></div>{admin ? members.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{members.slice(0,8).map(m => { const own = projects.filter(p => (p.assignedTo?._id || p.assignedTo) === m.id); const pct = own.length ? Math.round(own.reduce((sum,p) => sum + p.progress,0)/own.length) : 0; return <div key={m.id} className="rounded-2xl border border-orange-100 p-4"><div className="flex items-center gap-3"><Avatar name={m.name}/><div className="min-w-0"><p className="truncate text-sm font-bold">{m.name}</p><p className="text-xs text-slate-500">{m.title}</p></div></div><div className="mt-4 flex justify-between text-xs"><span className="text-slate-500">{own.length} projects</span><b>{pct}%</b></div><Progress value={pct}/></div>})}</div> : <Empty title="No team members yet" text="Team accounts appear after users register."/> : <div className="max-w-xl"><div className="mb-2 flex justify-between text-sm"><span>Overall completion</span><b>{average}%</b></div><Progress value={average}/><p className="mt-3 text-xs text-slate-500">{completed} approved out of {projects.length} assigned projects.</p></div>}</section>
  </div>;
}

function ProjectsSection({ admin, projects, members, onCreate, onProgress, onSubmit, busy }) {
  return <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 p-5"><div><h2 className="font-extrabold">{admin ? 'All Projects' : 'My Projects'}</h2><p className="mt-1 text-xs text-slate-500">{projects.length} project{projects.length === 1 ? '' : 's'} found</p></div>{admin && <button onClick={onCreate} className="btn-primary"><Plus size={16}/> Assign project</button>}</div><ProjectList admin={admin} projects={projects} members={members} onProgress={onProgress} onSubmit={onSubmit} busy={busy}/></section>;
}

function ProjectList({ admin, projects, onProgress, onSubmit, busy }) {
  if (!projects.length) return <Empty title="No matching projects" text="Try a different search or create a project assignment." />;
  return <div className="divide-y divide-orange-100">{projects.map(p => <article key={p._id} className="p-5 transition hover:bg-orange-50/40"><div className="flex flex-wrap items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700"><BriefcaseBusiness size={20}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{p.title}</h3><Status status={p.status}/><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.priority === 'High' ? 'bg-rose-50 text-rose-700' : p.priority === 'Low' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{p.priority} priority</span></div><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{p.description || 'No project brief provided.'}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{admin ? `Assigned to ${p.assignedTo?.name || 'Team member'}` : `Due ${moneyDate(p.dueDate)}`}</span>{admin && <span>Due {moneyDate(p.dueDate)}</span>}</div><div className="mt-4 max-w-xl"><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-slate-600">Progress</span><b>{p.progress}%</b></div><Progress value={p.progress}/></div>
      {!admin && !['Submitted','Approved'].includes(p.status) && <div className="mt-4 flex flex-col gap-3 rounded-xl bg-orange-50 p-3 sm:flex-row sm:items-center"><label className="flex flex-1 items-center gap-3 text-xs font-semibold">Update progress <input aria-label={`Progress for ${p.title}`} type="range" min="0" max="99" value={p.progress} onChange={e => onProgress(p._id,e.target.value)} onMouseUp={e => onProgress(p._id,e.currentTarget.value)} onTouchEnd={e => onProgress(p._id,e.currentTarget.value)} className="w-full accent-orange-600"/><span>{p.progress}%</span></label><form className="flex flex-wrap gap-2" onSubmit={e => onSubmit(e,p)}><input name="link" type="url" required placeholder="Project URL" className="field min-w-0 flex-1 sm:w-40"/><input name="notes" placeholder="Submission notes" className="field min-w-0 flex-1 sm:w-44"/><button disabled={busy} className="btn-primary">{busy ? 'Sending…' : 'Submit work'}</button></form></div>}
      {p.status === 'Revision Requested' && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Revision requested. Review the feedback under My Submissions, update your work, then submit again.</p>}
      </div></div></article>)}</div>;
}

function MembersSection({ members, projects }) {
  return <section className="panel overflow-hidden"><div className="border-b border-orange-100 p-5"><h2 className="font-extrabold">Team Members</h2><p className="mt-1 text-xs text-slate-500">Members who can receive project assignments.</p></div>{members.length ? <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{members.map(m => { const count = projects.filter(p => (p.assignedTo?._id || p.assignedTo) === m.id).length; return <div key={m.id} className="rounded-2xl border border-orange-100 bg-white/70 p-5"><div className="flex items-center gap-3"><Avatar name={m.name}/><div><p className="font-bold">{m.name}</p><p className="text-xs text-slate-500">{m.title}</p></div></div><p className="mt-4 break-all text-sm text-slate-600">{m.email}</p><div className="mt-4 flex items-center justify-between border-t border-orange-100 pt-3 text-sm"><span className="text-slate-500">Assigned projects</span><b>{count}</b></div></div>})}</div> : <Empty title="No team members yet" text="Ask your team to create member accounts using the registration page."/>}</section>;
}

function SubmissionsSection({ admin, submissions, onReview }) {
  return <section className="panel"><div className="border-b border-orange-100 p-5"><h2 className="font-extrabold">{admin ? 'Submission Review Queue' : 'My Submissions'}</h2><p className="mt-1 text-xs text-slate-500">{admin ? 'Inspect submitted work and approve or request revisions.' : 'Check submission status and read admin feedback.'}</p></div><div className="space-y-3 p-4 sm:p-5">{submissions.length ? submissions.map(s => <div key={s._id} className="rounded-2xl border border-orange-100 bg-white/70 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{s.project?.title || 'Project'}</h3><p className="mt-1 text-xs text-slate-500">{admin ? `Submitted by ${s.submittedBy?.name}` : `Submitted ${moneyDate(s.createdAt)}`}</p></div><Status status={s.status}/></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{s.notes || 'No submission notes.'}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><a href={s.link} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-orange-700 underline">Open submitted work ↗</a>{admin && s.status === 'Pending Review' && <button onClick={() => onReview(s)} className="btn-primary">Review submission</button>}</div>{s.feedback && <div className="mt-4 rounded-xl bg-orange-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-orange-700">Admin feedback</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{s.feedback}</p><p className="mt-2 text-xs text-slate-500">{s.reviewedBy?.name ? `Reviewed by ${s.reviewedBy.name}` : ''}{s.reviewedAt ? ` · ${moneyDate(s.reviewedAt)}` : ''}</p></div>}</div>) : <Empty title="No submissions yet" text={admin ? 'Submitted work will appear here for review.' : 'Submit a project URL from your project list when your work is ready.'}/>}</div></section>;
}

function ActivitySection({ projects, submissions }) {
  const events = [...projects.map(p => ({ id: `p-${p._id}`, title: p.title, detail: `Project status: ${p.status}`, date: p.updatedAt, icon: FolderKanban })), ...submissions.map(s => ({ id: `s-${s._id}`, title: s.project?.title || 'Project submission', detail: `${s.submittedBy?.name || 'Member'} · ${s.status}`, date: s.updatedAt, icon: MessageSquare }))].sort((a,b) => new Date(b.date) - new Date(a.date));
  return <section className="panel p-5"><h2 className="font-extrabold">Recent Activity</h2><p className="mt-1 text-xs text-slate-500">Latest project and submission updates.</p>{events.length ? <div className="mt-6 space-y-5">{events.map(e => <div key={e.id} className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700"><e.icon size={18}/></div><div className="flex-1 border-b border-orange-100 pb-4"><p className="font-bold">{e.title}</p><p className="mt-1 text-sm text-slate-500">{e.detail}</p><p className="mt-1 text-xs text-slate-400">{moneyDate(e.date)}</p></div></div>)}</div> : <Empty title="No activity yet" text="Project and submission events will appear here."/>}</section>;
}

function SettingsSection({ user, onLogout }) {
  return <section className="panel max-w-2xl p-6"><h2 className="text-lg font-extrabold">Account Settings</h2><p className="mt-1 text-sm text-slate-500">Your current profile and session controls.</p><div className="mt-6 flex items-center gap-4 rounded-2xl bg-orange-50 p-4"><Avatar name={user.name}/><div><p className="font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p><span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-orange-700">{user.role}</span></div></div><button onClick={onLogout} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><LogOut size={16}/> Sign out</button></section>;
}

function Field({ label, children }) { return <label className="block text-sm font-semibold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="my-8 w-full max-w-xl rounded-3xl border border-white bg-[#fffaf6] p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="rounded-xl p-2 hover:bg-orange-100" aria-label="Close dialog"><X size={19}/></button></div>{children}</div></div>; }
function Avatar({ name }) { return <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-orange-100 to-orange-300 text-xs font-black text-orange-900 shadow-sm">{initials(name)}</div>; }
function Status({ status }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(status)}`}>{status}</span>; }
function Progress({ value = 0 }) { return <div className="h-2.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all" style={{ width: `${Math.max(0,Math.min(100,value))}%` }}/></div>; }
function Empty({ title, text }) { return <div className="grid min-h-40 place-items-center p-8 text-center"><div><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700"><ClipboardList size={21}/></div><p className="font-bold">{title}</p><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p></div></div>; }

export default App;
