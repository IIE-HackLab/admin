import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import Loader from '../components/ui/Loader'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'


interface PhaseField {
  id: string
  label: string
  type: string
}

interface HackathonPhase {
  id: string
  fields: PhaseField[]
}

interface Hackathon {
  _id: string
  title: string
  phases: HackathonPhase[]
}

interface Registration {
  _id: string
  registrationDate: string
  user: {
    email: string
  }
  responses: Record<string, unknown>
}

const downloadFile = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export function SubmissionDetailsPage() {
  const { hackathonId, registrationId } = useParams({ from: '/h/$hackathonId/submission/$registrationId' })
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const regRes = await fetch(`${import.meta.env.VITE_API_URL}/registrations/detail/${registrationId}`)
        const regData = await regRes.json()
        setRegistration(regData)

        const hRes = await fetch(`${import.meta.env.VITE_API_URL}/hackathons/${hackathonId}`)
        const hData = await hRes.json()
        setHackathon(hData)
      } catch (error) {
        console.error('Failed to fetch submission details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [hackathonId, registrationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Accessing Artifact Manifest..." />
      </div>
    )
  }

  if (!registration) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-black text-rose-500 font-orbitron mb-4">ARTIFACT NOT LOCATED</h2>
        <Link to="/h/$hackathonId/submission" params={{ hackathonId }} className="neon-btn-cyan !px-8">BACK TO NEXUS</Link>
      </div>
    )
  }

  const getTeamName = () => {
    let teamName = '';
    Object.values(registration.responses || {}).forEach((data) => {
        if (data && typeof data === 'object' && 'teamName' in data) {
            teamName = String((data as Record<string, unknown>).teamName);
        }
    });
    return teamName;
  }

  const teamName = getTeamName();

  return (
    <>
    <section className="space-y-8 pb-20">
      <header>
        <Link 
          to="/h/$hackathonId/submission"
          params={{ hackathonId }}
          className="text-[10px] font-black text-slate-500 hover:text-cyan-400 font-orbitron uppercase tracking-widest transition-colors flex items-center gap-2 mb-4"
        >
          ← BACK TO SUBMISSION ARCHIVE
        </Link>
        <div className="flex items-center gap-4">
           <div className="h-10 w-1 bg-cyan-400 shadow-[0_0_15px_#00ffff]" />
           <div>
              <p className="text-[10px] font-black text-cyan-400 font-orbitron uppercase tracking-widest mb-1">Submission Artifact [ {registration._id.substring(registration._id.length - 8).toUpperCase()} ]</p>
              <h1 className="text-4xl font-black text-white font-orbitron tracking-tight uppercase">
                {(registration.responses?.['phase_3_submissions'] as Record<string, unknown>)?.projectName as string || 'UNTITLED_PROJECT'}
              </h1>
           </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar: Submission Overview */}
        <aside className="lg:col-span-1 space-y-6">
          <article className="glass-card p-6 border-cyan-500/20">
            <h3 className="text-xs font-black text-white font-orbitron uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Deployment Intel</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Submission Status</p>
                <div className="flex items-center gap-2 text-cyan-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00ffff]" />
                    <p className="text-[10px] font-bold uppercase font-mono">PACKET_RECEIVED_VERIFIED</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Sync Timestamp</p>
                <p className="text-xs font-mono text-white">{new Date(registration.registrationDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest mb-1">Source Node</p>
                <p className="text-xs font-mono text-white truncate">{registration.user?.email}</p>
              </div>
            </div>
          </article>

          {teamName && (
            <article className="glass-card p-6 border-cyan-500/30 bg-cyan-500/5">
                <h3 className="text-[10px] font-black text-cyan-400 font-orbitron uppercase tracking-widest mb-4">Squad Origin</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Tactical Unit:</p>
                <Link 
                    to="/h/$hackathonId/teams/$teamName"
                    params={{ hackathonId, teamName }}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-cyan-500/20 hover:border-cyan-400 transition-all group"
                >
                    <span className="text-xs font-black text-white font-orbitron uppercase tracking-wider">{teamName}</span>
                    <span className="text-cyan-400">→</span>
                </Link>
            </article>
          )}
        </aside>

        {/* Main Content: Submission Data */}
        <div className="lg:col-span-2 space-y-6">
          <article className="glass-card p-8 border-cyan-500/20">
            <h3 className="text-xl font-black text-white font-orbitron tracking-widest mb-8 flex items-center gap-4">
              <span className="text-cyan-400 text-2xl font-mono">/</span> Artifact Manifest
            </h3>

            <div className="space-y-8">
                {(() => {
                  const submissionPhase = hackathon?.phases?.find((p) => p.id === 'phase_3_submissions');
                  if (!submissionPhase) return <p className="text-xs font-mono text-slate-500 italic uppercase">System phase [phase_3_submissions] not detected in database blueprint.</p>;

                  const phaseResponse = registration.responses?.[submissionPhase.id];
                  if (!phaseResponse) return (
                    <div className="opacity-20 grayscale p-10 border border-dashed border-white/10 text-center">
                        <p className="text-xs font-black text-slate-600 font-orbitron uppercase tracking-widest">No submission telemetry detected for this entity.</p>
                    </div>
                  );

                  return (
                    <div className="grid gap-6">
                        {submissionPhase.fields?.map((field) => {
                          const val = (phaseResponse && typeof phaseResponse === 'object') 
                            ? (phaseResponse as Record<string, unknown>)[field.id] 
                            : phaseResponse;

                          const displayVal = (typeof val === 'string' || typeof val === 'number') ? String(val) : '';
                          
                          return (
                            <div key={field.id} className={field.type === 'file' ? 'col-span-1' : ''}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="h-1 w-1 bg-cyan-400" />
                                    <p className="text-[9px] font-black text-slate-500 font-orbitron uppercase tracking-widest">{field.label}</p>
                                </div>
                                        {field.type === 'file' ? (
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-slate-950 border border-white/5 hover:border-cyan-500/20 transition-all group/artifact">
                                                <div className="h-14 w-14 bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover/artifact:border-cyan-400/50 group-hover/artifact:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all">
                                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                  </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-cyan-400 font-orbitron uppercase tracking-widest mb-1">ARTIFACT_SOURCE</p>
                                                    <p className="text-[9px] font-mono text-slate-500 truncate opacity-60 hover:opacity-100 transition-opacity">{displayVal || 'NO_PATH_LOCATED'}</p>
                                                </div>
                                                {displayVal && (
                                                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                    <button
                                                      type="button"
                                                      onClick={() => setPreviewingUrl(displayVal)}
                                                      className="flex-1 sm:flex-none border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-400 hover:text-black px-4 py-2.5 text-[9px] font-black font-orbitron tracking-widest transition-all uppercase text-center"
                                                    >
                                                      View PDF / Presentation
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => downloadFile(displayVal)}
                                                      className="flex-1 sm:flex-none border border-white/10 bg-white/5 hover:bg-white/20 text-white px-4 py-2.5 text-[9px] font-black font-orbitron tracking-widest transition-all uppercase text-center"
                                                    >
                                                      Download Asset
                                                    </button>
                                                  </div>
                                                )}
                                            </div>
                                        ) : (
                                    <div className="relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-500/30" />
                                      <p className="text-sm text-white font-mono bg-white/5 px-4 py-3 border border-white/5">
                                        {displayVal || 'NULL_ENTRY'}
                                      </p>
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
    {previewingUrl && (
      <PdfPreviewModal
        url={previewingUrl}
        onClose={() => setPreviewingUrl(null)}
      />
    )}
    </>
  )
}
