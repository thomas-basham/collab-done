#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { CollabDoneStack } = require("../lib/collab-done-stack");

const app = new cdk.App();

const env = {
  account: app.node.tryGetContext("account") || process.env.CDK_DEFAULT_ACCOUNT,
  region:
    app.node.tryGetContext("region") || process.env.CDK_DEFAULT_REGION || "us-west-2",
};

new CollabDoneStack(app, "CollabDoneStack", {
  env,
  stackName: app.node.tryGetContext("stackName") || "collab-done-stack",
});
