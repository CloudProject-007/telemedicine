# Telemedicine & Virtual Care Platform

Cloud computing college project: remote consultations, real-time chat and video, prescriptions and
medical-document storage, deployed on AWS.

```
telemedicine-platform/
├── backend/            TypeScript API (done) - see backend/README.md
├── frontend/           React + TypeScript (next)
├── docker-compose.yml  local Postgres + MinIO (+ Redis profile)
└── .github/workflows/  CI
```

Start with `backend/README.md`.

## AWS features and deployment

- Notifications through Amazon SNS (email and SMS), reminders through EventBridge Scheduler and SQS,
  prescription PDFs stored in S3, and CloudFront in front of the web app, the API and file downloads.
- Run once after pulling these changes (new dependencies and tables):

  ```bash
  cd backend
  npm install
  npx prisma migrate dev --name add_notifications_and_prescription_pdf
  npm run typecheck && npm run lint && npm test
  cd ../frontend && npm install && npm run typecheck && npm run lint && npm test
  ```

- Guides: [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md), [`docs/BACKEND_FLOW.md`](docs/BACKEND_FLOW.md),
  [`docs/FRONTEND_FLOW.md`](docs/FRONTEND_FLOW.md). IAM and CORS JSON is in [`infra/`](infra/).
- Locally nothing needs AWS: leave the SNS, SQS, Scheduler and CloudFront settings empty and messages
  are written to the log.
