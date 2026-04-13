export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL,
  },
  llm: {
    apiKey: process.env.ZHIPU_API_KEY ?? '',
    model: process.env.ZHIPU_MODEL ?? 'glm-4-flash',
    baseUrl: process.env.ZHIPU_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4/',
  },
  auth: {
    password: process.env.AUTH_PASSWORD ?? 'tasks2024',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  },
})
