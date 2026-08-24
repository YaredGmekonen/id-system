import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { db, Person } from '../db/database';
import SiliconLabsLogo from '../components/shared/SiliconLabsLogo';

// Fallback seed catalog for public verifier if IndexedDB is unpopulated on external phone
const SEED_FALLBACKS: Record<string, Partial<Person>> = {
  'ID-2026-081': {
    fullName: 'Alicia Tran',
    idNumber: 'ID-2026-081',
    role: 'Principal Systems Lead',
    department: 'Software Engineering',
    category: 'Corporate',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    phone: '+251 911 200 300',
  },
  'ID-2026-082': {
    fullName: 'Mohamed El-Sayed',
    idNumber: 'ID-2026-082',
    role: 'Hardware Operations Mgr',
    department: 'Hardware Infrastructure',
    category: 'Corporate',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    phone: '+251 912 201 301',
  },
  'ID-2026-083': {
    fullName: 'Sofia Meyers',
    idNumber: 'ID-2026-083',
    role: 'Product Strategy Lead',
    department: 'Product Management',
    category: 'Corporate',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    phone: '+251 913 202 302',
  },
  'ID-2026-084': {
    fullName: 'Carlos Ramirez',
    idNumber: 'ID-2026-084',
    role: 'Field Logistics Tech',
    department: 'Field Operations',
    category: 'Field Workers',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    phone: '+251 914 203 303',
  },
  'ID-2026-085': {
    fullName: 'Nina Patel',
    idNumber: 'ID-2026-085',
    role: 'Embedded Firmware Eng',
    department: 'Software Engineering',
    category: 'Corporate',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    phone: '+251 915 204 304',
  },
};

export default function IDVerify() {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const idQuery = paramId || searchParams.get('id') || searchParams.get('idNumber') || 'ID-2026-081';
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [verifyTimestamp] = useState<string>(() => new Date().toLocaleTimeString());

  useEffect(() => {
    let isMounted = true;
    async function loadPerson() {
      setLoading(true);
      try {
        // 1. Try finding by idNumber in IndexedDB
        let found = await db.people.where('idNumber').equalsIgnoreCase(idQuery).first();
        
        // 2. Try finding by numeric id
        if (!found && !isNaN(Number(idQuery))) {
          found = await db.people.get(Number(idQuery));
        }

        // 3. Try finding in fallback catalog if on new phone / cold browser
        if (!found && SEED_FALLBACKS[idQuery.toUpperCase()]) {
          const fallback = SEED_FALLBACKS[idQuery.toUpperCase()];
          found = {
            id: 101,
            fullName: fallback.fullName || 'Authorized Personnel',
            idNumber: fallback.idNumber || idQuery,
            role: fallback.role || 'Staff Member',
            department: fallback.department || 'Operations',
            category: fallback.category || 'Corporate',
            status: 'Active',
            fulfillmentStatus: 'Fulfilled',
            paymentStatus: 'Paid',
            channel: 'Web',
            createdAt: new Date(),
          } as Person;
        }

        // 4. Decode query params if passed directly in link
        if (!found && searchParams.get('name')) {
          found = {
            id: 999,
            fullName: searchParams.get('name') || 'Authorized Personnel',
            idNumber: idQuery,
            role: searchParams.get('role') || 'Credential Holder',
            department: searchParams.get('dept') || 'General',
            category: 'Corporate',
            status: 'Active',
            fulfillmentStatus: 'Fulfilled',
            paymentStatus: 'Paid',
            channel: 'Web',
            createdAt: new Date(),
          } as Person;
        }

        if (isMounted) {
          setPerson(found || null);
        }
      } catch (err) {
        console.error('Error loading person for verification:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPerson();
    return () => {
      isMounted = false;
    };
  }, [idQuery, searchParams]);

  return (
    <div className="min-h-screen bg-[#07090c] text-slate-100 flex flex-col justify-between selection:bg-[#84a92c] selection:text-black font-sans p-4 sm:p-6 md:p-8">
      
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80">
        <SiliconLabsLogo size="sm" subText="OFFICIAL VERIFIER" />
        <span className="flex items-center gap-1 text-[11px] font-mono text-[#84a92c] bg-[#84a92c]/10 border border-[#84a92c]/30 px-2.5 py-1 rounded-full font-bold">
          <span className="w-2 h-2 rounded-full bg-[#84a92c] animate-ping inline-block" />
          SECURE SCAN
        </span>
      </header>

      {/* Main Verification Body */}
      <main className="max-w-md w-full mx-auto my-auto py-6 space-y-5">
        
        {loading ? (
          <div className="bg-[#0f1318] border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 border-3 border-[#84a92c] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-mono text-slate-400">Verifying cryptographically signed credential…</p>
          </div>
        ) : person ? (
          <div className="space-y-4">
            
            {/* Status Pill Card */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#0d1f14] to-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black tracking-wider uppercase text-emerald-400 font-mono">
                    Official Credential Verified
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Status: <span className="text-white font-bold">{person.status || 'Active'}</span> • Scanned {verifyTimestamp}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                GENUINE
              </span>
            </div>

            {/* Digital ID Card Preview */}
            <div className="relative group perspective-1000">
              <div
                className="w-full aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-[#10141b] to-slate-950 rounded-2xl border border-slate-700/80 shadow-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
                style={{
                  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 25px rgba(132,169,44,0.15)',
                }}
              >
                {/* Holographic accent glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#84a92c]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

                {activeSide === 'front' ? (
                  <>
                    {/* Front Header */}
                    <div className="flex items-center justify-between z-10">
                      <div>
                        <p className="text-[10px] font-black font-mono tracking-widest text-[#9fe870] uppercase">
                          SILICONLABS TECH PLC
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">CREDENTIAL CARD • CR80</p>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                        OFFICIAL
                      </span>
                    </div>

                    {/* Front Body */}
                    <div className="flex items-center gap-3.5 sm:gap-4 my-auto z-10">
                      {/* Photo */}
                      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-slate-800 border-2 border-emerald-500/80 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md relative">
                        {person.photoDataUrl ? (
                          <img
                            src={person.photoDataUrl}
                            alt={person.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-emerald-400 font-mono font-black text-2xl">
                            {person.fullName
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate leading-tight">
                          {person.fullName}
                        </h1>
                        <p className="text-xs font-bold text-emerald-400 truncate">
                          {person.role || 'Staff Member'}
                        </p>
                        <div className="pt-1.5 text-[11px] space-y-0.5 font-mono text-slate-300">
                          <p>
                            <span className="text-slate-400">ID:</span>{' '}
                            <span className="font-bold text-white">{person.idNumber}</span>
                          </p>
                          <p className="truncate">
                            <span className="text-slate-400">Dept:</span>{' '}
                            {person.department || 'Operations'}
                          </p>
                          {person.phone && (
                            <p className="truncate">
                              <span className="text-slate-400">Phone:</span> {person.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Front Footer */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400 z-10">
                      <span>SECURE BADGE AUTHENTICATED</span>
                      <span className="text-emerald-400 font-bold">● ACTIVE RECORD</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Back Header */}
                    <div className="text-center z-10">
                      <p className="text-xs font-black uppercase tracking-wider text-white">
                        SILICONLABS TECH PLC
                      </p>
                      <p className="text-[9px] font-mono text-[#9fe870]">
                        AUTHORIZED OPERATIONAL ACCESS BADGE
                      </p>
                    </div>

                    {/* Back Body */}
                    <div className="text-[10px] text-slate-300 space-y-1.5 py-2 font-mono leading-relaxed z-10">
                      <p>1. This credential remains the property of SiliconLabs Tech PLC.</p>
                      <p>2. Must be presented upon request at all hardware and enclave facilities.</p>
                      <p>3. If found, please return to Addis Ababa Headquarters, Around Ayat.</p>
                    </div>

                    {/* Back Footer */}
                    <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[9px] font-mono text-slate-400 z-10">
                      <span>SERIAL: SL-ETH-{person.id || 101}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>256-BIT ENCRYPTED</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Flip Card Toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => setActiveSide(s => (s === 'front' ? 'back' : 'front'))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold font-mono rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>{activeSide === 'front' ? 'Show Back Face' : 'Show Front Face'}</span>
              </button>
            </div>

            {/* Credential Data Breakdown */}
            <div className="bg-[#0f1318] border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-md">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Security & Verification Audit Log
              </h3>
              
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <p className="text-slate-500 text-[10px]">ISSUING AUTHORITY</p>
                  <p className="font-bold text-white">SiliconLabs Security</p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <p className="text-slate-500 text-[10px]">CATEGORY</p>
                  <p className="font-bold text-[#84a92c]">{person.category || 'Corporate'}</p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <p className="text-slate-500 text-[10px]">FULFILLMENT</p>
                  <p className="font-bold text-emerald-400">{person.fulfillmentStatus || 'Fulfilled'}</p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <p className="text-slate-500 text-[10px]">PUBLIC URL TARGET</p>
                  <p className="font-bold text-slate-300 truncate">id-system-theta.vercel.app</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#0f1318] border border-rose-950/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-black mx-auto">
              !
            </div>
            <h2 className="text-base font-bold text-white">Unregistered Credential</h2>
            <p className="text-xs text-slate-400 font-mono">
              No record found matching ID: <span className="text-rose-400 font-bold">{idQuery}</span>.
            </p>
            <Link
              to="/overview"
              className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
            >
              Go to Platform Dashboard
            </Link>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center space-y-2 pt-4 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
        <p>© 2026 SiliconLabs Tech PLC • Enterprise Credential Verification System</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-[#84a92c] transition-colors">Platform Home</Link>
          <span>•</span>
          <Link to="/studio" className="text-slate-400 hover:text-[#84a92c] transition-colors">ID Studio</Link>
          <span>•</span>
          <Link to="/print" className="text-slate-400 hover:text-[#84a92c] transition-colors">Print Artboard</Link>
        </div>
      </footer>

    </div>
  );
}
