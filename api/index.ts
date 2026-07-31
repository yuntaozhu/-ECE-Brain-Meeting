import serverModule from '../dist/server.cjs';

const app = (serverModule as any).default || serverModule;

export default app;
