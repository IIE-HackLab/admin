import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import Loader from '../components/ui/Loader'
import { downloadFile, getCleanViewUrl } from '../lib/cloudinaryUtils'

interface PhaseField {
  id: string
  label: string
  type: string
}

interface Hackathon {
  _id: string
  title: string
  phases: { id: string, name: string, fields?: PhaseField[] }[]
}

interface RegistrationResponse {
  _id: string
  registrationDate: string
  user: {
    name: string
    email: string
  }
  responses: Record<string, unknown>
  evaluations?: {
    judgeEmail: string;
    scores: Record<string, number>;
    feedback?: string;
    evaluatedAt: string;
  }[]
}

interface Invitation {
  inviteeEmail: string
  inviteeName?: string
  status: string
}

export function TeamDetailsPage() {
  const { hackathonId, teamName } = useParams({ from: '/h/$hackathonId/teams/$teamName' })
  const decodedTeamName = decodeURIComponent(teamName)
  const [registrations, setRegistrations] = useState<RegistrationResponse[]>([])
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all registrations to filter by team
        const regRes = await fetch(`${import.meta.env.VITE_API_URL}/registrations/${hackathonId}`)
        const allRegs = await regRes.json()
        
        // Filter by team name
        const filtered = (allRegs as RegistrationResponse[]).filter((reg) => {
            const responses = reg.responses || {}
            let nameInReg = ''
            
            // Check all phases for teamName
            Object.values(responses).forEach((data) => {
                if (data && typeof data === 'object') {
                    const d = data as Record<string, unknown>
                    if (d.teamName) nameInReg = String(d.teamName)
                }
            })
            
            return nameInReg === decodedTeamName
        })
        
        setRegistrations(filtered)

        // Fetch hackathon for phase labels
        const hRes = await fetch(`${import.meta.env.VITE_API_URL}/hackathons/${hackathonId}`)
        const hData = await hRes.json()
        setHackathon(hData)

        // Fetch invitations for team
        const iRes = await fetch(`${import.meta.env.VITE_API_URL}/invitations/team/${hackathonId}/${encodeURIComponent(decodedTeamName)}`)
        const iData = await iRes.json()
        setInvitations(iData)
      } catch (error) {
        console.error('Failed to fetch team details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [hackathonId, decodedTeamName])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Accessing Squad Manifest..." />
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-black text-rose-500 font-orbitron mb-4">SQUAD NOT LOCATED</h2>
        <Link to="/h/$hackathonId/teams" params={{ hackathonId }} className="neon-btn-cyan !px-8">BACK TO SQUAD INTEL</Link>
      </div>
    )
  }


  // Calculate virtual members
  const formationPhaseId = 'phase_2_team_formation';
  const registeredEmails = new Set(registrations.map(r => r.user?.email?.toLowerCase()));
  const virtualEmails: string[] = [];
  
  registrations.forEach(reg => {
    const resp = reg.responses?.[formationPhaseId] as Record<string, string> | undefined;
    if (resp) {
      Object.keys(resp).forEach(key => {
        if (key.startsWith('memberEmail_') && resp[key]) {
          const email = resp[key].toLowerCase();
          if (!registeredEmails.has(email)) {
            virtualEmails.push(email);
          }
        }
      });
    }
  });
  const uniqueVirtualEmails = Array.from(new Set(virtualEmails));
  const totalOperatives = registrations.length + uniqueVirtualEmails.length;

  return (
    <section className="space-y-8 pb-20">
      <header>
        <Link 
          to="/h/$hackathonId/teams"
          params={{ hackathonId }}
          className="text-[10px] font-black text-slate-500 hover:text-cyan-400 font-orbitron uppercase tracking-widest transition-colors flex items-center gap-2 mb-4"
        >
          ← BACK TO TACTICAL UNITS
        </Link>
        <div className="flex items-center gap-4">
           <div className="h-10 w-1 bg-cyan-400 shadow-[0_0_15px_#00ffff]" />
           <div>
              <p className="text-[10px] font-black text-cyan-400 font-orbitron uppercase tracking-widest mb-1">Squad Manifest [ {decodedTeamName.toUpperCase()} ]</p>
              <h1 className="text-4xl font-black text-white font-orbitron tracking-tight uppercase">{decodedTeamName}</h1>
           </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar: Squad Overview */}
        <aside className="lg:col-span-1 space-y-6">
          <article className="glass-card p-6 border-cyan-500/20">
            <h3 className="text-xs font-black text-white font-orbitron uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Squad Composition</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Deployment Strength</p>
                <p className="text-xl font-black text-white font-orbitron">{totalOperatives} OPERATIVES</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Sync Status</p>
                <div className="flex items-center gap-2 text-emerald-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                    <p className="text-[10px] font-bold uppercase font-mono">LINK_ACTIVE</p>
                </div>
              </div>
            </div>
          </article>
          <article className="glass-card p-6 border-white/10">
            <h3 className="text-xs font-black text-white font-orbitron uppercase tracking-widest mb-4">Operative Directory</h3>
            <div className="space-y-3">
               {/* Registered Operatives */}
               {registrations.map((reg, idx) => (
                 <Link 
                    key={reg._id}
                    to="/h/$hackathonId/registrations/$registrationId"
                    params={{ hackathonId, registrationId: reg._id }}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group relative overflow-hidden"
                 >
                    {idx === 0 && (
                      <div className="absolute top-0 right-0 bg-cyan-400 text-[7px] font-black text-slate-950 px-1.5 py-0.5 font-orbitron tracking-tighter">
                        LEADER
                      </div>
                    )}
                    <div className="h-8 w-8 bg-slate-950 border border-white/10 flex items-center justify-center text-[10px] text-white/40 font-mono group-hover:text-cyan-400 transition-colors">
                        {reg.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate font-orbitron uppercase">{reg.user?.name || 'Unknown Entity'}</p>
                        <p className="text-[9px] text-slate-500 truncate font-mono">{reg.user?.email}</p>
                    </div>
                    <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </div>
                 </Link>
               ))}

               {/* Virtual Operatives */}
                {uniqueVirtualEmails.map((email, idx) => {
                  const invite = invitations.find(i => i.inviteeEmail.toLowerCase() === email.toLowerCase());
                  const isAccepted = invite?.status === 'accepted';
                  const name = invite?.inviteeName || 'PENDING_REGISTRATION';
                  
                  return (
                    <div 
                       key={`virtual-${idx}`}
                       className={`flex items-center gap-3 p-3 border transition-all cursor-not-allowed group ${
                         isAccepted 
                          ? 'bg-cyan-500/5 border-cyan-500/20 grayscale-0' 
                          : 'bg-white/[0.02] border-white/5 opacity-50 grayscale hover:grayscale-0'
                       }`}
                    >
                       <div className={`h-8 w-8 border flex items-center justify-center text-[10px] font-mono italic ${
                         isAccepted ? 'bg-cyan-900/40 border-cyan-500/30 text-cyan-400' : 'bg-slate-900 border-white/5 text-white/20'
                       }`}>
                           {isAccepted ? name.charAt(0).toUpperCase() : '?'}
                       </div>
                       <div className="flex-1 min-w-0">
                           <p className={`text-[11px] font-bold truncate font-orbitron uppercase tracking-tighter ${
                             isAccepted ? 'text-cyan-400' : 'text-slate-400'
                           }`}>
                             {name}
                           </p>
                           <p className="text-[9px] text-slate-600 truncate font-mono">{email}</p>
                       </div>
                    </div>
                  );
                })}
            </div>
          </article>

          {/* Project Artifacts Section */}
          <article className="glass-card p-6 border-cyan-500/20">
            <h3 className="text-xs font-black text-white font-orbitron uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
               <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z"/></svg>
               Project Artifacts
            </h3>
            {(() => {
              const submissionReg = registrations.find(r => r.responses?.['phase_3_submissions']);
              const submission = submissionReg?.responses?.['phase_3_submissions'] as Record<string, string> | undefined;
              
              if (!submissionReg || !submission) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 border border-white/5 bg-white/5 opacity-50">
                    <p className="text-[10px] font-black text-slate-500 font-orbitron uppercase">Packet Standby</p>
                    <p className="text-[8px] font-mono text-slate-600 mt-1">NO DATA TRANSMITTED</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Official Entry</p>
                    <p className="text-sm font-black text-white font-orbitron uppercase truncate">{submission.projectName || 'Unnamed Project'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {submission.repoLink && (
                      <a href={submission.repoLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 font-orbitron uppercase hover:bg-cyan-500/20 transition-all">Repository</a>
                    )}
                    {submission.demoLink && (
                      <a href={submission.demoLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 font-orbitron uppercase hover:bg-emerald-500/20 transition-all">Live Demo</a>
                    )}
                    {Object.entries(submission).map(([key, val]) => {
                      if (typeof val === 'string' && val.includes('cloudinary.com') && key !== 'banner') {
                        const isDoc = val.includes('/raw/upload/') || /\.(pdf|ppt|pptx|doc|docx)$/i.test(val);
                        const viewUrl = isDoc ? `https://docs.google.com/viewer?url=${encodeURIComponent(getCleanViewUrl(val))}` : val;
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <a href={viewUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-400 font-orbitron uppercase hover:bg-purple-500/20 transition-all">
                              {isDoc ? 'View PPT/PDF' : 'Project Asset'}
                            </a>
                            {isDoc && (
                              <button type="button" onClick={() => downloadFile(val)} className="px-2 py-1.5 bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 font-orbitron uppercase hover:bg-white/10 transition-all" title="Download Asset">
                                ⬇
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <Link 
                    to="/h/$hackathonId/submission/$registrationId" 
                    params={{ hackathonId, registrationId: submissionReg._id }}
                    className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-white/5 border border-white/10 hover:border-cyan-500/40 text-[9px] font-black text-white font-orbitron uppercase tracking-[0.2em] transition-all group"
                  >
                    View Full Analysis
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </Link>
                </div>
              );
            })()}
          </article>
        </aside>

        {/* Main Content: Formation & Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <article className="glass-card p-8 border-cyan-500/20">
            <h3 className="text-xl font-black text-white font-orbitron tracking-widest mb-8 flex items-center gap-4">
              <span className="text-cyan-400 text-2xl font-mono">/</span> Formation Manifest
            </h3>

            <div className="space-y-6">
                {(() => {
                  const formationPhase = hackathon?.phases?.find((p) => p.id === formationPhaseId);
                  if (!formationPhase) return <p className="text-xs font-mono text-slate-500 italic uppercase">System phase [{formationPhaseId}] not detected.</p>;

                  const phaseResponses = registrations.map(r => r.responses?.[formationPhase.id]).filter(Boolean);
                  if (phaseResponses.length === 0) return <p className="text-[10px] font-mono text-slate-600 uppercase">No formation telemetry recorded.</p>;

                  return (
                    <div className="grid gap-4">
                        {formationPhase.fields?.map((field: PhaseField) => {
                          const values = phaseResponses
                            .map((pr) => (pr as Record<string, unknown>)[field.id])
                            .filter((v) => v !== undefined && v !== "");
                          const uniqueValues = Array.from(new Set(values));
                          if (uniqueValues.length === 0) return null;
                          return (
                            <div
                              key={field.id}
                              className="p-4 bg-slate-900/40 border border-white/5"
                            >
                              <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-2">
                                {field.label}
                              </p>
                              <p className="text-sm text-white font-mono">
                                {String(uniqueValues[0])}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
            </div>
          </article>

          <article className="glass-card p-8 border-cyan-500/10">
            <div className="mb-8 flex items-center gap-4 border-b border-cyan-500/10 pb-6">
              <div className="h-8 w-1 bg-cyan-400 shadow-[0_0_15px_#00ffff]" />
              <h2 className="text-2xl font-black text-white tracking-widest font-orbitron">Packet Stream</h2>
            </div>

            <div className="soft-scrollbar overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="text-left border-b border-white/5">
                    <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron">Packet UID</th>
                    <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron">Operative</th>
                    <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron">Deployment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrations.filter(r => r.responses?.['phase_3_submissions']).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 font-orbitron">
                        No packets detected in stream
                      </td>
                    </tr>
                  ) : (
                    registrations.filter(r => r.responses?.['phase_3_submissions']).map((row) => (
                      <tr key={row._id} className="group hover:bg-cyan-500/[0.02] transition-colors relative">
                        <td className="py-6 px-4">
                          <span className="text-xs font-black text-cyan-400 font-orbitron tracking-widest uppercase">
                            {row._id.substring(row._id.length - 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-6 px-4">
                          <p className="text-xs font-black text-white uppercase tracking-widest font-orbitron">{row.user?.name}</p>
                          <Link 
                            to="/h/$hackathonId/submission/$registrationId" 
                            params={{ hackathonId, registrationId: row._id }}
                            className="absolute inset-0 z-10"
                          />
                        </td>
                        <td className="py-6 px-4">
                           <span className="text-[10px] font-black text-white bg-slate-900 border border-slate-800 px-3 py-1 font-orbitron">
                              {decodedTeamName.toUpperCase()}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        
        {/* Evaluations Section */}
        <div className="lg:col-span-3 space-y-6">
          <article className="glass-card p-8 border-cyan-500/20">
            <h3 className="text-xl font-black text-white font-orbitron tracking-widest mb-8 flex items-center gap-4">
              <span className="text-cyan-400 text-2xl font-mono">/</span> Evaluation Telemetry
            </h3>
            <div className="space-y-6">
              {(() => {
                const regsWithEvals = registrations.filter(r => r.evaluations && r.evaluations.length > 0);
                if (regsWithEvals.length === 0) {
                   return <p className="text-[10px] font-mono text-slate-600 uppercase">No evaluation data available.</p>;
                }
                
                // Aggregate evaluations from all team members (usually only one has it, but just in case)
                const allEvals = regsWithEvals.flatMap(r => r.evaluations || []);
                
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    {allEvals.map((ev, i) => {
                      const totalScore = Object.values(ev.scores).reduce((a, b) => a + b, 0);
                      return (
                        <div key={i} className="p-4 bg-slate-900/40 border border-cyan-500/20">
                          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black text-cyan-400 font-orbitron uppercase tracking-widest">{ev.judgeEmail}</span>
                            <span className="text-xs font-bold text-white font-mono bg-cyan-500/20 px-2 py-1 rounded">Total: {totalScore}</span>
                          </div>
                          <div className="space-y-2 mb-4">
                            {Object.entries(ev.scores).map(([param, score]) => (
                              <div key={param} className="flex justify-between text-xs font-mono">
                                <span className="text-slate-400">{param}</span>
                                <span className="text-white font-bold">{score}</span>
                              </div>
                            ))}
                          </div>
                          {ev.feedback && (
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Feedback</p>
                              <p className="text-sm text-slate-300 italic">"{ev.feedback}"</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                );
              })()}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
