const path = require("path");
const cdk = require("aws-cdk-lib");
const { Stack, CfnOutput, RemovalPolicy, Duration, Annotations } = cdk;
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
const cognito = require("aws-cdk-lib/aws-cognito");
const lambda = require("aws-cdk-lib/aws-lambda");
const nodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const apigwv2 = require("aws-cdk-lib/aws-apigatewayv2");
const {
  HttpLambdaIntegration,
  WebSocketLambdaIntegration,
} = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const {
  HttpUserPoolAuthorizer,
} = require("aws-cdk-lib/aws-apigatewayv2-authorizers");

class CollabDoneStack extends Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const context = this.node;
    const appName = context.tryGetContext("appName") || "collab-done";
    const stageName = context.tryGetContext("stage") || "prod";
    const domainPrefix =
      context.tryGetContext("cognitoDomainPrefix") || `${appName}-auth`;

    const callbackUrls =
      context.tryGetContext("callbackUrls") ||
      ["http://localhost:3000", "https://localhost:3000"];
    const logoutUrls =
      context.tryGetContext("logoutUrls") ||
      ["http://localhost:3000", "https://localhost:3000"];
    const corsOrigins =
      context.tryGetContext("corsOrigins") || ["http://localhost:3000"];
    const configuredBucketName = context.tryGetContext("mediaBucketName");

    const googleClientId =
      process.env.GOOGLE_CLIENT_ID || context.tryGetContext("googleClientId");
    const googleClientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      context.tryGetContext("googleClientSecret");

    const table = new dynamodb.Table(this, "CollabDoneTable", {
      tableName: `${appName}-single-table`,
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "gsi2pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      ...(configuredBucketName ? { bucketName: configuredBucketName } : {}),
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: corsOrigins,
          allowedHeaders: ["*"],
          maxAge: 300,
        },
      ],
    });

    mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowPublicReadMedia",
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [mediaBucket.arnForObjects("*")],
      })
    );

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${appName}-users`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const supportedIdentityProviders = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];

    let googleProvider;
    if (googleClientId && googleClientSecret) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(
        this,
        "GoogleIdentityProvider",
        {
          userPool,
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          scopes: ["openid", "email", "profile"],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
            familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          },
        }
      );
      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.GOOGLE
      );
    } else {
      Annotations.of(this).addWarning(
        "Google OAuth is not configured. Provide googleClientId/googleClientSecret via CDK context or env vars."
      );
    }

    Annotations.of(this).addWarning(
      "GitHub is not a native Cognito social provider. To enable GitHub, add a custom OIDC/SAML broker and include it as a User Pool IdP."
    );

    const userPoolClient = userPool.addClient("WebClient", {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders,
    });

    if (googleProvider) {
      userPoolClient.node.addDependency(googleProvider);
    }

    const userPoolDomain = userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix,
      },
    });

    const wsConnectFn = new nodejs.NodejsFunction(this, "WsConnectFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambda/ws-connect.js"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const wsDisconnectFn = new nodejs.NodejsFunction(this, "WsDisconnectFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambda/ws-disconnect.js"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const wsDefaultFn = new nodejs.NodejsFunction(this, "WsDefaultFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambda/ws-default.js"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(wsConnectFn);
    table.grantReadWriteData(wsDisconnectFn);
    table.grantReadWriteData(wsDefaultFn);

    const wsApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      apiName: `${appName}-ws-api`,
      routeSelectionExpression: "$request.body.action",
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "WsConnectIntegration",
          wsConnectFn
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "WsDisconnectIntegration",
          wsDisconnectFn
        ),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "WsDefaultIntegration",
          wsDefaultFn
        ),
      },
    });

    const wsStage = new apigwv2.WebSocketStage(this, "WebSocketStage", {
      webSocketApi: wsApi,
      stageName,
      autoDeploy: true,
    });

    const httpHandler = new nodejs.NodejsFunction(this, "HttpHandlerFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambda/http-handler.js"),
      handler: "handler",
      timeout: Duration.seconds(20),
      memorySize: 512,
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: mediaBucket.bucketName,
        WS_API_ENDPOINT: wsStage.url,
        CORS_ORIGINS: corsOrigins.join(","),
      },
    });

    table.grantReadWriteData(httpHandler);
    mediaBucket.grantReadWrite(httpHandler);
    wsApi.grantManageConnections(httpHandler);

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: `${appName}-http-api`,
      corsPreflight: {
        allowOrigins: corsOrigins,
        allowHeaders: ["*"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowCredentials: false,
        maxAge: Duration.days(10),
      },
    });

    const authorizer = new HttpUserPoolAuthorizer(
      "CognitoHttpAuthorizer",
      userPool,
      {
        userPoolClients: [userPoolClient],
      }
    );

    const httpIntegration = new HttpLambdaIntegration(
      "HttpLambdaIntegration",
      httpHandler
    );

    // Public read routes for signed-out users.
    httpApi.addRoutes({
      path: "/songs",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/comments",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/profiles",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/profiles/{id}",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/songs/{songId}/comments",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/songs/{songId}/collaborators",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.GET],
      integration: httpIntegration,
    });

    // Explicitly expose OPTIONS unauthenticated for preflight stability.
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.OPTIONS],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.OPTIONS],
      integration: httpIntegration,
    });

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: httpIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.ANY],
      integration: httpIntegration,
      authorizer,
    });

    new CfnOutput(this, "HttpApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Base URL for REST API",
    });

    new CfnOutput(this, "WebSocketUrl", {
      value: wsStage.url,
      description: "WebSocket URL for realtime messaging",
    });

    new CfnOutput(this, "SingleTableName", {
      value: table.tableName,
      description: "DynamoDB single table name",
    });

    new CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
      description: "S3 bucket for songs and avatars",
    });

    new CfnOutput(this, "CognitoUserPoolId", {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, "CognitoClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "CognitoDomain", {
      value: userPoolDomain.baseUrl(),
      description: "Hosted UI domain",
    });
  }
}

module.exports = { CollabDoneStack };
