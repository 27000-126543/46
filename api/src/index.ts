import express, { Express, Request, Response, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer, Server as HttpServer } from 'http';
import { config, isDevelopment } from './config';
import { initIO } from './lib/socket';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import playersRouter from './routes/players';
import relicsRouter from './routes/relics';
import explorationsRouter from './routes/explorations';
import museumRouter from './routes/museum';
import marketRouter from './routes/market';
import teamsRouter from './routes/teams';
import secretRealmRouter from './routes/secretRealm';
import rankingsRouter from './routes/rankings';
import exhibitionsRouter from './routes/exhibitions';
import ruinsRouter from './routes/ruins';

function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
    })
  );

  app.use(helmet());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    morgan(isDevelopment ? 'dev' : 'combined', {
      skip: (_req: Request, res: Response) => res.statusCode < 400,
    })
  );

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: '考古竞赛系统 API 运行正常',
      data: {
        timestamp: Date.now(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/relics', relicsRouter);
  app.use('/api/explorations', explorationsRouter);
  app.use('/api/museum', museumRouter);
  app.use('/api/market', marketRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/secret-realm', secretRealmRouter);
  app.use('/api/rankings', rankingsRouter);
  app.use('/api/exhibitions', exhibitionsRouter);
  app.use('/api/ruins', ruinsRouter);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}

function startServer(): void {
  const app = createApp();
  const httpServer: HttpServer = createServer(app);

  initIO(httpServer);

  httpServer.listen(config.PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 服务器已启动`);
    console.log(`📡 环境: ${config.NODE_ENV}`);
    console.log(`🔗 API 地址: http://localhost:${config.PORT}`);
    console.log(`🌐 WebSocket: ws://localhost:${config.PORT}`);
    console.log(`👥 客户端地址: ${config.CLIENT_URL}`);
    console.log('='.repeat(50));
  });

  process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    httpServer.close(() => {
      console.log('HTTP 服务器已关闭');
      process.exit(0);
    });
  });

  process.on('SIGTERM', async () => {
    console.log('\n正在关闭服务器...');
    httpServer.close(() => {
      console.log('HTTP 服务器已关闭');
      process.exit(0);
    });
  });

  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('未处理的 Promise 拒绝:', reason);
    process.exit(1);
  });
}

if (require.main === module) {
  startServer();
}

export { createApp, startServer };
export default createApp;
