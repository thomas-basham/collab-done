# Collab-done

## Author

Thomas Basham

**Deployed Site:** [https://main.d16s25vn4ji4zn.amplifyapp.com](https://main.d16s25vn4ji4zn.amplifyapp.com)

A social collaboration app for musicians, hosted with AWS.

## AWS Architecture

- Frontend: Next.js (deployable to AWS Amplify Hosting)
- Auth: Amazon Cognito User Pool (email/password + Google Hosted UI)
- API: API Gateway HTTP API + Lambda (`infra/lambda/http-handler.js`)
- Realtime: API Gateway WebSocket API + Lambda (`infra/lambda/ws-*.js`)
- Database: DynamoDB single-table design
- Media: S3 public bucket with presigned upload URLs
- Infrastructure: AWS CDK (`infra/`)

## Repository Layout

- `infra/bin/collab-done.js`: CDK app entry
- `infra/lib/collab-done-stack.js`: AWS stack resources
- `infra/lambda/`: backend Lambda handlers
- `contexts/auth.tsx`: Cognito auth provider
- `contexts/RealTime.tsx`: chat + websocket client integration
- `hooks/useResource.tsx`: API/S3-backed resource data layer
- `schema`: DynamoDB single-table schema reference

## Prerequisites

- Node.js 20+
- AWS CLI configured
- CDK bootstrap completed in target account/region

## Install

```bash
npm install
```

## Local Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-http-api-id.execute-api.us-west-2.amazonaws.com
NEXT_PUBLIC_WS_URL=wss://your-ws-api-id.execute-api.us-west-2.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-west-2_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=your-domain.auth.us-west-2.amazoncognito.com
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN=http://localhost:3000
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT=http://localhost:3000
NEXT_PUBLIC_MEDIA_BASE_URL=https://your-media-bucket.s3.us-west-2.amazonaws.com
NEXT_PUBLIC_TEST_EMAIL=test@example.com
```

## CDK Deploy

Use your IAM profile and region:

```bash
npm run cdk:bootstrap -- --profile iamadmin --context region=us-west-2
npm run cdk:deploy -- --profile iamadmin --context region=us-west-2
```

After deployment, copy stack outputs into `.env.local`.

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Screenshots

![Collab Done screenshot 1](./public/snapShots/collabDone00.png)
![Collab Done screenshot 2](./public/snapShots/collabDone01.png)
![Collab Done screenshot 3](./public/snapShots/collabDone02.png)
![Collab Done screenshot 4](./public/snapShots/collabDone05.png)
![Collab Done screenshot 5](./public/snapShots/collabDone03.png)
![Collab Done screenshot 6](./public/snapShots/collabDone04.png)

## Notes

- Google social login is supported when `googleClientId` and `googleClientSecret` are provided to CDK.
- GitHub is not a native Cognito social provider in this stack. It requires a custom OIDC/SAML broker setup and additional Cognito IdP wiring.
