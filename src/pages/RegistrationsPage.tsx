import { useEffect, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { auth, onAuthStateChanged } from '../lib/firebase'
import type { User } from '../lib/firebase'
import Loader from '../components/ui/Loader'
import QRScanner from '../components/QRScanner'
import { Toaster, toast } from 'sonner'

export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Done'

export type Registration = {
  mongoId: string
  participant: string
  email: string
  team: string
  track: string
  checkIn: string
  status: RegistrationStatus
  phases: boolean[]
  responses: Record<string, unknown>
  registrationData: Record<string, unknown>
  attendance?: boolean
  food?: boolean
  firebaseUid?: string
}

interface Hackathon {
  _id: string
  title: string
  phases: { id: string }[]
}

interface RegistrationResponse {
  _id: string
  userId?: string
  registrationDate: string
  status?: RegistrationStatus
  user?: { name?: string; email?: string; uid?: string }
  responses: Record<string, unknown>
  attendance?: boolean
  food?: boolean
}

export function RegistrationsPage() {
  const { hackathonId } = useParams({ from: '/h/$hackathonId' })
  const [data, setData] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [hackathonData, setHackathonData] = useState<Hackathon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState('All')
  const [foodFilter, setFoodFilter] = useState('All')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Registration; direction: 'asc' | 'desc' } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState<'attendance' | 'food' | null>(null)
  const [showModeSelection, setShowModeSelection] = useState(false)
  const [lastScanned, setLastScanned] = useState<{ id: string; time: number } | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const extractUidFromScannedText = (rawText: string): string => {
    const trimmed = rawText.trim()
    if (!trimmed) return ''

    // Match any URL pattern containing /[UID]/profile (handles localhost, custom domains, trailing slashes, query params)
    const profileMatch = trimmed.match(/(?:.*\/)?([^\/]+)\/profile(?:\/|\?.*)?$/i)
    if (profileMatch && profileMatch[1]) {
      return profileMatch[1]
    }

    // URL parsing fallback
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsedUrl = new URL(trimmed)
        const segments = parsedUrl.pathname.split('/').filter(Boolean)
        if (segments.length >= 2 && segments[segments.length - 1].toLowerCase() === 'profile') {
          return segments[segments.length - 2]
        }
        if (segments.length >= 1) {
          return segments[segments.length - 1]
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    return trimmed
  }

  const handleScan = async (decodedText: string) => {
    const userUID = extractUidFromScannedText(decodedText)

    if (userUID) {
      // Prevent duplicate rapid scans (within 3 seconds)
      if (lastScanned && lastScanned.id === userUID && Date.now() - lastScanned.time < 3000) {
        return
      }

      // Match against firebaseUid, mongoId, or email
      const userExists = data.find(reg => 
        (reg.firebaseUid && reg.firebaseUid === userUID) ||
        (reg.mongoId && reg.mongoId === userUID) ||
        (reg.email && reg.email.toLowerCase() === userUID.toLowerCase())
      )

      const targetUid = userExists?.firebaseUid || userUID
      
      if (userExists) {
        // Check if already marked to avoid redundant updates
        if (userExists[scanMode!]) {
          toast.info(`${userExists.participant} already marked for ${scanMode}`, {
            style: { background: '#0f172a', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22d3ee' }
          })
          setLastScanned({ id: userUID, time: Date.now() })
          return
        }

        // Update local state
        setData(prev => prev.map(reg => {
          if (reg.firebaseUid === targetUid || reg.mongoId === userExists.mongoId) {
            return { ...reg, [scanMode!]: true }
          }
          return reg
        }))
        
        setLastScanned({ id: userUID, time: Date.now() })

        // Update backend
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/registrations/${hackathonId}/mark/${targetUid}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'x-uid': user?.uid || ''
            },
            body: JSON.stringify({ type: scanMode })
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.message || 'Server rejected check-in protocol')
          }

          toast.success(scanMode === 'attendance' ? 'Attendance marked' : 'Food issued', {
            description: `Entity: ${userExists.participant}`,
            style: { background: '#0f172a', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80' }
          })
        } catch (error) {
          console.error(`Failed to update ${scanMode} on server:`, error)
          // Rollback local state on failure
          setData(prev => prev.map(reg => {
            if (reg.firebaseUid === targetUid || reg.mongoId === userExists.mongoId) {
              return { ...reg, [scanMode!]: false }
            }
            return reg
          }))
          toast.error(`Sync Failure`, {
            description: error instanceof Error ? error.message : 'Database link interrupted',
            style: { background: '#0f172a', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185' }
          })
        }
      } else {
        setLastScanned({ id: userUID, time: Date.now() })
        toast.error('User not present', {
          description: `UID "${userUID}" not found in registry manifest.`,
          style: { background: '#0f172a', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185' }
        })
      }
    }
  }

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const hRes = await fetch(`${import.meta.env.VITE_API_URL}/hackathons/${hackathonId}`, { cache: 'no-store' })
        const hackathon = await hRes.json()
        setHackathonData(hackathon)

        const response = await fetch(`${import.meta.env.VITE_API_URL}/registrations/${hackathonId}`, { cache: 'no-store' })
        const registrations = await response.json()
        const phases = hackathon.phases || []

        const formattedUsers: Registration[] = (registrations as RegistrationResponse[]).map((reg) => {
          const responses = reg.responses || {}
          let name = reg.user?.name || 'Unknown'
          let email = reg.user?.email || 'N/A'
          let track = 'General'
          let team = 'Individual'

          const registrationData = (responses['phase_1_registration'] || {}) as Record<string, unknown>

          Object.values(responses).forEach((data) => {
            if (data && typeof data === 'object') {
              const d = data as Record<string, unknown>
              if (d.name && name === 'Unknown') name = String(d.name)
              if (d.email && email === 'N/A') email = String(d.email)
              if (d.branch) track = String(d.branch)
              if (d.teamName) team = String(d.teamName)
            }
          })

          return {
            mongoId: reg._id,
            participant: name,
            email,
            team,
            track,
            checkIn: new Date(reg.registrationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: reg.status || 'Pending',
            phases: phases.map((p: { id: string }) => responses[p.id] !== undefined),
            responses,
            registrationData,
            attendance: reg.attendance || false,
            food: reg.food || false,
            firebaseUid: reg.user?.uid || reg.userId || reg._id,
          }
        })

        setData(formattedUsers)
      } catch (error) {
        console.error('Failed to fetch registrations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegistrations()
  }, [hackathonId])

  const filteredData = data.filter(item => {
    const matchesSearch =
      item.participant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.firebaseUid?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      item.team.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAttendance = attendanceFilter === 'All' || 
      (attendanceFilter === 'Present' ? item.attendance === true : item.attendance === false)
      
    const matchesFood = foodFilter === 'All' || 
      (foodFilter === 'Given' ? item.food === true : item.food === false)

    return matchesSearch && matchesAttendance && matchesFood
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, direction } = sortConfig
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal === bVal) return 0
    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1
    
    // Type-safe comparison
    const result = (aVal as string | boolean) > (bVal as string | boolean) ? 1 : -1
    return direction === 'asc' ? result : -result
  })

  return (
    <section className="space-y-5 pb-16">
      <Toaster position="top-right" theme="dark" />
      {/* Header */}
      <header className="glass-card p-5 sm:p-8 border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 font-orbitron mb-2">
            Identity Management
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-orbitron">
            Registry <span className="text-cyan-400 text-glow">Manifest</span>
          </h1>
          {hackathonData && (
            <p className="mt-1 text-[10px] text-slate-500 font-mono tracking-widest">
              NODE: {hackathonData.title.toUpperCase()}
            </p>
          )}
          <p className="mt-3 text-xs sm:text-sm text-slate-400 font-medium tracking-wide max-w-2xl">
            Manage and review participant enrollment across the arena. Use the scanner for rapid identification.
          </p>
        </div>

        <button 
          onClick={() => setShowModeSelection(true)}
          className="group relative flex items-center gap-3 px-6 py-3 bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400 group-hover:scale-110 transition-transform">
              <path d="M3 7V5a2 2 0 0 1 2-2h2m14 4V5a2 2 0 0 0-2-2h-2m-14 14v2a2 2 0 0 0 2 2h2m14-4v2a2 2 0 0 1-2 2h-2M7 12h10M12 7v10"/>
            </svg>
            <span className="font-orbitron text-[10px] font-black tracking-[0.2em] text-white group-hover:text-cyan-400 transition-colors uppercase">Execute Scan</span>
          </div>
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#00ffff]" />
        </button>
      </header>

      {/* Mode Selection Modal */}
      {showModeSelection && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="glass-card border-cyan-500/30 p-8 max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400" />
            
            <h3 className="font-orbitron text-white text-sm tracking-[0.3em] uppercase mb-6">Select Scan Protocol</h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => { setScanMode('attendance'); setShowModeSelection(false); setShowScanner(true); }}
                className="w-full py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-orbitron text-[10px] tracking-widest hover:bg-cyan-500/20 transition-all uppercase"
              >
                Attendance Check
              </button>
              <button 
                onClick={() => { setScanMode('food'); setShowModeSelection(false); setShowScanner(true); }}
                className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-orbitron text-[10px] tracking-widest hover:bg-emerald-500/20 transition-all uppercase"
              >
                Food Distribution
              </button>
              <button 
                onClick={() => setShowModeSelection(false)}
                className="w-full py-2 text-slate-500 font-orbitron text-[8px] tracking-widest hover:text-white transition-all uppercase mt-4"
              >
                Cancel Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => { setShowScanner(false); setScanMode(null); }} 
        />
      )}

      {/* Table Card */}
      <article className="glass-card border-cyan-500/10 overflow-hidden">
        {/* Table Header */}
        <div className="p-4 sm:p-6 border-b border-cyan-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-cyan-400 shadow-[0_0_10px_#00ffff]" />
            <h2 className="text-base sm:text-xl font-black text-white tracking-wider font-orbitron">Entity Registry</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Attendance Filter */}
            <select
              value={attendanceFilter}
              onChange={e => setAttendanceFilter(e.target.value)}
              className="bg-slate-900 border border-cyan-500/20 px-3 py-2 text-[10px] font-orbitron tracking-widest text-emerald-400 focus:border-cyan-400 outline-none"
            >
              <option value="All">ALL ATTENDANCE</option>
              <option value="Present">PRESENT</option>
              <option value="Absent">ABSENT</option>
            </select>
            {/* Food Filter */}
            <select
              value={foodFilter}
              onChange={e => setFoodFilter(e.target.value)}
              className="bg-slate-900 border border-cyan-500/20 px-3 py-2 text-[10px] font-orbitron tracking-widest text-amber-400 focus:border-cyan-400 outline-none"
            >
              <option value="All">ALL FOOD</option>
              <option value="Given">GIVEN</option>
              <option value="Not Given">NOT GIVEN</option>
            </select>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="SEARCH..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-cyan-500/20 pl-8 pr-4 py-2 text-[10px] font-orbitron tracking-widest text-cyan-400 focus:border-cyan-400 outline-none w-full sm:w-52"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block soft-scrollbar overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-cyan-500/10 text-left">
                <th 
                  onClick={() => setSortConfig({ key: 'firebaseUid', direction: sortConfig?.key === 'firebaseUid' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  UID {sortConfig?.key === 'firebaseUid' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th 
                  onClick={() => setSortConfig({ key: 'participant', direction: sortConfig?.key === 'participant' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  Entity Name {sortConfig?.key === 'participant' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron">Squadron</th>
                <th className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron">Track</th>
                <th 
                  onClick={() => setSortConfig({ key: 'attendance', direction: sortConfig?.key === 'attendance' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron text-center cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  Attendance {sortConfig?.key === 'attendance' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th 
                  onClick={() => setSortConfig({ key: 'food', direction: sortConfig?.key === 'food' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron text-center cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  Food {sortConfig?.key === 'food' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 px-4 pt-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-orbitron text-center">Phases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10">
                    <Loader text="Fetching encrypted data..." />
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-600 font-orbitron text-xs uppercase tracking-widest">
                    No matching records found
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  return (
                    <tr 
                      key={row.firebaseUid}
                      onClick={() => navigate({ to: '/h/$hackathonId/registrations/$registrationId', params: { hackathonId, registrationId: row.firebaseUid || row.mongoId } })}
                      className="group hover:bg-cyan-500/[0.04] transition-all cursor-pointer"
                    >
                      <td className="py-4 px-4 text-[10px] font-bold text-cyan-400 font-orbitron tracking-widest truncate max-w-[150px]">{row.firebaseUid || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <p className="text-xs font-black text-white uppercase tracking-widest font-orbitron group-hover:text-cyan-400 transition-colors">{row.participant}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{row.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-xs font-bold text-slate-400 tracking-wide uppercase font-orbitron">{row.team}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{row.track}</p>
                      </td>
                      <td className="py-4 px-4">
                        {row.attendance ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border border-emerald-400/20 text-emerald-400 bg-emerald-400/5">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                            MARKED
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase font-orbitron">ABSENT</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {row.food ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border border-cyan-400/20 text-cyan-400 bg-cyan-400/5">
                            <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_#00ffff]" />
                            ISSUED
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase font-orbitron">PENDING</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {row.phases.map((done, idx) => (
                            <div 
                              key={idx} 
                              className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-cyan-400 shadow-[0_0_5px_#00ffff]' : 'bg-slate-800'}`}
                              title={`Phase ${idx + 1}: ${done ? 'Completed' : 'Pending'}`}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden divide-y divide-white/5">
          {loading ? (
            <div className="py-10">
              <Loader text="Fetching data..." />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-orbitron text-xs uppercase tracking-widest">
              No matching records
            </div>
          ) : (
            filteredData.map((row) => {
              return (
                <div
                  key={row.mongoId}
                  onClick={() => navigate({ to: '/h/$hackathonId/registrations/$registrationId', params: { hackathonId, registrationId: row.mongoId } })}
                  className="p-4 hover:bg-cyan-500/[0.04] active:bg-cyan-500/[0.08] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white uppercase tracking-wide font-orbitron truncate">{row.participant}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{row.email}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[9px] text-cyan-400/60 font-orbitron font-bold truncate max-w-[80px]">{row.firebaseUid || 'N/A'}</span>
                        <span className="text-[9px] text-slate-600 font-mono truncate">{row.team}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                      {row.attendance ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold tracking-widest uppercase border border-emerald-400/20 text-emerald-400 bg-emerald-400/5">
                          <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                          ATT
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-600 tracking-widest uppercase font-orbitron">NO ATT</span>
                      )}
                      {row.food ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold tracking-widest uppercase border border-cyan-400/20 text-cyan-400 bg-cyan-400/5">
                          <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_#00ffff]" />
                          FOOD
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-600 tracking-widest uppercase font-orbitron">NO FOOD</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-4 sm:px-6 py-3 border-t border-white/5 bg-slate-900/30">
            <p className="text-[9px] text-slate-600 font-orbitron uppercase tracking-widest">
              Showing {filteredData.length} of {data.length} entities
            </p>
          </div>
        )}
      </article>
    </section>
  )
}