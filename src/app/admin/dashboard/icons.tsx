'use client';

// admin/dashboard/page.tsx is an async Server Component (it awaits
// createClient()/listUsers()/etc., so it can't be 'use client' itself), but
// Phosphor's icon components create a React Context at module load time,
// which isn't available in the RSC server bundle and breaks the build
// ("createContext is not a function") if imported directly into a Server
// Component. Re-exporting them from this 'use client' file puts the import
// on a client-bundle boundary — page.tsx can still import from here, since
// a Server Component is allowed to render Client Components, just not
// evaluate client-only modules in its own module graph.
export { Buildings, Receipt, ArrowsClockwise, Clock, UsersThree } from '@phosphor-icons/react';
