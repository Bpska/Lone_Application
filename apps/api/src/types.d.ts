import type { Role } from '@saathi/shared';
declare global { namespace Express { interface Request { user?: { id:string; role:Role; email:string } } } }
export {};
